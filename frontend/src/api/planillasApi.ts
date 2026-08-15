import { axiosClient } from './axiosClient';

export interface PlanillaSubida {
  id: number;
  nombreArchivo: string;
  minioPath: string;
  hashSha256: string;
  hospital: string;
  periodo: string;
  estado: string;
}

export async function subirPlanilla(
  hospital: string,
  periodo: string,
  file: File,
): Promise<PlanillaSubida> {
  const formData = new FormData();
  formData.append('hospital', hospital);
  formData.append('periodo', periodo);
  formData.append('file', file);

  const { data } = await axiosClient.post<PlanillaSubida>('/planillas/subir', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
