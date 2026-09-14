import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import * as path from 'path';

import { DetalleServicio } from '../../detalles/entities/detalle-servicio.entity';
import { Planilla } from '../entities/planilla.entity';
import { ResultadoPlanilla } from '../entities/resultado-planilla.entity';
import { GenerarConsolidadasDto } from '../dto/generar-consolidadas.dto';
import { ExportadorExcelService } from './exportador-excel.service';
import { ExportadorLibreOfficeService } from './exportador-libreoffice.service';
import { GestionPlantillasService } from './gestion-plantillas.service';
import { TipoResultado, FormatoArchivo, TipoPlantilla } from '../../../common/enums';
import { limpiarNombreArchivo } from '../utils/limpiar-nombre-archivo';

const NOMBRE_HOJA = 'FORMATO PLANILLA CONSOLIDADA';

const CELDA_FECHA_REPORTE = 'E7';
const CELDA_REFERENCIA_ROTA_A_LIMPIAR = 'G1';
const CELDA_SERVICIO = 'C8';
const CELDA_MONTO_SOLICITADO = 'C9';
const CELDA_MES_ANO_PRESTACION = 'C10';
const CELDA_NO_EXPEDIENTES = 'C11';

const FILA_INICIO_DATOS = 16;
const FILA_FIN_DATOS = 45;
const COL_NUMERO = 'A';
const COL_CODIGO_VALIDACION = 'B';
const COL_IDENTIFICACION = 'C';
const COL_BENEFICIARIO = 'D';
const COL_VALOR_SOLICITADO = 'E';

const CELDA_TOTAL = 'E46';

const REVISOR = { nombre: 'C56', identificacion: 'C57', cargo: 'C58' };
const APROBADOR = { nombre: 'C65', identificacion: 'C66', cargo: 'C67' };

interface ContextoRequest {
  usuarioId: number;
}

interface BeneficiarioAcumulado {
  codigoValidacion: string | null;
  identificacion: string;
  nombrePaciente: string;
  montoTotal: number;
}

interface GrupoConsolidado {
  servicio: string;
  beneficiarios: BeneficiarioAcumulado[];
}

interface ResultadoGeneracion {
  generados: ResultadoPlanilla[];
  errores: { servicio: string; error: string }[];
  advertencias: { servicio: string; mensaje: string }[];
}

