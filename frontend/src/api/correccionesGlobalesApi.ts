import { axiosClient } from './axiosClient';

export interface CorreccionGlobal {
  id: number;
  valorAnterior: number;
  valorCorregido: number;
  nivelRiesgo: string;
  puntaje: number;
  motivo: string;
  createdAt: string;
  detalleServicio: {
    codigoOriginal: string;
    descripcion: string | null;
    expediente: {
      tramite: {
        planilla: { id: number };
      };
    };
  };
}

export async function listarCorreccionesGlobales(busqueda?: string): Promise<CorreccionGlobal[]> {
  const { data } = await axiosClient.get<CorreccionGlobal[]>('/planillas/correcciones', {
    params: busqueda ? { q: busqueda } : {},
  });
  return data;
}
