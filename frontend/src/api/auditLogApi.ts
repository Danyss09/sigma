import { axiosClient } from './axiosClient';

export interface EventoAuditoria {
  id: number;
  action: string;
  user: { id: number; nombre: string; email: string } | null;
  file: { id: number; nombreArchivo: string } | null;
  ipAddress: string | null;
  userAgent: string | null;
  resultado: string | null;
  createdAt: string;
}

export interface FiltrosAuditLog {
  fileId?: number;
  userId?: number;
  from?: string;
  to?: string;
  action?: string;
  page?: number;
  limit?: number;
}

export async function listarEventosAuditoria(filtros: FiltrosAuditLog) {
  const { data } = await axiosClient.get<{ items: EventoAuditoria[]; total: number; page: number; limit: number }>(
    '/audit-log',
    { params: filtros },
  );
  return data;
}