@Injectable()
export class GeneradorConsolidadasService {
  private readonly logger = new Logger(GeneradorConsolidadasService.name);
  private readonly capacidad = FILA_FIN_DATOS - FILA_INICIO_DATOS + 1;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(ResultadoPlanilla)
    private readonly resultadosRepository: Repository<ResultadoPlanilla>,
    @InjectRepository(Planilla)
    private readonly planillasRepository: Repository<Planilla>,
    private readonly excelService: ExportadorExcelService,
    private readonly libreOfficeService: ExportadorLibreOfficeService,
    private readonly plantillasService: GestionPlantillasService,
  ) {}

  async generar(
    planillaId: number,
    dto: GenerarConsolidadasDto,
    _ctx: ContextoRequest,
  ): Promise<ResultadoGeneracion> {
    const planilla = await this.planillasRepository.findOneOrFail({ where: { id: planillaId } });
    if (!planilla.revisadoNombre || !planilla.aprobadoNombre) {
      throw new BadRequestException(
        'Esta planilla no tiene las firmas completas (revisor y/o aprobador). ' +
          'Complétalas en "Editar" antes de generar los documentos finales.',
      );
    }
    const grupos = await this.agruparPorServicioYBeneficiario(planillaId, dto);
    const rutaPlantilla = await this.plantillasService.obtenerRutaActiva(TipoPlantilla.CONSOLIDADA);

    const generados: ResultadoPlanilla[] = [];
    const errores: { servicio: string; error: string }[] = [];
    const advertencias: { servicio: string; mensaje: string }[] = [];

    for (const grupo of grupos) {
      try {
        if (grupo.beneficiarios.length > this.capacidad) {
          const omitidos = grupo.beneficiarios.length - this.capacidad;
          advertencias.push({
            servicio: grupo.servicio,
            mensaje: `El servicio tiene ${grupo.beneficiarios.length} beneficiarios pero la plantilla solo soporta ${this.capacidad} (un solo bloque, filas 16-45). Se omitieron los últimos ${omitidos}.`,
          });
        }
        const registros = await this.generarUnGrupo(planillaId, planilla, grupo, rutaPlantilla);
        generados.push(...registros);
      } catch (error) {
        this.logger.error(`Error generando consolidada servicio=${grupo.servicio}: ${(error as Error).message}`);
        errores.push({ servicio: grupo.servicio, error: (error as Error).message });
      }
    }

    return { generados, errores, advertencias };
  }

  private limpiarZonasBasura(hoja: ExcelJS.Worksheet): void {
    const COLUMNAS = ['A', 'B', 'C', 'D', 'E'];
    const filasBasura = [48, 49, 50, 51, 52, 53, 54, 55, 59, 60, 61, 62, 63, 64];
    const filasBloqueDatos = Array.from(
      { length: FILA_FIN_DATOS - FILA_INICIO_DATOS + 1 },
      (_, i) => FILA_INICIO_DATOS + i,
    );

    for (const fila of [...filasBasura, ...filasBloqueDatos]) {
      for (const col of COLUMNAS) {
        hoja.getCell(`${col}${fila}`).value = null;
      }
    }
  }

  /**
   * FIX: antes sumaba detalle.valorSolicitado directo -- ese campo YA
   * refleja la correccion automatica cuando existe (corregirAutomaticamente()
   * en predicciones.service.ts actualiza subtotal/valorSolicitado/
   * valorUnitarioSolicitado en la MISMA fila de detalles_servicios).
   * El bug real no estaba en usar el campo equivocado, sino en que
   * corregirAutomaticamente() no actualizaba valorUnitarioSolicitado
   * (ya corregido en predicciones.service.ts). Aqui NO hace falta
   * cambiar la query -- valorSolicitado siempre fue el campo correcto
   * a sumar, y ya viene corregido desde el origen. Se deja el comentario
   * para dejar constancia de que se revisó explícitamente.
   */
  private async agruparPorServicioYBeneficiario(
    planillaId: number,
    dto: GenerarConsolidadasDto,
  ): Promise<GrupoConsolidado[]> {
    const qb = this.dataSource
      .getRepository(DetalleServicio)
      .createQueryBuilder('detalle')
      .leftJoinAndSelect('detalle.expediente', 'expediente')
      .leftJoinAndSelect('expediente.tramite', 'tramite')
      .where('tramite.planilla = :planillaId', { planillaId });

    if (dto.servicios?.length) {
      qb.andWhere('tramite.tipoServicio IN (:...servicios)', { servicios: dto.servicios });
    }

    const detalles = await qb.getMany();

    const porServicio = new Map<string, Map<string, BeneficiarioAcumulado>>();

    for (const detalle of detalles) {
      const servicio = detalle.expediente.tramite.tipoServicio;
      const identificacion = detalle.expediente.identificacion;

      if (!porServicio.has(servicio)) {
        porServicio.set(servicio, new Map());
      }
      const porBeneficiario = porServicio.get(servicio)!;

      if (!porBeneficiario.has(identificacion)) {
        porBeneficiario.set(identificacion, {
          codigoValidacion: detalle.expediente.codigoValidacion,
          identificacion,
          nombrePaciente: detalle.expediente.nombrePaciente,
          montoTotal: 0,
        });
      }
      // valorSolicitado ya viene corregido si hubo correccion automatica
      // (ver comentario del metodo) -- NO usar valorUnitarioSolicitado *
      // cantidad aqui, porque eso ignoraria el porcentajeModificador.
      porBeneficiario.get(identificacion)!.montoTotal += Number(detalle.valorSolicitado);
    }

    return Array.from(porServicio.entries()).map(([servicio, mapaBeneficiarios]) => ({
      servicio,
      beneficiarios: Array.from(mapaBeneficiarios.values()),
    }));
  }

  private async generarUnGrupo(
    planillaId: number,
    planilla: Planilla,
    grupo: GrupoConsolidado,
    rutaPlantilla: string,
  ): Promise<ResultadoPlanilla[]> {
    const beneficiariosAIncluir = grupo.beneficiarios.slice(0, this.capacidad);
    const servicioLimpio = limpiarNombreArchivo(grupo.servicio);
    const carpetaDestino = path.join(process.cwd(), 'uploads', 'consolidadas', servicioLimpio);
    const nombreBase = `Planilla_${servicioLimpio}_CONSOLIDADA`;

    const workbook = await this.excelService.cargarPlantilla(rutaPlantilla);
    const hoja = workbook.getWorksheet(NOMBRE_HOJA) ?? workbook.worksheets[0];
    this.limpiarZonasBasura(hoja);

    hoja.getCell(CELDA_FECHA_REPORTE).value = new Date();
    hoja.getCell(CELDA_REFERENCIA_ROTA_A_LIMPIAR).value = null;
    hoja.getCell(CELDA_SERVICIO).value = grupo.servicio;
    hoja.getCell(CELDA_MES_ANO_PRESTACION).value = this.formatearPeriodo(planilla.periodo);
    hoja.getCell(CELDA_NO_EXPEDIENTES).value = beneficiariosAIncluir.length;

    let filaActual = FILA_INICIO_DATOS;
    let totalGeneral = 0;
    let numero = 1;

    for (const beneficiario of beneficiariosAIncluir) {
      this.excelService.escribirFila(hoja, filaActual, [
        { columna: COL_NUMERO, valor: numero, numFmt: '0' },
        { columna: COL_CODIGO_VALIDACION, valor: beneficiario.codigoValidacion ?? '' },
        { columna: COL_IDENTIFICACION, valor: beneficiario.identificacion },
        { columna: COL_BENEFICIARIO, valor: beneficiario.nombrePaciente },
        { columna: COL_VALOR_SOLICITADO, valor: beneficiario.montoTotal, numFmt: '0.00' },
      ]);

      totalGeneral += beneficiario.montoTotal;
      filaActual += 1;
      numero += 1;
    }

    hoja.getCell(CELDA_MONTO_SOLICITADO).value = totalGeneral;
    hoja.getCell(CELDA_TOTAL).value = totalGeneral;

    hoja.getCell(REVISOR.nombre).value = planilla.revisadoNombre ? `REVISADO: ${planilla.revisadoNombre}` : '';
    hoja.getCell(REVISOR.identificacion).value = planilla.revisadoIdentificacion ?? '';
    hoja.getCell(REVISOR.cargo).value = planilla.revisadoCargo;
    hoja.getCell(APROBADOR.nombre).value = planilla.aprobadoNombre ? `APROBADO: ${planilla.aprobadoNombre}` : '';
    hoja.getCell(APROBADOR.identificacion).value = planilla.aprobadoIdentificacion ?? '';
    hoja.getCell(APROBADOR.cargo).value = planilla.aprobadoCargo;

    // Resetea seleccion grabada (misma correccion que en individuales).
    hoja.views = [{ state: 'normal', xSplit: 0, ySplit: 0, topLeftCell: 'A1', activeCell: 'A1' }];

    const nombreXlsx = `${nombreBase}.xlsx`;
    const rutaXlsxAbsoluta = await this.excelService.guardar(workbook, nombreXlsx, carpetaDestino);
    const rutaXlsxRelativa = path.relative(process.cwd(), rutaXlsxAbsoluta);

    const rutaPdfAbsoluta = await this.libreOfficeService.convertirXlsxAPdf(rutaXlsxAbsoluta, carpetaDestino);
    const nombrePdf = path.basename(rutaPdfAbsoluta);
    const rutaPdfRelativa = path.relative(process.cwd(), rutaPdfAbsoluta);

    const registroXlsx = this.resultadosRepository.create({
      planilla: { id: planillaId } as any,
      tipo: TipoResultado.CONSOLIDADA,
      servicio: grupo.servicio,
      tramite: null,
      rutaArchivo: rutaXlsxRelativa,
      formato: FormatoArchivo.XLSX,
      nombreArchivo: nombreXlsx,
    });
    const registroPdf = this.resultadosRepository.create({
      planilla: { id: planillaId } as any,
      tipo: TipoResultado.CONSOLIDADA,
      servicio: grupo.servicio,
      tramite: null,
      rutaArchivo: rutaPdfRelativa,
      formato: FormatoArchivo.PDF,
      nombreArchivo: nombrePdf,
    });

    return this.resultadosRepository.save([registroXlsx, registroPdf]);
  }

  private formatearPeriodo(periodo: string): string {
    const MESES = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
    ];
    const [mes, anio] = periodo.split('-');
    const indice = parseInt(mes, 10) - 1;
    if (indice < 0 || indice > 11 || !anio) return periodo;
    return `${MESES[indice]} ${anio}`;
  }
}
