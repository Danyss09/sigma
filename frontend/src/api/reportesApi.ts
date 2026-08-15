import { axiosClient } from './axiosClient';

export interface ResultadoProcesamiento {
  planillaId: number;
  tramitesCreados: number;
  tramitesActualizados: number;
  expedientesCreados: number;
  detallesInsertados: number;
  detallesRechazados: number;
  detallesSinCatalogo: number;
  valorTotalSolicitado: number;
  filasRechazadas: unknown[];
  filasSinCatalogo: unknown[];
}

export async function procesarPlanilla(
  planillaId: number,
  firmas: {
    revisadoNombre?: string;
    revisadoIdentificacion?: string;
    revisadoCargo?: string;
    aprobadoNombre?: string;
    aprobadoIdentificacion?: string;
    aprobadoCargo?: string;
  },
  file: File,
): Promise<ResultadoProcesamiento> {
  const formData = new FormData();
  formData.append('planillaId', String(planillaId));
  Object.entries(firmas).forEach(([key, value]) => {
    if (value) formData.append(key, value);
  });
  formData.append('file', file);

  const { data } = await axiosClient.post<ResultadoProcesamiento>('/planillas/procesar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export interface ResultadoReporte {
  generados: { id: number; nombreArchivo: string; formato: string }[];
  errores: unknown[];
  advertencias?: unknown[];
}

export async function generarIndividuales(
  planillaId: number,
  servicios?: string[],
): Promise<ResultadoReporte> {
  const { data } = await axiosClient.post<ResultadoReporte>(
    `/planillas/${planillaId}/generar-individuales`,
    servicios ? { servicios } : {},
  );
  return data;
}

export async function generarConsolidadas(
  planillaId: number,
  servicios?: string[],
): Promise<ResultadoReporte> {
  const { data } = await axiosClient.post<ResultadoReporte>(
    `/planillas/${planillaId}/generar-consolidadas`,
    servicios ? { servicios } : {},
  );
  return data;
}

export interface ResultadoPlanilla {
  id: number;
  tipo: 'INDIVIDUAL' | 'CONSOLIDADA';
  servicio: string;
  tramite: string | null;
  formato: 'xlsx' | 'pdf';
  nombreArchivo: string;
  createdAt: string;
}

export async function listarResultados(planillaId: number): Promise<ResultadoPlanilla[]> {
  const { data } = await axiosClient.get<ResultadoPlanilla[]>(`/planillas/${planillaId}/resultados`);
  return data;
}
export async function listarServicios(planillaId: number): Promise<string[]> {
  const { data } = await axiosClient.get<string[]>(`/planillas/${planillaId}/servicios`);
  return data;
}
export async function descargarResultado(id: number, nombreArchivo: string): Promise<void> {
  const response = await axiosClient.get(`/planillas/resultados/${id}/descargar`, {
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', nombreArchivo);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
