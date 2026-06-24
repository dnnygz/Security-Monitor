import { api, unwrapData } from './api';
import type { Recording } from '../types';

export async function getRecordings() {
  const { data } = await api.get('/api/grabaciones');
  return unwrapData<Recording[]>(data, []);
}

export async function markRecordingReview(id: number | string, estado_revision: 'REVISADO' | 'DESCARTADO') {
  const { data } = await api.patch(`/api/grabaciones/${id}`, { estado_revision });
  return data;
}
