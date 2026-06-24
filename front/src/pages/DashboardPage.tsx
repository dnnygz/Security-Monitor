import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Camera, RadioTower } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { GlassCard } from '../components/GlassCard';
import { KpiCard } from '../components/KpiCard';
import { StatusBadge } from '../components/StatusBadge';
import { getApiError } from '../services/api';
import { getDashboard } from '../services/dashboardService';
import { getRecordings } from '../services/recordingsService';
import type { DashboardKpis, Recording } from '../types';
import { formatDate } from '../utils/format';

export function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKpis>({ eventos: 0, alertas: 0, grabaciones: 0 });
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [dashboardData, recordingData] = await Promise.all([
          getDashboard(),
          getRecordings().catch(() => []),
        ]);

        if (!active) return;
        setKpis(dashboardData);
        setRecordings(recordingData.slice(0, 5));
        setLastUpdate(new Date());
        setError('');
      } catch (err) {
        if (active) setError(getApiError(err));
      }
    }

    load();
    const interval = window.setInterval(load, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const activity = useMemo(
    () =>
      recordings.map((recording) => ({
        id: recording.id,
        title: recording.es_sospechoso ? 'Grabación sospechosa detectada' : 'Grabación registrada',
        meta: `${recording.zona || 'Zona no asignada'} · ${formatDate(recording.fecha)}`,
        tone: recording.es_sospechoso ? 'danger' : 'info',
      })),
    [recordings],
  );

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Centro de monitoreo</span>
          <h1>Dashboard principal</h1>
          <p>Lectura operativa de eventos, alertas y evidencia registrada por la plataforma.</p>
        </div>
        <div className="live-pill">
          <span />
          Actualizado {lastUpdate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </header>

      {error && <EmptyState title="No se pudo cargar el dashboard" message={error} />}

      <section className="kpi-grid">
        <KpiCard title="Eventos" value={kpis.eventos} helper="Señales procesadas" icon={Activity} tone="blue" />
        <KpiCard title="Alertas" value={kpis.alertas} helper="Riesgo con alerta" icon={AlertTriangle} tone="green" />
        <KpiCard title="Grabaciones" value={kpis.grabaciones} helper="Evidencia disponible" icon={Camera} tone="aqua" />
      </section>

      <section className="dashboard-grid">
        <GlassCard>
          <div className="card-heading">
            <div>
              <span className="eyebrow">Actividad reciente</span>
              <h2>Flujo de monitoreo</h2>
            </div>
            <RadioTower size={22} />
          </div>

          {activity.length === 0 ? (
            <EmptyState title="Sin actividad reciente" message="Cuando existan grabaciones, aparecerán en este panel." />
          ) : (
            <div className="activity-list">
              {activity.map((item) => (
                <article key={item.id} className="activity-item">
                  <span className="activity-dot" />
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.meta}</small>
                  </div>
                  <StatusBadge tone={item.tone as 'danger' | 'info'}>{item.tone === 'danger' ? 'Prioridad' : 'Info'}</StatusBadge>
                </article>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard className="monitor-card">
          <div className="monitor-orbit">
            <span />
          </div>
          <h2>Estado del sistema</h2>
          <p>API conectada mediante `VITE_API_URL`. Polling del dashboard activo cada 30 segundos.</p>
          <div className="health-grid">
            <StatusBadge tone="success">API REST</StatusBadge>
            <StatusBadge tone="info">Nginx ready</StatusBadge>
            <StatusBadge tone="neutral">SPA routing</StatusBadge>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
