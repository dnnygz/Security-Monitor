import { useEffect, useMemo, useState } from 'react';
import { Bot, Camera, FileText, ShieldAlert } from 'lucide-react';
import { BarChart, DonutChart, LineChart } from '../components/Charts';
import { EmptyState } from '../components/EmptyState';
import { GlassCard } from '../components/GlassCard';
import { KpiCard } from '../components/KpiCard';
import { StatusBadge } from '../components/StatusBadge';
import { getApiError } from '../services/api';
import { getReports } from '../services/reportsService';
import type { Report } from '../types';
import { confidence, formatDate, formatDuration } from '../utils/format';

function countBy<T>(rows: T[], getKey: (row: T) => string) {
  return Object.entries(
    rows.reduce<Record<string, number>>((acc, row) => {
      const key = getKey(row) || 'N/D';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
  ).map(([label, value]) => ({ label, value }));
}

function byDay(rows: Report[]) {
  return Object.entries(
    rows.reduce<Record<string, number>>((acc, row) => {
      const date = row.fecha ? new Date(row.fecha) : null;
      const key = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }) : 'N/D';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
  ).map(([label, value]) => ({ label, value }));
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
      riesgo: countBy(rows, (row) => row.nivel_riesgo || 'N/D'),
      zonas: countBy(rows, (row) => row.zona || 'N/D').slice(0, 6),
      comportamiento: countBy(rows, (row) => row.comportamiento || 'SIN IA').slice(0, 6),
      tendencia: byDay([...rows].reverse()),
    }),
    [rows],
  );

  const sospechosas = rows.filter((row) => row.es_sospechoso).length;
  const alertas = rows.filter((row) => row.genera_alerta).length;
  const conIa = rows.filter((row) => row.descripcion_ia).length;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Inteligencia operativa</span>
          <h1>Reportes</h1>
          <p>Resumen de eventos, riesgo, evidencia y análisis IA en una sola vista.</p>
        </div>
      </header>

      {loading && <EmptyState title="Cargando reportes" message="Consultando /api/reportes." />}
      {!loading && error && <EmptyState title="No se pudieron cargar reportes" message={error} />}
      {!loading && !error && rows.length === 0 && <EmptyState title="Sin reportes" message="Aún no hay reportes consolidados." />}

      {!loading && !error && rows.length > 0 && (
        <>
          <section className="kpi-grid">
            <KpiCard title="Reportes" value={rows.length} helper="Casos consolidados" icon={FileText} tone="blue" />
            <KpiCard title="Alertas" value={alertas} helper="Riesgo con alerta" icon={ShieldAlert} tone="green" />
            <KpiCard title="Con IA" value={conIa} helper="Grabaciones analizadas" icon={Bot} tone="aqua" />
          </section>

          <section className="charts-grid">
            <DonutChart title="Distribución por riesgo" data={charts.riesgo} />
            <BarChart title="Incidentes por zona" data={charts.zonas} />
            <LineChart title="Tendencia temporal" data={charts.tendencia} />
            <BarChart title="Comportamientos IA" data={charts.comportamiento} />
          </section>

          <GlassCard>
            <div className="card-heading">
              <div>
                <span className="eyebrow">Análisis IA</span>
                <h2>Lectura visual de sujetos</h2>
              </div>
              <StatusBadge tone="danger">{sospechosas} sospechosas</StatusBadge>
            </div>

            <div className="analysis-grid">
              {rows
                .filter((row) => row.descripcion_ia)
                .map((row) => (
                  <article className="analysis-card" key={row.id}>
                    <div className="analysis-card__top">
                      <Camera size={19} />
                      <strong>{row.camara || 'Cámara sin nombre'}</strong>
                      <StatusBadge tone={row.es_sospechoso ? 'danger' : 'success'}>{row.es_sospechoso ? 'Sospechoso' : 'Normal'}</StatusBadge>
                    </div>
                    <p>{row.descripcion_ia}</p>
                    <div className="analysis-meta">
                      <span>{row.zona}</span>
                      <span>{row.genero || 'N/D'}</span>
                      <span>{row.edad ? `${row.edad} años` : 'Edad N/D'}</span>
                      <span>{confidence(row.nivel_confianza ?? undefined)}</span>
                    </div>
                    <small>
                      {formatDate(row.fecha)} · {formatDuration(row.duracion_segundos)}
                    </small>
                  </article>
                ))}
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
