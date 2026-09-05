import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ResponsableFirma, TipoResponsable } from './entities/responsable-firma.entity';
import { PlanillaResponsableSnapshot } from './entities/planilla-responsable-snapshot.entity';
import { CrearResponsableDto } from './dto/crear-responsable.dto';
import { ActualizarResponsableDto } from './dto/actualizar-responsable.dto';

@Injectable()
export class ResponsablesService {
  constructor(
    @InjectRepository(ResponsableFirma) private readonly responsablesRepo: Repository<ResponsableFirma>,
    @InjectRepository(PlanillaResponsableSnapshot) private readonly snapshotRepo: Repository<PlanillaResponsableSnapshot>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async listar(): Promise<ResponsableFirma[]> {
    return this.responsablesRepo.find({ order: { tipo: 'ASC', orden: 'ASC' } });
  }

  async crear(dto: CrearResponsableDto): Promise<ResponsableFirma> {
    if (dto.tipo === TipoResponsable.DIRECTOR_ADMINISTRATIVO) {
      const yaExiste = await this.responsablesRepo.findOne({
        where: { tipo: TipoResponsable.DIRECTOR_ADMINISTRATIVO, activo: true },
      });
      if (yaExiste) {
        throw new ConflictException(
          'Ya existe un Director Administrativo activo. Desactívalo primero o edítalo directamente.',
        );
      }
    }

    if (dto.tipo === TipoResponsable.REVISOR && dto.orden === undefined) {
      const maxOrden = await this.responsablesRepo
        .createQueryBuilder('r')
        .select('COALESCE(MAX(r.orden), 0)', 'max')
        .where('r.tipo = :tipo', { tipo: TipoResponsable.REVISOR })
        .getRawOne();
      dto.orden = Number(maxOrden.max) + 1;
    }

    const nuevo = this.responsablesRepo.create({ ...dto, activo: true, nuncaUsado: true });
    return this.responsablesRepo.save(nuevo);
  }

  async actualizar(id: number, dto: ActualizarResponsableDto): Promise<ResponsableFirma> {
    const responsable = await this.responsablesRepo.findOne({ where: { id } });
    if (!responsable) {
      throw new NotFoundException(`Responsable ${id} no encontrado`);
    }
    Object.assign(responsable, dto);
    return this.responsablesRepo.save(responsable);
  }

  async eliminar(id: number): Promise<void> {
    const responsable = await this.responsablesRepo.findOne({ where: { id } });
    if (!responsable) {
      throw new NotFoundException(`Responsable ${id} no encontrado`);
    }
    if (!responsable.nuncaUsado) {
      throw new ConflictException(
        'Este responsable ya aparece en documentos generados -- no se puede eliminar físicamente. Desactívalo en su lugar.',
      );
    }
    await this.responsablesRepo.remove(responsable);
  }

  /**
   * Valores activos de Configuración para pre-llenar una planilla
   * NUEVA. Toma el Director Administrativo activo (-> aprobado*) y el
   * primer Revisor activo por orden (-> revisado*) -- la plantilla
   * actual solo soporta 1 revisor + 1 aprobador por documento.
   */
  async obtenerValoresParaNuevaPlanilla(): Promise<{
    revisadoNombre?: string;
    revisadoIdentificacion?: string;
    revisadoCargo?: string;
    aprobadoNombre?: string;
    aprobadoIdentificacion?: string;
    aprobadoCargo?: string;
  }> {
    const director = await this.responsablesRepo.findOne({
      where: { tipo: TipoResponsable.DIRECTOR_ADMINISTRATIVO, activo: true },
    });
    const revisor = await this.responsablesRepo.findOne({
      where: { tipo: TipoResponsable.REVISOR, activo: true },
      order: { orden: 'ASC' },
    });

    return {
      revisadoNombre: revisor?.nombreCompleto,
      revisadoIdentificacion: revisor?.identificacion ?? undefined,
      revisadoCargo: revisor?.cargo ?? undefined,
      aprobadoNombre: director?.nombreCompleto,
      aprobadoIdentificacion: director?.identificacion ?? undefined,
      aprobadoCargo: director?.cargo ?? undefined,
    };
  }

  /**
   * Disponible para cuando la plantilla soporte múltiples revisores --
   * no se usa todavía en la generación de documentos (ver LEEME).
   */
  async crearSnapshotParaPlanilla(planillaId: number): Promise<PlanillaResponsableSnapshot[]> {
    const activos = await this.responsablesRepo.find({ where: { activo: true } });

    const snapshots: PlanillaResponsableSnapshot[] = [];
    for (const r of activos) {
      const snap = this.snapshotRepo.create({
        planilla: { id: planillaId } as any,
        tipo: r.tipo,
        nombreCompleto: r.nombreCompleto,
        identificacion: r.identificacion,
        cargo: r.cargo,
        firmaPath: r.firmaPath,
        orden: r.orden,
        responsableOrigen: { id: r.id } as any,
      });
      snapshots.push(await this.snapshotRepo.save(snap));

      if (r.nuncaUsado) {
        r.nuncaUsado = false;
        await this.responsablesRepo.save(r);
      }
    }
    return snapshots;
  }

  async obtenerSnapshotDePlanilla(planillaId: number): Promise<PlanillaResponsableSnapshot[]> {
    return this.snapshotRepo.find({ where: { planilla: { id: planillaId } as any }, order: { tipo: 'ASC', orden: 'ASC' } });
  }
}
