import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const axiosClient = axios.create({ baseURL: API_URL });

// --- Adjunta el access_token en cada request ---
axiosClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// --- Si el access_token expiró (401), intenta renovarlo UNA vez y reintenta ---
let renovando: Promise<string> | null = null;

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    const { refreshToken, setAccessToken, limpiarSesion } = useAuthStore.getState();
    if (!refreshToken) {
      limpiarSesion();
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      // Si ya hay una renovación en curso (varios requests fallaron a la
      // vez), todos esperan la MISMA promesa en vez de disparar varios
      // /auth/refresh simultáneos.
      if (!renovando) {
        renovando = axios
          .post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken })
          .then((res) => {
            const nuevoToken = res.data.access_token as string;
            setAccessToken(nuevoToken);
            return nuevoToken;
          })
          .finally(() => {
            renovando = null;
          });
      }

      const nuevoToken = await renovando;
      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${nuevoToken}`;
      return axiosClient(original);
    } catch (refreshError) {
      limpiarSesion();
      return Promise.reject(refreshError);
    }
  },
);
