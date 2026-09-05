import { axiosClient } from './axiosClient';

export interface DetalleRiesgo {
  detalleId: number;
  codigo: string;
  descripcion: string | null;
  cantidad: number;
  valorSolicitado: number;
  valorOficial: number | null;
  nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO' | null;
  puntaje: number | null;
  shapValues: Record<string, number> | null;
  corregido: boolean;
  valorAnteriorCorreccion: number | null;
  motivoCorreccion: string | null;
  motivoNoEvaluado: string | null;
  tramite: string;
  servicio: string;
  motivosSugeridos: { id: number; grupo: string; codigo_original: string; descripcion: string | null }[];
}

export async function obtenerVistaRiesgo(planillaId: number): Promise<DetalleRiesgo[]> {
  const { data } = await axiosClient.get<DetalleRiesgo[]>(`/planillas/${planillaId}/riesgo-detalle`);
  return data;
}

export async function evaluarRiesgoPlanilla(planillaId: number): Promise<unknown> {
  const { data } = await axiosClient.post(`/planillas/${planillaId}/evaluar-riesgo`);
  return data;
}

export async function evaluarUnaLinea(detalleId: number): Promise<unknown> {
  const { data } = await axiosClient.post(`/planillas/detalles/${detalleId}/evaluar-riesgo`);
  return data;
}
