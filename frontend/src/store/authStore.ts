import { create } from 'zustand';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: 'DIGITADOR' | 'ADMIN' | 'AUDITOR';
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  usuario: Usuario | null;
  setSesion: (data: { accessToken: string; refreshToken: string; usuario: Usuario }) => void;
  setAccessToken: (token: string) => void;
  limpiarSesion: () => void;
}

// NOTA: el diseño original del Módulo 1 planteaba refresh_token en
// cookie httpOnly — pero el backend real que construimos devuelve
// refresh_token en el body del JSON de /auth/login (no lo pone en una
// cookie), así que el cliente SÍ necesita guardarlo para poder mandarlo
// de vuelta en /auth/refresh. Queda en memoria (no localStorage) para
// no exponerlo a XSS más de lo necesario, aceptable para nivel tesis.
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  usuario: null,
  setSesion: ({ accessToken, refreshToken, usuario }) =>
    set({ accessToken, refreshToken, usuario }),
  setAccessToken: (accessToken) => set({ accessToken }),
  limpiarSesion: () => set({ accessToken: null, refreshToken: null, usuario: null }),
}));
