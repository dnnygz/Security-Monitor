import { api, unwrapData } from './api';
import type { DashboardKpis } from '../types';

export async function getDashboard() {
  const { data } = await api.get('/api/dashboard');
  return unwrapData<DashboardKpis>(data, { eventos: 0, alertas: 0, grabaciones: 0 });
}
