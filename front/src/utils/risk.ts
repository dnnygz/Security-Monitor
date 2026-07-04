import type { Recording, Report } from '../types';

export type RiskTone = 'danger' | 'warning' | 'success' | 'neutral' | 'info';

export function boolish(value: boolean | number | string | null | undefined) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

export function riskTone(level?: string | null, suspicious?: boolean | number | null): RiskTone {
  const normalized = String(level || '').toUpperCase();
  if (boolish(suspicious) || normalized === 'ALTO') return 'danger';
  if (normalized === 'MEDIO') return 'warning';
  if (normalized === 'BAJO') return 'success';
  return 'neutral';
}

export function reviewTone(status?: string | null): RiskTone {
  const normalized = String(status || 'PENDIENTE').toUpperCase();
  if (normalized === 'DESCARTADO') return 'success';
  if (normalized === 'REVISADO') return 'danger';
  return 'warning';
}

export function reviewLabel(status?: string | null, _suspicious?: boolean | number | null) {
  const normalized = String(status || 'PENDIENTE').toUpperCase();
  if (normalized === 'DESCARTADO') return 'Falso positivo';
  if (normalized === 'REVISADO') return 'Sospechoso';
  return 'Pendiente';
}

export function riskScore(row: Report | Recording) {
  const report = row as Report;
  let score = Number(report.score || 0);
  if (String(report.nivel_riesgo || '').toUpperCase() === 'ALTO') score += 35;
  if (String(report.nivel_riesgo || '').toUpperCase() === 'MEDIO') score += 18;
  if (boolish(report.genera_alerta)) score += 28;
  if (boolish(report.es_sospechoso)) score += 32;
  if (String(report.estado_revision || '').toUpperCase() === 'PENDIENTE') score += 12;
  return score;
}

export function sortByPriority<T extends Report | Recording>(rows: T[]) {
  return [...rows].sort((a, b) => riskScore(b) - riskScore(a));
}

export function incidentTitle(row: Report | Recording) {
  const report = row as Report;
  if (report.comportamiento && report.comportamiento !== 'NORMAL') return `Patrón ${String(report.comportamiento).toLowerCase()}`;
  if (report.tipo_evento) return `Evento ${String(report.tipo_evento).toLowerCase()}`;
  return boolish(report.es_sospechoso) ? 'Clip con sospecha visual' : 'Evento para validar';
}

export function incidentReason(row: Report | Recording) {
  const report = row as Report;
  const parts = [
    report.tipo_sensor || report.sensor ? `sensor ${report.tipo_sensor || report.sensor}` : null,
    report.camara ? `cámara ${report.camara}` : null,
    report.descripcion_ia ? 'IA encontró señales visuales' : null,
    boolish(report.genera_alerta) ? 'genera alerta' : null,
  ].filter(Boolean);

  return parts.length ? parts.join(' + ') : 'Evento consolidado pendiente de validación';
}
