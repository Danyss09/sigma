import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import * as path from 'path';

import { DetalleServicio } from '../../detalles/entities/detalle-servicio.entity';
import { Planilla } from '../entities/planilla.entity';
import { ResultadoPlanilla } from '../entities/resultado-planilla.entity';
import { GenerarIndividualesDto } from '../dto/generar-individuales.dto';
import { ExportadorExcelService } from './exportador-excel.service';
import { ExportadorLibreOfficeService } from './exportador-libreoffice.service';
import { GestionPlantillasService } from './gestion-plantillas.service';
import { TipoResultado, FormatoArchivo, TipoPlantilla } from '../../../common/enums';
import { limpiarNombreArchivo } from '../utils/limpiar-nombre-archivo';
import { montoALetras } from '../utils/monto-a-letras';

const NOMBRE_HOJA = 'FORMATO PLANILLA INDIVIDUAL';

const CELDA_TRAMITE = 'B5';
const CELDA_SERVICIO = 'B6';
const CELDA_MES_ANO = 'G6';
const CELDA_MONTO_SOLICITADO = 'C7';
const CELDA_CIE10 = 'E7';
const CELDA_CODIGO_VALIDACION = 'C8';
const CELDA_IDENTIFICACION = 'C9';
const CELDA_BENEFICIARIO = 'C10';
const CELDA_DESDE = 'C11';
const CELDA_HASTA = 'E11';

const FILA_INICIO_DATOS = 13;
const FILA_FIN_DATOS = 53;
const COLUMNAS = {
  fecha: 'A',
  codigo: 'B',
  descripcion: 'C',
  cantidad: 'D',
  valorUnitario: 'E',
  subtotal: 'F',
  clasificador: 'G',
  modificadorPorcentaje: 'H',
  valorTotal: 'I',
} as const;

const FILA_TOTAL = 54;
const CELDA_TOTAL_LETRAS = 'C54';
const CELDA_TOTAL_NUMERO = 'I54';

const REVISOR = { nombre: 'C60', identificacion: 'C61', cargo: 'C62' };
const APROBADOR = { nombre: 'C65', identificacion: 'C66', cargo: 'C67' };

interface ContextoRequest {
  usuarioId: number;
}

interface GrupoIndividual {
  servicio: string;
  tramite: string;
  detalles: DetalleServicio[];
}

interface ResultadoGeneracion {
  generados: ResultadoPlanilla[];
  errores: { servicio: string; tramite: string; error: string }[];
}

