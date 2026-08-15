import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import * as ExcelJS from 'exceljs';
import * as crypto from 'crypto';

import { Planilla } from './entities/planilla.entity';
import { Tramite } from '../tramites/entities/tramite.entity';
import { Expediente } from '../expedientes/entities/expediente.entity';
import { DetalleServicio } from '../detalles/entities/detalle-servicio.entity';
import { Tarifa } from '../tarifas/entities/tarifa.entity';
import { MedicamentoInsumo } from '../medicamentos/entities/medicamento-insumo.entity';
import { DecisionAuditoriaEntity } from '../auditoria/entities/decision-auditoria.entity';
import { AuditLog } from '../audit-log/entities/audit-log.entity';
import { User } from '../users/entities/user.entity';
import { MinioService } from '../minio/minio.service';
import { SubirPlanillaDto } from './dto/subir-planilla.dto';
import { limpiarNombreArchivo } from './utils/limpiar-nombre-archivo';

import { EstadoFila, TipoItem, PlanillaEstado, DecisionAuditoria, AuditAction } from '../../common/enums';
import { detectarFilaCabeceraYMapa, MapaColumnas } from './utils/matriz-header-mapper';
import { ResultadoProcesamiento, FilaRechazada, FilaSinCatalogo } from './interfaces/resultado-procesamiento.interface';
import { ProcesarPlanillaDto } from './dto/procesar-planilla.dto';

