import { axiosClient } from './axiosClient';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    nombre: string;
    email: string;
    rol: 'DIGITADOR' | 'ADMIN' | 'AUDITOR';
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await axiosClient.post<LoginResponse>('/auth/login', { email, password });
  return data;
}
