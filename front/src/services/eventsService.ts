import { api, unwrapData } from './api';
import type { SensorEvent } from '../types';

export async function getSensorEvents() {
  const { data } = await api.get('/api/sensores/eventos');
  return unwrapData<SensorEvent[]>(data, []);
}
