import { axiosClient } from './axiosClient';

export interface PlanillaListado {
  id: number;
  nombreArchivo: string;
  hospital: string;
  periodo: string;
  estado: 'SUBIDA' | 'PROCESANDO' | 'COMPLETADA' | 'ERROR';
  createdAt: string;
  revisadoNombre: string | null;
  aprobadoNombre: string | null;
  subidoPor?: { nombre: string; email: string };
}

export async function listarPlanillas(filtros?: {
  periodo?: string;
  estado?: string;
  hospital?: string;
}): Promise<PlanillaListado[]> {
  const { data } = await axiosClient.get<PlanillaListado[]>('/planillas', { params: filtros });
  return data;
}

export async function obtenerDetallePlanilla(id: number): Promise<PlanillaListado & { tramites: unknown[] }> {
  const { data } = await axiosClient.get(`/planillas/${id}/detalle`);
  return data;
}

export async function actualizarPlanilla(
  id: number,
  cambios: Partial<{
    hospital: string;
    periodo: string;
    revisadoNombre: string;
    revisadoIdentificacion: string;
    aprobadoNombre: string;
    aprobadoIdentificacion: string;
  }>,
): Promise<PlanillaListado> {
  const { data } = await axiosClient.patch<PlanillaListado>(`/planillas/${id}`, cambios);
  return data;
}

export async function eliminarPlanilla(id: number): Promise<void> {
  await axiosClient.delete(`/planillas/${id}`);
}
