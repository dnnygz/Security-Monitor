import { api } from './api';
import type { User } from '../types';

type LoginResponse = {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
};

export async function login(correo: string, contrasena: string) {
  const { data } = await api.post<LoginResponse>('/api/auth/tokens', { correo, contrasena });

  if (!data.success || !data.user) {
    throw new Error(data.message || 'Credenciales inválidas');
  }

  localStorage.setItem('token', data.token);

  return {
    user: data.user,
    token: data.token,
  };
}
