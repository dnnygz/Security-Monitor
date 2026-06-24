import { api, unwrapData } from './api';
import type { RecordingAnalysis } from '../types';

export async function getRecordingAnalysis() {
  const { data } = await api.get('/api/grabaciones-analisis');
  return unwrapData<RecordingAnalysis[]>(data, []);
}
