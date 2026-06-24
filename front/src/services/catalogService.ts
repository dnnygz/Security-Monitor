import { api, unwrapData } from './api';
import type { CatalogItem } from '../types';

const catalogEndpoints = [
  { key: 'usuarios', label: 'Usuarios', path: '/api/usuarios' },
  { key: 'sensores', label: 'Sensores', path: '/api/sensores' },
  { key: 'camaras', label: 'Cámaras', path: '/api/camaras' },
  { key: 'zonas', label: 'Zonas', path: '/api/zonas' },
  { key: 'tiendas', label: 'Tiendas', path: '/api/tiendas' },
  { key: 'riesgos', label: 'Riesgos', path: '/api/riesgos' },
];

export async function getCatalogs() {
  const results = await Promise.allSettled(
    catalogEndpoints.map(async (catalog) => {
      const { data } = await api.get(catalog.path);
      return { ...catalog, rows: unwrapData<CatalogItem[]>(data, []) };
    }),
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') return result.value;
    return { ...catalogEndpoints[index], rows: [], unavailable: true };
  });
}
