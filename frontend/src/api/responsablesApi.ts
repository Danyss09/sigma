import { axiosClient } from './axiosClient';

export interface ResponsableFirma {
  id: number;
  tipo: 'DIRECTOR_ADMINISTRATIVO' | 'REVISOR';
  nombreCompleto: string;
  identificacion: string | null;
  cargo: string | null;
  firmaPath: string | null;
  orden: number | null;
  activo: boolean;
  nuncaUsado: boolean;
}

export async function listarResponsables(): Promise<ResponsableFirma[]> {
  const { data } = await axiosClient.get<ResponsableFirma[]>('/responsables');
  return data;
}

export async function crearResponsable(dto: { tipo: string; nombreCompleto: string; identificacion?: string; cargo?: string; orden?: number }) {
  const { data } = await axiosClient.post('/responsables', dto);
  return data;
}

export async function actualizarResponsable(id: number, dto: Partial<{ nombreCompleto: string; identificacion: string; cargo: string; activo: boolean; orden: number }>) {
  const { data } = await axiosClient.patch(`/responsables/${id}`, dto);
  return data;
}

export async function eliminarResponsable(id: number) {
  const { data } = await axiosClient.delete(`/responsables/${id}`);
  return data;
}
