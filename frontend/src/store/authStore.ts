import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

// Persistido en sessionStorage (no localStorage): sobrevive a un F5 o a
// recargar la página, pero se borra automáticamente al cerrar la pestaña
// del navegador — buen balance entre comodidad al probar y no dejar la
// sesión viva indefinidamente en el disco.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      usuario: null,
      setSesion: ({ accessToken, refreshToken, usuario }) =>
        set({ accessToken, refreshToken, usuario }),
      setAccessToken: (accessToken) => set({ accessToken }),
      limpiarSesion: () => set({ accessToken: null, refreshToken: null, usuario: null }),
    }),
    {
      name: 'sigma-auth',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
