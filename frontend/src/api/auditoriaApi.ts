import { axiosClient } from './axiosClient';

// NOTA: motivosSugeridos NO existe en la respuesta de /auditoria/pendientes
// (eso vive en /planillas/:id/riesgo-detalle, usado por RevisarRiesgoPage).
// Aquí se recibe SOLO como parámetro de URL (motivoSugeridoId) que llega
// desde el botón "Revisar/Corregir" -- nunca se asume presente en los items.

export interface DetalleAuditoria {
  id: number;
  codigoOriginal: string;
  descripcion: string | null;
  cantidad: number;
  valorUnitarioSolicitado: number;
  valorUnitarioOficial: number | null;
  valorSolicitado: number;
  estadoFila: 'PENDIENTE' | 'AUDITADO' | 'RECHAZADO' | 'FACTURADO';
  nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO' | null;
  puntajeRiesgo: number | null;
  expediente: {
    nombrePaciente: string;
    identificacion: string;
    tramite: { numeroTramite: string; tipoServicio: string; planilla: { id: number } };
  };
}

export interface RespuestaPendientes {
  items: DetalleAuditoria[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MotivoObjecion {
  id: number;
  grupo: string;
  codigo_original: string;
  codigo_canonico: string;
  descripcion: string | null;
  estado_validacion: string;
}

export async function listarPendientes(estado?: string, planillaId?: number): Promise<RespuestaPendientes> {
  const { data } = await axiosClient.get<RespuestaPendientes>('/auditoria/pendientes', {
    params: { ...(estado ? { estado } : {}), ...(planillaId ? { planillaId } : {}) },
  });
  // Defensivo: garantiza que items siempre sea un array, nunca undefined.
  return { ...data, items: data.items ?? [] };
}

export async function listarMotivosObjecion(): Promise<MotivoObjecion[]> {
  try {
    const { data } = await axiosClient.get<MotivoObjecion[]>('/auditoria/motivos-objecion');
    return data ?? [];
  } catch {
    // Si el endpoint falla, Auditoría debe seguir funcionando SIN motivos
    // (son un extra, no un requisito para poder auditar).
    return [];
  }
}

export interface DecidirAuditoriaBody {
  decision: 'APROBADO' | 'RECHAZADO' | 'PARCIAL';
  motivoGlosa?: string;
  motivoObjecionId?: number;
  valorUnitarioOficial?: number;
  valorSolicitado?: number;
}

export async function decidirAuditoria(detalleId: number, body: DecidirAuditoriaBody) {
  const { data } = await axiosClient.post(`/auditoria/${detalleId}/decidir`, body);
  return data;
}

export async function reevaluarRiesgo(detalleId: number) {
  const { data } = await axiosClient.post(`/planillas/detalles/${detalleId}/evaluar-riesgo`);
  return data;
}
