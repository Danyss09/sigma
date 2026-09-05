import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { DetalleServicio } from '../detalles/entities/detalle-servicio.entity';
import { DecisionAuditoriaEntity } from './entities/decision-auditoria.entity';
import { AuditLog } from '../audit-log/entities/audit-log.entity';
import { EstadoFila, DecisionAuditoria, AuditAction } from '../../common/enums';
import { DecidirAuditoriaDto } from './dto/decidir-auditoria.dto';

interface ContextoRequest {
  usuarioId: number;
  ipAddress?: string;
  userAgent?: string;
}

const ESTADOS_AUDITABLES: EstadoFila[] = [EstadoFila.PENDIENTE, EstadoFila.RECHAZADO];
const TOLERANCIA_VALOR = 0.01;

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Lista las líneas que un auditor debe revisar. Enriquecida con:
   * nivel de riesgo, puntaje, SHAP y validación de catálogo -- todo
   * con valores por defecto seguros (nunca undefined) para que el
   * frontend jamás explote por un campo faltante.
   */
  async listarPendientes(filtros: { estado?: string; tramiteId?: number; planillaId?: number; page?: number; limit?: number }) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 20;

    const qb = this.dataSource
      .getRepository(DetalleServicio)
      .createQueryBuilder('detalle')
      .leftJoinAndSelect('detalle.expediente', 'expediente')
      .leftJoinAndSelect('expediente.tramite', 'tramite')
      .leftJoinAndSelect('tramite.planilla', 'planilla')
      .where('detalle.estadoFila IN (:...estados)', {
        estados: filtros.estado ? [filtros.estado] : ['PENDIENTE', 'RECHAZADO'],
      });

    if (filtros.tramiteId) {
      qb.andWhere('tramite.id = :tramiteId', { tramiteId: filtros.tramiteId });
    }
    if (filtros.planillaId) {
      qb.andWhere('planilla.id = :planillaId', { planillaId: filtros.planillaId });
    }

    qb.orderBy('detalle.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    const itemsEnriquecidos = await Promise.all(
      items.map(async (item) => {
        const prediccion = await this.dataSource.getRepository('predicciones_riesgo').findOne({
          where: { detalleServicio: { id: item.id } },
          order: { fechaPrediccion: 'DESC' },
        } as any);

        const valorOficial = item.valorUnitarioOficial !== null ? Number(item.valorUnitarioOficial) : null;
        const valorSolicitado = Number(item.valorUnitarioSolicitado);
        let validacionCatalogo: 'CORRECTA' | 'DIFERENCIA' | 'SIN_CATALOGO' = 'SIN_CATALOGO';
        if (valorOficial !== null) {
          validacionCatalogo = Math.abs(valorSolicitado - valorOficial) <= TOLERANCIA_VALOR ? 'CORRECTA' : 'DIFERENCIA';
        }

        return {
          ...item,
          servicio: item.expediente?.tramite?.tipoServicio ?? null,
          nivelRiesgo: (prediccion as any)?.nivelRiesgo ?? null,
          puntajeRiesgo: (prediccion as any)?.puntaje ? Number((prediccion as any).puntaje) : null,
          shapValues: (prediccion as any)?.explicacionShap ?? null,
          validacionCatalogo,
          // SIEMPRE array, nunca undefined -- el frontend puede confiar
          // en esto ciegamente sin checks adicionales.
          motivosSugeridos: [] as any[],
        };
      }),
    );

    return {
      items: itemsEnriquecidos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async decidir(
    detalleId: number,
    dto: DecidirAuditoriaDto,
    ctx: ContextoRequest,
  ): Promise<{ detalle: DetalleServicio; decision: DecisionAuditoriaEntity }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const detalle = await queryRunner.manager.findOne(DetalleServicio, {
        where: { id: detalleId },
        relations: ['tarifa', 'medicamentoInsumo'],
      });

      if (!detalle) {
        throw new NotFoundException(`Detalle de servicio ${detalleId} no encontrado`);
      }

      if (!ESTADOS_AUDITABLES.includes(detalle.estadoFila)) {
        throw new ConflictException(
          `El detalle ${detalleId} está en estado ${detalle.estadoFila} y ya no puede auditarse.`,
        );
      }
      const requiereValorOficialManual = detalle.valorUnitarioOficial === null;

      this.aplicarDecision(detalle, dto, requiereValorOficialManual);

      await queryRunner.manager.save(DetalleServicio, detalle);

      const decisionEntity = queryRunner.manager.create(DecisionAuditoriaEntity, {
        detalleServicio: detalle,
        auditor: { id: ctx.usuarioId } as any,
        decision: dto.decision,
        motivoGlosa: dto.motivoGlosa ?? null,
        motivoObjecion: dto.motivoObjecionId ? ({ id: dto.motivoObjecionId } as any) : null,
      });
      await queryRunner.manager.save(DecisionAuditoriaEntity, decisionEntity);

      await queryRunner.manager.save(AuditLog, {
        user: { id: ctx.usuarioId } as any,
        action: AuditAction.AUDITAR,
        file: null,
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
        resultado: `Detalle ${detalleId}: decision=${dto.decision}${
          dto.motivoGlosa ? `, motivo="${dto.motivoGlosa}"` : ''
        }`,
      });

      await queryRunner.commitTransaction();

      this.logger.log(`Detalle ${detalleId} auditado por usuario ${ctx.usuarioId}: ${dto.decision}`);

      return { detalle, decision: decisionEntity };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private aplicarDecision(
    detalle: DetalleServicio,
    dto: DecidirAuditoriaDto,
    requiereValorOficialManual: boolean,
  ): void {
    switch (dto.decision) {
      case DecisionAuditoria.APROBADO: {
        if (requiereValorOficialManual) {
          if (dto.valorUnitarioOficial === undefined || dto.valorSolicitado === undefined) {
            throw new BadRequestException(
              'Esta línea no tiene valor oficial registrado (código TPSNS no encontrado, o insumo/medicamento sin catálogo AS-400 disponible). ' +
                'Debes indicar valorUnitarioOficial y valorSolicitado manualmente para aprobarla.',
            );
          }
        }
        if (dto.valorUnitarioOficial !== undefined) {
          detalle.valorUnitarioOficial = dto.valorUnitarioOficial;
        }
        if (dto.valorSolicitado !== undefined) {
          detalle.valorSolicitado = dto.valorSolicitado;
        }
        detalle.estadoFila = EstadoFila.AUDITADO;
        break;
      }

      case DecisionAuditoria.PARCIAL: {
        if (!dto.motivoGlosa) {
          throw new BadRequestException('Una aprobación PARCIAL requiere motivoGlosa explicando el ajuste.');
        }
        if (dto.valorSolicitado === undefined) {
          throw new BadRequestException('Una aprobación PARCIAL requiere el nuevo valorSolicitado ajustado.');
        }
        if (dto.valorUnitarioOficial !== undefined) {
          detalle.valorUnitarioOficial = dto.valorUnitarioOficial;
        }
        detalle.valorSolicitado = dto.valorSolicitado;
        detalle.estadoFila = EstadoFila.AUDITADO;
        break;
      }

      case DecisionAuditoria.RECHAZADO: {
        if (!dto.motivoGlosa) {
          throw new BadRequestException('Un rechazo definitivo requiere motivoGlosa.');
        }
        detalle.estadoFila = EstadoFila.RECHAZADO;
        break;
      }
    }
  }

  async obtenerContextoCompleto(detalleId: number) {
    const detalle = await this.dataSource.getRepository(DetalleServicio).findOne({
      where: { id: detalleId },
      relations: ['expediente', 'expediente.tramite', 'expediente.tramite.planilla', 'tarifa', 'medicamentoInsumo'],
    });
    if (!detalle) {
      throw new NotFoundException(`Detalle ${detalleId} no encontrado`);
    }

    const prediccion = await this.dataSource.getRepository('predicciones_riesgo').findOne({
      where: { detalleServicio: { id: detalleId } },
      order: { fechaPrediccion: 'DESC' },
    } as any);

    return { detalle, prediccion };
  }

  async listarMotivosObjecion() {
    return this.dataSource.query(
      `SELECT id, grupo, codigo_original, codigo_canonico, descripcion, estado_validacion
       FROM motivos_objecion
       ORDER BY grupo, codigo_original`,
    );
  }
}
