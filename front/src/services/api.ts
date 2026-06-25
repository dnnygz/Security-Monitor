import axios, { AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

//  INTERCEPTOR: Inyecta el JWT en cada petición saliente automáticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (token) {
      // Agrega la cabecera exactamente como la espera tu middleware 'verificarToken'
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export function getApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.message || error.response?.data?.error || error.message;
  }

  if (error instanceof Error) return error.message;
  return 'No se pudo completar la solicitud.';
}

export function unwrapData<T>(payload: unknown, fallback: T): T {
  if (Array.isArray(payload)) return payload as T;
  if (payload && typeof payload === 'object') {
    const objectPayload = payload as Record<string, unknown>;
    if ('data' in objectPayload) return objectPayload.data as T;
    if ('kpis' in objectPayload) return objectPayload.kpis as T;
  }
  return fallback;
}
