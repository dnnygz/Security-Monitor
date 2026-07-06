import { api } from './api';
import type { CatalogItem } from '../types';

export type CreateUserPayload = {
  nombre: string;
  correo: string;
  contrasena: string;
  id_rol: number | string;
  id_tienda?: number | string | null;
};

export async function createGlobalUser(payload: CreateUserPayload) {
  const { data } = await api.post('/api/admin/usuarios', payload);
  return data;
}

export async function getRoles() {
  const { data } = await api.get('/api/roles');
  return (data.data || []) as CatalogItem[];
}

export async function getStores() {
  const { data } = await api.get('/api/tiendas');
  return (data.data || []) as CatalogItem[];
}
