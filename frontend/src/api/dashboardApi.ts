import { axiosClient } from './axiosClient';

export interface ResumenGlobal {
  porNivelRiesgo: { clave: string; total: number }[];
  lineas: { total: number; evaluadas: number };
  porEstadoFila: { clave: string; total: number }[];
  totalObjetadas: number;
  totalCorrecciones: number;
  tendenciaMensual: { mes: string; total: number }[];
  planillasPorEstado: { clave: string; total: number }[];
}

export async function obtenerResumenGlobal(): Promise<ResumenGlobal> {
  const { data } = await axiosClient.get<ResumenGlobal>('/dashboard/resumen');
  return data;
}
