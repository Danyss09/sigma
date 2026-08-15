import { axiosClient } from './axiosClient';

export interface Plantilla {
  id: number;
  nombre: string;
  tipo: 'INDIVIDUAL' | 'CONSOLIDADA';
  version: number;
  activo: boolean;
  createdAt: string;
}

export async function listarPlantillas(): Promise<Plantilla[]> {
  const { data } = await axiosClient.get<Plantilla[]>('/plantillas');
  return data;
}

export async function subirPlantilla(
  nombre: string,
  tipo: 'INDIVIDUAL' | 'CONSOLIDADA',
  archivo: File,
): Promise<Plantilla> {
  const formData = new FormData();
  formData.append('nombre', nombre);
  formData.append('tipo', tipo);
  formData.append('archivo', archivo);

  const { data } = await axiosClient.post<Plantilla>('/plantillas', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
