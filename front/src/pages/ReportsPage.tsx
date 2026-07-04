import { useEffect, useMemo, useState } from 'react';
import { BarChart, DonutChart } from '../components/Charts';
import { EmptyState } from '../components/EmptyState';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { getApiError } from '../services/api';
import { getReports } from '../services/reportsService';
import type { Report } from '../types';
import { formatDate, formatDuration } from '../utils/format';
import { boolish, reviewLabel, reviewTone } from '../utils/risk';

function countBy<T>(rows: T[], getKey: (row: T) => string) {
  return Object.entries(
    rows.reduce<Record<string, number>>((acc, row) => {
      const key = getKey(row) || 'N/D';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function hourBucket(row: Report) {
  const date = row.fecha ? new Date(row.fecha) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Sin hora';
  return `${date.getHours().toString().padStart(2, '0')}:00`;
}

export function ReportsPage() {
  const [rows, setRows] = useState<Report[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReports()
      .then(setRows)
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const charts = useMemo(
    () => ({
      risk: countBy(rows, (row) => row.nivel_riesgo || 'N/D'),
      zones: countBy(rows, (row) => row.zona || 'Sin zona').slice(0, 6),
      hours: countBy(rows, hourBucket).slice(0, 6),
      decisions: countBy(rows, (row) => reviewLabel(row.estado_revision, row.es_sospechoso)),
    }),
    [rows],
  );

  const latest = rows.slice(0, 6);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Reportes</span>
          <h1>Evidencia operativa</h1>
          <p>Resumen medible de incidentes por zona, hora, riesgo y estado de validación.</p>
        </div>
      </header>

      {loading && <EmptyState title="Cargando reportes" message="Consultando /api/reportes." />}
      {!loading && error && <EmptyState title="No se pudieron cargar reportes" message={error} />}
      {!loading && !error && rows.length === 0 && <EmptyState title="Sin reportes" message="Aún no hay reportes consolidados." />}

      {!loading && !error && rows.length > 0 && (
        <>
          <section className="report-grid">
            <DonutChart title="Distribución por riesgo" data={charts.risk} />
            <BarChart title="Zonas con más incidentes" data={charts.zones} />
            <BarChart title="Horas de mayor actividad" data={charts.hours} />
            <BarChart title="Estado de validación" data={charts.decisions} />
          </section>

          <GlassCard>
            <div className="card-heading">
              <div>
                <span className="eyebrow">Auditoría</span>
                <h2>Últimos incidentes consolidados</h2>
              </div>
              <StatusBadge tone="neutral">{rows.length} casos</StatusBadge>
            </div>
            <div className="report-table">
              <div className="report-table__head">
                <span>Zona</span>
                <span>Riesgo</span>
                <span>Duración</span>
                <span>Validación</span>
                <span>Fecha</span>
              </div>
              {latest.map((row) => (
                <div className="report-table__row" key={row.id}>
                  <strong>{row.zona || 'Sin zona'}</strong>
                  <StatusBadge tone={boolish(row.es_sospechoso) || row.nivel_riesgo === 'ALTO' ? 'danger' : row.nivel_riesgo === 'MEDIO' ? 'warning' : 'success'}>
                    {row.nivel_riesgo || 'N/D'}
                  </StatusBadge>
                  <span>{formatDuration(row.duracion_segundos)}</span>
                  <StatusBadge tone={reviewTone(row.estado_revision)}>{reviewLabel(row.estado_revision, row.es_sospechoso)}</StatusBadge>
                  <span>{formatDate(row.fecha)}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
