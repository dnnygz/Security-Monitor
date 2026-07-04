import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit, MapPinned, Repeat2 } from 'lucide-react';
import { BarChart } from '../components/Charts';
import { EmptyState } from '../components/EmptyState';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { getApiError } from '../services/api';
import { getReports } from '../services/reportsService';
import type { Report } from '../types';
import { confidence, formatDate } from '../utils/format';
import { riskTone } from '../utils/risk';

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

export function AiAnalysisPage() {
  const [rows, setRows] = useState<Report[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReports()
      .then(setRows)
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const withAi = rows.filter((row) => row.descripcion_ia);
  const patterns = useMemo(() => countBy(withAi, (row) => row.comportamiento || 'Sin patrón'), [withAi]);
  const zones = useMemo(() => countBy(withAi, (row) => row.zona || 'Sin zona').slice(0, 5), [withAi]);
  const topZone = zones[0]?.label || 'Sin zona dominante';
  const topPattern = patterns[0]?.label || 'Sin patrón dominante';

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Inteligencia</span>
          <h1>Señales que suben la prioridad</h1>
          <p>Explica por qué la IA marcó un evento y qué acción preventiva conviene revisar.</p>
        </div>
      </header>

      {loading && <EmptyState title="Cargando inteligencia" message="Leyendo señales IA asociadas a incidentes." />}
      {!loading && error && <EmptyState title="Endpoint no disponible" message={error} />}
      {!loading && !error && withAi.length === 0 && <EmptyState title="Sin explicaciones IA" message="Aún no hay incidentes con análisis visual asociado." />}

      {!loading && !error && withAi.length > 0 && (
        <>
          <section className="prevention-grid">
            <article>
              <BrainCircuit size={22} />
              <div>
                <strong>{topPattern}</strong>
                <span>Patrón más recurrente</span>
              </div>
            </article>
            <article>
              <MapPinned size={22} />
              <div>
                <strong>{topZone}</strong>
                <span>Zona que conviene vigilar</span>
              </div>
            </article>
            <article>
              <Repeat2 size={22} />
              <div>
                <strong>{patterns.filter((item) => item.value > 1).length}</strong>
                <span>Patrones repetidos</span>
              </div>
            </article>
          </section>

          <section className="charts-grid">
            <BarChart title="Patrones detectados" data={patterns} />
            <BarChart title="Zonas con señales IA" data={zones} />
          </section>

          <GlassCard>
            <div className="card-heading">
              <div>
                <span className="eyebrow">Explicaciones</span>
                <h2>Click para abrir la grabación</h2>
              </div>
              <StatusBadge tone="info">Capa IA</StatusBadge>
            </div>
            <div className="analysis-grid">
              {withAi.map((row) => (
                <Link className="analysis-card analysis-card--decision analysis-link" key={row.id} to={row.id_grabacion ? `/grabaciones/${row.id_grabacion}` : '/grabaciones'}>
                  <div className="analysis-card__top">
                    <BrainCircuit size={19} />
                    <strong>{row.zona || 'Zona no asignada'}</strong>
                    <StatusBadge tone={riskTone(row.nivel_riesgo, row.es_sospechoso)}>{row.comportamiento || 'Patrón N/D'}</StatusBadge>
                  </div>
                  <p>{row.descripcion_ia}</p>
                  <div className="analysis-meta">
                    <span>{row.camara || 'Cámara N/D'}</span>
                    <span>{confidence(row.nivel_confianza ?? undefined)}</span>
                    <span>{formatDate(row.fecha)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
