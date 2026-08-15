import { axiosClient } from './axiosClient';

export interface DetalleAuditoria {
  id: number;
  codigoOriginal: string;
  descripcion: string | null;
  cantidad: number;
  valorUnitarioSolicitado: number;
  valorUnitarioOficial: number | null;
  valorSolicitado: number;
  estadoFila: 'PENDIENTE' | 'AUDITADO' | 'RECHAZADO' | 'FACTURADO';
  expediente: {
    nombrePaciente: string;
    identificacion: string;
    tramite: { numeroTramite: string; tipoServicio: string };
  };
}

export interface RespuestaPendientes {
  items: DetalleAuditoria[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listarPendientes(estado?: string): Promise<RespuestaPendientes> {
  const { data } = await axiosClient.get<RespuestaPendientes>('/auditoria/pendientes', {
    params: estado ? { estado } : {},
  });
  return data;
}

export interface DecidirAuditoriaBody {
  decision: 'APROBADO' | 'RECHAZADO' | 'PARCIAL';
  motivoGlosa?: string;
  valorUnitarioOficial?: number;
  valorSolicitado?: number;
}

export async function decidirAuditoria(detalleId: number, body: DecidirAuditoriaBody) {
  const { data } = await axiosClient.post(`/auditoria/${detalleId}/decidir`, body);
  return data;
}