interface ContextoRequest {
  usuarioId: number;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class PlanillasService {
  private readonly logger = new Logger(PlanillasService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly minioService: MinioService,
  ) { }

  /**
   * Punto de entrada principal: recibe el buffer del .xlsm, la planilla ya
   * registrada en BD (nombre_archivo, minio_path, hash, firmas, etc.) y
   * procesa toda la matriz dentro de una única transacción.
   */
  async procesarMatriz(
    fileBuffer: Buffer,
    dto: ProcesarPlanillaDto,
    ctx: ContextoRequest,
  ): Promise<ResultadoProcesamiento> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const resultado: ResultadoProcesamiento = {
      planillaId: dto.planillaId,
      tramitesCreados: 0,
      tramitesActualizados: 0,
      expedientesCreados: 0,
      detallesInsertados: 0,
      detallesRechazados: 0,
      detallesSinCatalogo: 0,
      filasRechazadas: [],
      filasSinCatalogo: [],
      valorTotalSolicitado: 0,
    };

    try {
      const planilla = await queryRunner.manager.findOne(Planilla, {
        where: { id: dto.planillaId },
      });
      if (!planilla) {
        throw new NotFoundException(`Planilla ${dto.planillaId} no encontrada`);
      }

      // Actualiza firmas si vienen en el DTO, y marca la planilla como PROCESANDO.
      this.aplicarFirmasSiVienen(planilla, dto);
      planilla.estado = PlanillaEstado.PROCESANDO;
      await queryRunner.manager.save(Planilla, planilla);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);

      const worksheet = workbook.worksheets.find((ws) => /MATRIZ/i.test(ws.name)) ?? workbook.worksheets[0];
      if (!worksheet) {
        throw new BadRequestException('El archivo no contiene hojas legibles.');
      }

      const { filaCabecera, mapa } = detectarFilaCabeceraYMapa(worksheet);
      this.validarColumnasMinimas(mapa);

      // Caché en memoria de tramites y expedientes ya vistos en esta corrida,
      // para no golpear la BD repetidas veces ni duplicar filas (ver 6.2).
      const tramitesCache = new Map<string, Tramite>();
      const expedientesCache = new Map<string, Expediente>(); // clave: `${tramiteId}:${cedula}`

      let filaActual = filaCabecera + 1;
      const totalFilas = worksheet.rowCount;

      while (filaActual <= totalFilas) {
        const row = worksheet.getRow(filaActual);
        if (this.filaEstaVacia(row, mapa)) {
          filaActual++;
          continue;
        }

        await this.procesarFila({
          queryRunner,
          row,
          numeroFila: filaActual,
          mapa,
          planilla,
          tramitesCache,
          expedientesCache,
          resultado,
        });

        filaActual++;
      }

      // Actualiza totales de cada trámite tocado en esta corrida.
      for (const tramite of tramitesCache.values()) {
        const totales = await queryRunner.manager
          .createQueryBuilder(DetalleServicio, 'd')
          .innerJoin('d.expediente', 'e')
          .where('e.tramite_id = :tramiteId', { tramiteId: tramite.id })
          .select('COALESCE(SUM(d.valor_solicitado), 0)', 'total')
          .getRawOne<{ total: string }>();

        const cantidadExpedientes = await queryRunner.manager.count(Expediente, {
          where: { tramite: { id: tramite.id } },
        });

        tramite.valorSolicitadoTotal = Number(totales?.total ?? 0);
        tramite.cantidadExpedientes = cantidadExpedientes;
        await queryRunner.manager.save(Tramite, tramite);
      }

      planilla.estado = PlanillaEstado.COMPLETADA;
      await queryRunner.manager.save(Planilla, planilla);

      await this.registrarAuditLog(queryRunner, {
        userId: ctx.usuarioId,
        action: AuditAction.PROCESS,
        fileId: planilla.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        resultado: `OK: ${resultado.detallesInsertados} detalles insertados, ${resultado.detallesRechazados} rechazados.`,
      });

      await queryRunner.commitTransaction();
      return resultado;
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error procesando planilla ${dto.planillaId}: ${message}`, stack);

      // La actualización de estado a ERROR se hace en una transacción nueva,
      // separada, porque la transacción principal ya fue revertida.
      await this.marcarPlanillaComoError(dto.planillaId, ctx, message);

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Error procesando la matriz: ${message}`);
    } finally {
      await queryRunner.release();
    }
  }

  // -------------------------------------------------------------------
  // Procesamiento de una fila individual
  // -------------------------------------------------------------------
  private async procesarFila(params: {
    queryRunner: QueryRunner;
    row: ExcelJS.Row;
    numeroFila: number;
    mapa: MapaColumnas;
    planilla: Planilla;
    tramitesCache: Map<string, Tramite>;
    expedientesCache: Map<string, Expediente>;
    resultado: ResultadoProcesamiento;
  }): Promise<void> {
    const { queryRunner, row, numeroFila, mapa, planilla, tramitesCache, expedientesCache, resultado } = params;

    const leer = (clave: string): string => this.leerCelda(row, mapa[clave]);

    const numeroTramite = leer('numeroTramite');
    const cedula = leer('identificacion');

    if (!numeroTramite || !cedula) {
      // Fila sin datos clave: se ignora silenciosamente (probablemente una
      // fila de separación o de totales al final de la matriz).
      return;
    }

    // --- 1. Trámite: crear si es la primera vez que se ve en esta corrida ---
    let tramite = tramitesCache.get(numeroTramite);
    if (!tramite) {
      tramite =
        (await queryRunner.manager.findOne(Tramite, { where: { numeroTramite } })) ?? undefined;

      if (!tramite) {
        tramite = queryRunner.manager.create(Tramite, {
          numeroTramite,
          tipoServicio: leer('tipoServicio') || 'NO ESPECIFICADO',
          mesAnoServicio: this.parsearFecha(leer('mesAnoServicio')) ?? this.primerDiaDelMesActual(),
          planilla,
        });
        tramite = await queryRunner.manager.save(Tramite, tramite);
        resultado.tramitesCreados++;
      } else {
        resultado.tramitesActualizados++;
      }
      tramitesCache.set(numeroTramite, tramite);
    }

    // --- 2. Expediente: mismo trámite + misma cédula => reutilizar (6.2) ---
    const claveExpediente = `${tramite.id}:${cedula}`;
    let expediente = expedientesCache.get(claveExpediente);
    if (!expediente) {
      expediente =
        (await queryRunner.manager.findOne(Expediente, {
          where: { tramite: { id: tramite.id }, identificacion: cedula },
        })) ?? undefined;

      if (!expediente) {
        expediente = queryRunner.manager.create(Expediente, {
          tramite,
          nombrePaciente: leer('nombrePaciente') || 'SIN NOMBRE',
          codigoValidacion: leer('codigoValidacion') || null,
          identificacion: cedula,
          identificacionHash: this.hashCedula(cedula),
          cie10Codigo: leer('cie10') || 'S/N',
          honorarioServicioInstitucional: leer('honorarioServicioInstitucional') || null,
        });
        expediente = await queryRunner.manager.save(Expediente, expediente);
        resultado.expedientesCreados++;
      }
      expedientesCache.set(claveExpediente, expediente);
    }

    // --- 3. Determinar tipo de ítem (3.2) ---
    const honorarioServicio = normalizarTexto(
      leer('honorarioServicioInstitucional') || expediente.honorarioServicioInstitucional || '',
    );
    const esMedicamento = honorarioServicio.includes('INSUMO/MEDICAMENTO');
    const tipoItem: TipoItem = esMedicamento ? TipoItem.MEDICAMENTO : TipoItem.TPSNS;

    const codigoOriginal = leer('codigoTpsns');
    if (!codigoOriginal) {
      // Sin código no hay nada que validar en esta fila.
      return;
    }

    const descripcionFila = esMedicamento
      ? leer('descripcionMedicamentos') || leer('descripcion')
      : leer('descripcion');

    const cantidad = this.parsearNumero(leer('cantidad')) ?? 1;
    const valorUnitarioSolicitado = esMedicamento
      ? this.parsearNumero(leer('valorUnitarioMedicamento')) ?? 0
      : this.parsearNumero(leer('valorUnitarioTpsns')) ?? 0; const porcentajeModificador = this.parsearNumero(leer('porcentajeModificador')) ?? 0;
    const clasificador = leer('clasificador') || null;
    const nivel = leer('nivel') || 'II';
    const fechaAtencion =
      this.parsearFecha(leer('fechaAtencion')) ?? tramite.mesAnoServicio;

    // --- 4. Validación contra el catálogo correspondiente (3.1) ---
    let tarifa: Tarifa | null = null;
    let medicamento: MedicamentoInsumo | null = null;

    if (esMedicamento) {
      medicamento = await queryRunner.manager.findOne(MedicamentoInsumo, {
        where: { codigoAs400: codigoOriginal },
      });
    } else {
      tarifa = await queryRunner.manager.findOne(Tarifa, {
        where: { codigoTpsns: codigoOriginal, nivel },
      });
    }


    const encontrado = esMedicamento ? !!medicamento : !!tarifa;

    if (!encontrado) {
      if (esMedicamento) {
        // No tenemos catálogo AS-400 disponible: NO es un rechazo, es una
        // línea que un humano debe validar y completar el valor oficial
        // manualmente vía POST /auditoria/:id/decidir (igual que un
        // rechazo automático de TPSNS, pero sin decisión automática
        // registrada porque no hubo ningún "rechazo" real).
        const subtotalProvisional = round2(cantidad * valorUnitarioSolicitado);

        const detallePendiente = queryRunner.manager.create(DetalleServicio, {
          expediente,
          tipoItem,
          tarifa: null,
          medicamentoInsumo: null,
          fechaAtencion,
          codigoOriginal,
          descripcion: descripcionFila || null,
          cantidad,
          valorUnitarioSolicitado,
          valorUnitarioOficial: null, // el auditor lo completa manualmente
          subtotal: subtotalProvisional,
          clasificador,
          porcentajeModificador,
          valorModificador: 0,
          valorSolicitado: subtotalProvisional, // provisional, sin modificador
          estadoFila: EstadoFila.PENDIENTE,
        });
        await queryRunner.manager.save(DetalleServicio, detallePendiente);

        resultado.detallesInsertados++;
        resultado.detallesSinCatalogo++;
        resultado.filasSinCatalogo.push({
          fila: numeroFila,
          tramite: numeroTramite,
          cedula,
          codigoOriginal,
          descripcion: descripcionFila || '(sin descripción)',
        });
        // No sumamos a valorTotalSolicitado: es un monto provisional sin
        // validar, no debe contarse como "solicitado confirmado" todavía.
        return;
      }

      // TPSNS: SÍ tenemos catálogo cargado — si no aparece, es un rechazo real.
      const detalleRechazado = queryRunner.manager.create(DetalleServicio, {
        expediente,
        tipoItem,
        tarifa: null,
        medicamentoInsumo: null,
        fechaAtencion,
        codigoOriginal,
        descripcion: descripcionFila || null,
        cantidad,
        valorUnitarioSolicitado,
        valorUnitarioOficial: null,
        subtotal: 0,
        clasificador,
        porcentajeModificador,
        valorModificador: 0,
        valorSolicitado: 0,
        estadoFila: EstadoFila.RECHAZADO,
      });
      const guardado = await queryRunner.manager.save(DetalleServicio, detalleRechazado);

      const decisionAutomatica = queryRunner.manager.create(DecisionAuditoriaEntity, {
        detalleServicio: guardado,
        auditor: null,
        decision: DecisionAuditoria.RECHAZADO,
        motivoGlosa: `Código no encontrado en catálogo TPSNS para nivel ${nivel}`,
      });
      await queryRunner.manager.save(DecisionAuditoriaEntity, decisionAutomatica);

      resultado.detallesRechazados++;
      const rechazo: FilaRechazada = {
        fila: numeroFila,
        tramite: numeroTramite,
        cedula,
        codigoOriginal,
        tipoItem,
        motivo: `Código no encontrado en catálogo TPSNS para nivel ${nivel}`,
      };
      resultado.filasRechazadas.push(rechazo);
      return;
    }

    // --- 5. Código válido: calcular montos con el precio oficial ---
    const valorUnitarioOficial = esMedicamento
      ? Number(medicamento!.precioOficial)
      : Number(tarifa!.valorOficial);

    const subtotal = round2(cantidad * valorUnitarioSolicitado);
    const valorSolicitado = round2(subtotal * porcentajeModificador);
    // valorModificador queda como el DELTA informativo (positivo si el
    // modificador aumenta el monto, negativo si lo reduce; 0 cuando
    // porcentajeModificador = 1.00, es decir "sin cambios").
    const valorModificador = round2(valorSolicitado - subtotal);
    const detalle = queryRunner.manager.create(DetalleServicio, {
      expediente,
      tipoItem,
      tarifa: esMedicamento ? null : tarifa,
      medicamentoInsumo: esMedicamento ? medicamento : null,
      fechaAtencion,
      codigoOriginal,
      descripcion: descripcionFila || (esMedicamento ? medicamento!.descripcion : tarifa!.descripcion),
      cantidad,
      valorUnitarioSolicitado,
      valorUnitarioOficial,
      subtotal,
      clasificador,
      porcentajeModificador,
      valorModificador,
      valorSolicitado,
      estadoFila: EstadoFila.PENDIENTE,
    });

    await queryRunner.manager.save(DetalleServicio, detalle);
    resultado.detallesInsertados++;
    resultado.valorTotalSolicitado = round2(resultado.valorTotalSolicitado + valorSolicitado);
  }
 /**
   * US-01/US-02 del Sprint 1: sube el archivo a MinIO con naming auditado
   * y crea la fila `planillas`. Reemplaza el INSERT manual por SQL que
   * usabas para las pruebas — a partir de ahora el flujo real es:
   * subirYRegistrar() -> devuelve planillaId -> procesarMatriz(planillaId).
   */
  async subirYRegistrar(
    file: Express.Multer.File,
    dto: SubirPlanillaDto,
    usuarioId: number,
  ): Promise<Planilla> {
    if (!file) {
      throw new BadRequestException('Debes adjuntar el archivo de la matriz (.xlsx o .xlsm)');
    }

    const extensionValida = /\.(xlsx|xlsm)$/i.test(file.originalname);
    if (!extensionValida) {
      throw new BadRequestException('El archivo debe ser .xlsx o .xlsm');
    }

    const hashSha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Evita subir el mismo archivo dos veces por error (hash_sha256 es
    // UNIQUE en la BD, pero mejor dar un mensaje claro antes de tocar MinIO).
    const yaExiste = await this.dataSource
      .getRepository(Planilla)
      .findOne({ where: { hashSha256 } });
    if (yaExiste) {
      throw new BadRequestException(
        `Este archivo ya fue subido antes (planilla id=${yaExiste.id}, estado=${yaExiste.estado}). ` +
          'Si necesitas reprocesarlo, usa ese id directo en /planillas/procesar.',
      );
    }

    const [mes, anio] = dto.periodo.split('-');

    const hospitalLimpio = limpiarNombreArchivo(dto.hospital);
    const nombreArchivoLimpio = limpiarNombreArchivo(file.originalname);
    const timestamp = Date.now();
    const objectName = `planillas/${hospitalLimpio}/${anio}/${mes}/${usuarioId}_${timestamp}_${nombreArchivoLimpio}`;

    await this.minioService.uploadFile(file.buffer, objectName, {
      'Content-Type': file.mimetype,
    });

    const planilla = this.dataSource.getRepository(Planilla).create({
      nombreArchivo: file.originalname,
      minioPath: objectName,
      hashSha256,
      hospital: dto.hospital,
      periodo: dto.periodo,
      subidoPor: { id: usuarioId } as any,
      estado: PlanillaEstado.SUBIDA,
    });

    const guardada = await this.dataSource.getRepository(Planilla).save(planilla);

    this.logger.log(`Planilla ${guardada.id} subida a MinIO: ${objectName}`);

    return guardada;
  }
  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------

  private aplicarFirmasSiVienen(planilla: Planilla, dto: ProcesarPlanillaDto): void {
    if (dto.revisadoNombre !== undefined) planilla.revisadoNombre = dto.revisadoNombre;
    if (dto.revisadoIdentificacion !== undefined)
      planilla.revisadoIdentificacion = dto.revisadoIdentificacion;
    if (dto.revisadoSello !== undefined) planilla.revisadoSello = dto.revisadoSello;
    if (dto.aprobadoNombre !== undefined) planilla.aprobadoNombre = dto.aprobadoNombre;
    if (dto.aprobadoIdentificacion !== undefined)
      planilla.aprobadoIdentificacion = dto.aprobadoIdentificacion;
    if (dto.aprobadoSello !== undefined) planilla.aprobadoSello = dto.aprobadoSello;
  }

  private validarColumnasMinimas(mapa: MapaColumnas): void {
    const requeridas = ['numeroTramite', 'identificacion', 'honorarioServicioInstitucional', 'codigoTpsns'];
    const faltantes = requeridas.filter((clave) => mapa[clave] === undefined);
    if (faltantes.length > 0) {
      throw new BadRequestException(
        `No se pudieron ubicar las siguientes columnas obligatorias en la matriz: ${faltantes.join(', ')}`,
      );
    }
  }

  private filaEstaVacia(row: ExcelJS.Row, mapa: MapaColumnas): boolean {
    const colTramite = mapa['numeroTramite'];
    const colCedula = mapa['identificacion'];
    const valTramite = this.leerCelda(row, colTramite);
    const valCedula = this.leerCelda(row, colCedula);
    return !valTramite && !valCedula;
  }

  private leerCelda(row: ExcelJS.Row, colNumber: number | undefined): string {
    if (colNumber === undefined) return '';
    const cell = row.getCell(colNumber);
    if (cell.value === null || cell.value === undefined) return '';
    // Excel a veces trae errores de fórmula heredados de la matriz original
    // (#REF!, "INGRESE VALOR", etc. - ver sección 3 del prompt). SIGMA no
    // depende de esas fórmulas: simplemente se ignoran como celda vacía.
    const texto = (cell.text ?? '').toString().trim();
    if (/#REF!|#N\/A|#VALUE!|INGRESE VALOR|NO EXISTE CODIGO/i.test(texto)) {
      return '';
    }
    return texto;
  }

  private parsearNumero(valor: string): number | null {
    if (!valor) return null;
    const limpio = valor.replace(/[^0-9,.-]/g, '').replace(',', '.');
    const num = parseFloat(limpio);
    return Number.isFinite(num) ? num : null;
  }

  private parsearFecha(valor: string): string | null {
    if (!valor) return null;
    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) return null;
    return fecha.toISOString().slice(0, 10);
  }

  private primerDiaDelMesActual(): string {
    const ahora = new Date();
    return new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().slice(0, 10);
  }

  private hashCedula(cedula: string): string {
    return crypto.createHash('sha256').update(cedula.trim()).digest('hex');
  }

  private async registrarAuditLog(
    queryRunner: QueryRunner,
    entrada: {
      userId: number;
      action: AuditAction;
      fileId?: number;
      ipAddress?: string;
      userAgent?: string;
      resultado?: string;
    },
  ): Promise<void> {
    const log = queryRunner.manager.create(AuditLog, {
      user: { id: entrada.userId } as User,
      action: entrada.action,
      file: entrada.fileId ? ({ id: entrada.fileId } as Planilla) : null,
      ipAddress: entrada.ipAddress ?? null,
      userAgent: entrada.userAgent ?? null,
      resultado: entrada.resultado ?? null,
    });
    await queryRunner.manager.save(AuditLog, log);
  }

  private async marcarPlanillaComoError(
    planillaId: number,
    ctx: ContextoRequest,
    motivo: string,
  ): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(Planilla, { id: planillaId }, { estado: PlanillaEstado.ERROR });
        const log = manager.create(AuditLog, {
          user: { id: ctx.usuarioId } as User,
          action: AuditAction.PROCESS,
          file: { id: planillaId } as Planilla,
          ipAddress: ctx.ipAddress ?? null,
          userAgent: ctx.userAgent ?? null,
          resultado: `ERROR: ${motivo}`,
        });
        await manager.save(AuditLog, log);
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`No se pudo marcar la planilla ${planillaId} como ERROR: ${message}`);
    }
  }
}

function normalizarTexto(texto: string): string {
  return texto
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function round2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}
