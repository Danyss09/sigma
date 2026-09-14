import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { AuditAction } from '../../common/enums';

interface EntradaLog {
  userId?: number | null;
  action: AuditAction;
  fileId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  resultado?: string | null;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog) private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Registro genérico de un evento de auditoría. El resto del sistema
   * (PlanillasService, AuditoriaService, etc.) ya lo usa así en varios
   * puntos -- este método solo lo centraliza para quien no tenga
   * acceso directo al repositorio.
   */
  async registrar(entrada: EntradaLog): Promise<AuditLog> {
    const log = this.auditLogRepository.create({
      user: entrada.userId ? ({ id: entrada.userId } as any) : null,
      action: entrada.action,
      file: entrada.fileId ? ({ id: entrada.fileId } as any) : null,
      ipAddress: entrada.ipAddress ?? null,
      userAgent: entrada.userAgent ?? null,
      resultado: entrada.resultado ?? null,
    });
    return this.auditLogRepository.save(log);
  }

  /**
   * Consulta filtrable LOPDP: quién accedió a qué, cuándo, con qué
   * resultado. Requisito explícito: "trazabilidad completa de quién
   * accedió a qué archivo y cuándo".
   */
  async listarFiltrado(query: QueryAuditLogDto) {
    const qb = this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .leftJoinAndSelect('log.file', 'file')
      .orderBy('log.createdAt', 'DESC');

    if (query.fileId) qb.andWhere('file.id = :fileId', { fileId: query.fileId });
    if (query.userId) qb.andWhere('user.id = :userId', { userId: query.userId });
    if (query.action) qb.andWhere('log.action = :action', { action: query.action });
    if (query.from) qb.andWhere('log.createdAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('log.createdAt <= :to', { to: query.to });

    qb.skip((query.page - 1) * query.limit).take(query.limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page: query.page, limit: query.limit };
  }
}
