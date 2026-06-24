import { api, unwrapData } from './api';
import type { Report } from '../types';

export async function getReports() {
  const { data } = await api.get('/api/reportes');
  return unwrapData<Report[]>(data, []);
}
