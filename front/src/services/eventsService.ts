import { api, unwrapData } from './api';
import type { SensorEvent } from '../types';

export async function getSensorEvents() {
  const { data } = await api.get('/api/eventos-sensor');
  return unwrapData<SensorEvent[]>(data, []);
}
