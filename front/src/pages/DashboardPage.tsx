import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock3, Eye, MapPin } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { getApiError } from '../services/api';
import { getReports } from '../services/reportsService';
import type { Report } from '../types';
import { formatDate, formatDuration } from '../utils/format';
import { boolish, incidentTitle, reviewLabel, reviewTone, riskTone, sortByPriority } from '../utils/risk';

export function DashboardPage() {
  const [rows, setRows] = useState<Report[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await getReports();
        if (!active) return;
        setRows(sortByPriority(data));
        setLastUpdate(new Date());
        setError('');
      } catch (err) {
        if (active) setError(getApiError(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    const interval = window.setInterval(load, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const pending = useMemo(() => rows.filter((row) => String(row.estado_revision || 'PENDIENTE').toUpperCase() === 'PENDIENTE'), [rows]);
  const latest = useMemo(() => rows.slice(0, 5), [rows]);
  const urgent = pending.filter((row) => riskTone(row.nivel_riesgo, row.es_sospechoso) === 'danger');
  const hotZone = useMemo(() => {
    const ranked = Object.entries(
      pending.reduce<Record<string, number>>((acc, row) => {
        const key = row.zona || 'Sin zona';
        acc[key] = (acc[key] || 0) + (riskTone(row.nivel_riesgo, row.es_sospechoso) === 'danger' ? 2 : 1);
        return acc;
      }, {}),
    ).sort((a, b) => b[1] - a[1]);
    return ranked[0]?.[0] || 'Sin pendientes';
  }, [pending]);

  return (
    <div className="page-stack">
      <header className="page-header command-header">
        <div>
          <span className="eyebrow">Centro de Riesgo</span>
          <h1>Incidentes pendientes</h1>
          <p>Cola de eventos que aún necesitan revisar evidencia y tomar una decisión.</p>
        </div>
        <div className="live-pill">
          <span />
          {lastUpdate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </header>

      {loading && <EmptyState title="Cargando riesgo operativo" message="Consolidando sensores, cámaras e IA." />}
      {!loading && error && <EmptyState title="No se pudo cargar el dashboard" message={error} />}

      {!loading && !error && (
        <>
          <section className="aero-metric-grid aero-metric-grid--hero">
            <article className="aero-metric aero-metric--danger">
              <AlertTriangle size={22} />
              <div>
                <strong>{urgent.length}</strong>
                <span>Riesgos críticos abiertos</span>
              </div>
            </article>
            <article className="aero-metric">
              <Clock3 size={22} />
              <div>
                <strong>{pending.length}</strong>
                <span>Incidentes en cola</span>
              </div>
            </article>
            <article className="aero-metric">
              <MapPin size={22} />
              <div>
                <strong className="text-fit">{hotZone}</strong>
                <span>Zona con mayor prioridad</span>
              </div>
            </article>
          </section>

          <section className="dashboard-command-grid">
            <GlassCard className="risk-feed-card">
              <div className="card-heading">
                <div>
                  <span className="eyebrow">Risk feed</span>
                  <h2>Revisar primero</h2>
                </div>
                <StatusBadge tone={urgent.length ? 'danger' : 'success'}>{urgent.length ? `${urgent.length} urgentes` : 'Cola estable'}</StatusBadge>
              </div>

              {pending.length === 0 ? (
                <EmptyState title="Sin pendientes" message="Los incidentes revisados o descartados aparecen en Grabaciones." />
              ) : (
                <div className="risk-feed">
                  {pending.map((row, index) => {
                    const tone = riskTone(row.nivel_riesgo, row.es_sospechoso);
                    return (
                      <article className={`incident-card incident-card--${tone}`} key={row.id}>
                        <div className="incident-rank">#{index + 1}</div>
                        <div className="incident-main">
                          <div className="incident-title-row">
                            <h3>{incidentTitle(row)}</h3>
                            <StatusBadge tone={tone}>{row.nivel_riesgo || (boolish(row.es_sospechoso) ? 'ALTO' : 'N/D')}</StatusBadge>
                            <StatusBadge tone="warning">Pendiente</StatusBadge>
                          </div>
                          <div className="incident-meta">
                            <span>{row.zona || 'Zona no asignada'}</span>
                            <span>{formatDate(row.fecha)}</span>
                            <span>{formatDuration(row.duracion_segundos)}</span>
                            <span>{row.camara || 'Cámara pendiente'}</span>
                          </div>
                        </div>
                        <div className="incident-actions">
                          <Link className="primary-button compact-button" to={row.id_grabacion ? `/grabaciones/${row.id_grabacion}` : '/grabaciones'}>
                            <Eye size={16} />
                            Revisar evidencia
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </section>

          <GlassCard>
            <div className="card-heading">
              <div>
                <span className="eyebrow">Auditoría</span>
                <h2>Últimos incidentes consolidados</h2>
              </div>
              <StatusBadge tone="neutral">{latest.length} casos</StatusBadge>
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
