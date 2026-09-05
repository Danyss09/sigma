import { axiosClient } from './axiosClient';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: 'DIGITADOR' | 'ADMIN' | 'AUDITOR';
  activo: boolean;
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const { data } = await axiosClient.get<Usuario[]>('/usuarios');
  return data;
}

export async function crearUsuario(dto: { nombre: string; email: string; password: string; rol: string }) {
  const { data } = await axiosClient.post('/usuarios', dto);
  return data;
}

export async function actualizarUsuario(id: number, dto: Partial<{ nombre: string; rol: string; activo: boolean }>) {
  const { data } = await axiosClient.patch(`/usuarios/${id}`, dto);
  return data;
}

export async function resetearPasswordUsuario(id: number, nuevaPassword: string) {
  const { data } = await axiosClient.post(`/usuarios/${id}/resetear-password`, { nuevaPassword });
  return data;
}

export async function cambiarMiPassword(passwordActual: string, passwordNueva: string) {
  const { data } = await axiosClient.post('/usuarios/mi-password', { passwordActual, passwordNueva });
  return data;
}

export interface VersionCatalogo {
  id: number;
  tipo_catalogo: string;
  nombre: string;
  version: string;
  estado: 'BORRADOR' | 'ACTIVO' | 'HISTORICO' | 'RECHAZADO';
  total_registros: number | null;
  vigencia_desde: string | null;
  vigencia_hasta: string | null;
  fecha_carga: string;
  observacion: string | null;
}

export async function listarVersionesCatalogo(): Promise<VersionCatalogo[]> {
  const { data } = await axiosClient.get<VersionCatalogo[]>('/catalogos/versiones');
  return data;
}

export async function activarVersionCatalogo(id: number) {
  const { data } = await axiosClient.post(`/catalogos/${id}/activar`);
  return data;
}

export async function desactivarVersionCatalogo(id: number) {
  const { data } = await axiosClient.post(`/catalogos/${id}/desactivar`);
  return data;
}