@Injectable()
export class GeneradorIndividualesService {
  private readonly logger = new Logger(GeneradorIndividualesService.name);

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
    dto: GenerarIndividualesDto,
    _ctx: ContextoRequest,
  ): Promise<ResultadoGeneracion> {
    const planilla = await this.planillasRepository.findOneOrFail({ where: { id: planillaId } });
        if (!planilla.revisadoNombre || !planilla.aprobadoNombre) {
      throw new BadRequestException(
        'Esta planilla no tiene las firmas completas (revisor y/o aprobador). ' +
        'Complétalas en "Editar" antes de generar los documentos finales.',
      );
    }
    const grupos = await this.agruparPorServicioYTramite(planillaId, dto);
    const rutaPlantilla = await this.plantillasService.obtenerRutaActiva(TipoPlantilla.INDIVIDUAL);

    const generados: ResultadoPlanilla[] = [];
    const errores: { servicio: string; tramite: string; error: string }[] = [];

    for (const grupo of grupos) {
      try {
        const registros = await this.generarUnGrupo(planillaId, planilla, grupo, rutaPlantilla);
        generados.push(...registros);
      } catch (error) {
        this.logger.error(
          `Error generando individual servicio=${grupo.servicio} tramite=${grupo.tramite}: ${(error as Error).message}`,
        );
        errores.push({
          servicio: grupo.servicio,
          tramite: grupo.tramite,
          error: (error as Error).message,
        });
      }
    }

    return { generados, errores };
  }

  private limpiarZonasBasura(hoja: ExcelJS.Worksheet): void {
    const TODAS_LAS_COLUMNAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    const COLUMNAS_SIN_B_C = ['A', 'D', 'E', 'F', 'G', 'H', 'I'];

    for (const fila of [53, 55, 56, 57, 58, 59, 63, 64, 68]) {
      for (const col of TODAS_LAS_COLUMNAS) {
        hoja.getCell(`${col}${fila}`).value = null;
      }
    }

    for (const fila of [60, 61, 62, 65, 66, 67]) {
      for (const col of COLUMNAS_SIN_B_C) {
        hoja.getCell(`${col}${fila}`).value = null;
      }
    }
  }

  private async agruparPorServicioYTramite(
    planillaId: number,
    dto: GenerarIndividualesDto,
  ): Promise<GrupoIndividual[]> {
    const qb = this.dataSource
      .getRepository(DetalleServicio)
      .createQueryBuilder('detalle')
      .leftJoinAndSelect('detalle.expediente', 'expediente')
      .leftJoinAndSelect('expediente.tramite', 'tramite')
      .leftJoinAndSelect('detalle.tarifa', 'tarifa')
      .leftJoinAndSelect('detalle.medicamentoInsumo', 'medicamentoInsumo')
      .where('tramite.planilla = :planillaId', { planillaId })
      .orderBy('tramite.numeroTramite', 'ASC')
      .addOrderBy('detalle.fechaAtencion', 'ASC');

    if (dto.servicios?.length) {
      qb.andWhere('tramite.tipoServicio IN (:...servicios)', { servicios: dto.servicios });
    }
    if (dto.tramites?.length) {
      qb.andWhere('tramite.numeroTramite IN (:...tramites)', { tramites: dto.tramites });
    }

    const detalles = await qb.getMany();

    const mapa = new Map<string, GrupoIndividual>();
    for (const detalle of detalles) {
      const servicio = detalle.expediente.tramite.tipoServicio;
      const tramite = detalle.expediente.tramite.numeroTramite;
      const clave = `${servicio}::${tramite}`;
      if (!mapa.has(clave)) {
        mapa.set(clave, { servicio, tramite, detalles: [] });
      }
      mapa.get(clave)!.detalles.push(detalle);
    }

    return Array.from(mapa.values());
  }

  private async generarUnGrupo(
    planillaId: number,
    planilla: Planilla,
    grupo: GrupoIndividual,
    rutaPlantilla: string,
  ): Promise<ResultadoPlanilla[]> {
    const capacidad = FILA_FIN_DATOS - FILA_INICIO_DATOS + 1;
    if (grupo.detalles.length > capacidad) {
      throw new Error(
        `El trámite ${grupo.tramite} tiene ${grupo.detalles.length} líneas, pero la plantilla solo soporta ${capacidad}.`,
      );
    }

    const expediente = grupo.detalles[0].expediente;
    const tramiteEntidad = expediente.tramite;

    const servicioLimpio = limpiarNombreArchivo(grupo.servicio);
    const tramiteLimpio = limpiarNombreArchivo(grupo.tramite);
    const carpetaDestino = path.join(
      process.cwd(),
      'uploads',
      'individuales',
      servicioLimpio,
      tramiteLimpio,
    );
    const nombreBase = `Planilla_${tramiteLimpio}_${servicioLimpio}`;

    const workbook = await this.excelService.cargarPlantilla(rutaPlantilla);
    const hoja = workbook.getWorksheet(NOMBRE_HOJA) ?? workbook.worksheets[0];
    this.limpiarZonasBasura(hoja);

    hoja.getCell(CELDA_TRAMITE).value = grupo.tramite;
    hoja.getCell(CELDA_SERVICIO).value = grupo.servicio;
    hoja.getCell(CELDA_MES_ANO).value = new Date(tramiteEntidad.mesAnoServicio);
    hoja.getCell(CELDA_CIE10).value = expediente.cie10Codigo;
    hoja.getCell(CELDA_CODIGO_VALIDACION).value = expediente.codigoValidacion ?? '';
    hoja.getCell(CELDA_IDENTIFICACION).value = expediente.identificacion;
    hoja.getCell(CELDA_BENEFICIARIO).value = expediente.nombrePaciente;

    const fechas = grupo.detalles.map((d) => new Date(d.fechaAtencion).getTime());
    hoja.getCell(CELDA_DESDE).value = new Date(Math.min(...fechas));
    hoja.getCell(CELDA_HASTA).value = new Date(Math.max(...fechas));

    let filaActual = FILA_INICIO_DATOS;
    let totalGeneral = 0;

    for (const detalle of grupo.detalles) {
      const descripcion =
        detalle.tarifa?.descripcion ?? detalle.medicamentoInsumo?.descripcion ?? detalle.descripcion ?? '';

      // numFmt explícito en TODAS las columnas numéricas: la plantilla
      // trae estas celdas formateadas como FECHA de fábrica, y sin
      // forzar el formato Excel muestra "3" como "3/1/1900".
        this.excelService.escribirFila(hoja, filaActual, [
        { columna: COLUMNAS.fecha, valor: new Date(detalle.fechaAtencion), numFmt: 'mm-dd-yy' },
        // FECHA: NO forzar numFmt aquí — ya funcionaba bien antes con el
        // formato propio de la plantilla; forzarlo causó la regresión
        // (mostraba el número serie crudo en vez de la fecha).
        { columna: COLUMNAS.fecha, valor: new Date(detalle.fechaAtencion) },
        { columna: COLUMNAS.codigo, valor: detalle.codigoOriginal },
        { columna: COLUMNAS.descripcion, valor: descripcion },
        { columna: COLUMNAS.cantidad, valor: Number(detalle.cantidad), numFmt: '0.##' },
        { columna: COLUMNAS.valorUnitario, valor: Number(detalle.valorUnitarioSolicitado), numFmt: '0.0000' },
        { columna: COLUMNAS.subtotal, valor: Number(detalle.subtotal), numFmt: '0.00' },
        { columna: COLUMNAS.clasificador, valor: detalle.clasificador ?? '' },
        // % MODIFICADOR: en vez de confiar en el formato "%" nativo de
        // Excel (no se estaba aplicando en esta celda por algo propio de
        // la plantilla), escribimos el número YA multiplicado por 100 y
        // un formato de texto literal que solo le pega el símbolo "%" —
        // más robusto porque no depende del comportamiento de auto-escala
        // de Excel para el tipo "porcentaje".
        {
          columna: COLUMNAS.modificadorPorcentaje,
          valor: round2(Number(detalle.porcentajeModificador) * 100),
          numFmt: '0.00"%"',
        },
        { columna: COLUMNAS.valorTotal, valor: Number(detalle.valorSolicitado), numFmt: '0.00' },
      ]);

      totalGeneral += Number(detalle.valorSolicitado);
      filaActual += 1;
    }

    if (filaActual > FILA_TOTAL) {
      throw new Error(
        `El trámite ${grupo.tramite} tiene demasiadas líneas: llegaron hasta la fila ${filaActual - 1}, pero el TOTAL está fijo en la fila ${FILA_TOTAL}.`,
      );
    }

    hoja.getCell(CELDA_MONTO_SOLICITADO).value = totalGeneral;
    hoja.getCell(CELDA_TOTAL_NUMERO).value = totalGeneral;
    hoja.getCell(CELDA_TOTAL_LETRAS).value = montoALetras(totalGeneral);

    hoja.getCell(REVISOR.nombre).value = planilla.revisadoNombre ?? '';
    hoja.getCell(REVISOR.identificacion).value = planilla.revisadoIdentificacion ?? '';
    hoja.getCell(REVISOR.cargo).value = planilla.revisadoCargo;
    hoja.getCell(APROBADOR.nombre).value = planilla.aprobadoNombre ?? '';
    hoja.getCell(APROBADOR.identificacion).value = planilla.aprobadoIdentificacion ?? '';
    hoja.getCell(APROBADOR.cargo).value = planilla.aprobadoCargo;

    const nombreXlsx = `${nombreBase}.xlsx`;
    const rutaXlsxAbsoluta = await this.excelService.guardar(workbook, nombreXlsx, carpetaDestino);
    const rutaXlsxRelativa = path.relative(process.cwd(), rutaXlsxAbsoluta);

    // PDF real: conversión directa del .xlsx ya generado (con formato,
    // logo, firmas, todo) — en vez del PDF genérico armado a mano.
    const rutaPdfAbsoluta = await this.libreOfficeService.convertirXlsxAPdf(
      rutaXlsxAbsoluta,
      carpetaDestino,
    );
    const nombrePdf = path.basename(rutaPdfAbsoluta);
    const rutaPdfRelativa = path.relative(process.cwd(), rutaPdfAbsoluta);

    const registroXlsx = this.resultadosRepository.create({
      planilla: { id: planillaId } as any,
      tipo: TipoResultado.INDIVIDUAL,
      servicio: grupo.servicio,
      tramite: grupo.tramite,
      rutaArchivo: rutaXlsxRelativa,
      formato: FormatoArchivo.XLSX,
      nombreArchivo: nombreXlsx,
    });
    const registroPdf = this.resultadosRepository.create({
      planilla: { id: planillaId } as any,
      tipo: TipoResultado.INDIVIDUAL,
      servicio: grupo.servicio,
      tramite: grupo.tramite,
      rutaArchivo: rutaPdfRelativa,
      formato: FormatoArchivo.PDF,
      nombreArchivo: nombrePdf,
    });

    return this.resultadosRepository.save([registroXlsx, registroPdf]);
  }
}

function round2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}
