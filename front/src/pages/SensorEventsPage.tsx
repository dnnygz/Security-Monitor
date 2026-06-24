import { useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { getApiError } from '../services/api';
import { getSensorEvents } from '../services/eventsService';
import type { SensorEvent } from '../types';
import { formatDate, formatDuration } from '../utils/format';

export function SensorEventsPage() {
  const [rows, setRows] = useState<SensorEvent[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSensorEvents()
      .then(setRows)
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Sensores</span>
          <h1>Eventos de sensores</h1>
          <p>Listado operativo de señales por tipo, zona, fecha y duración.</p>
        </div>
      </header>

      <GlassCard>
        {loading && <EmptyState title="Cargando eventos" message="Consultando /api/eventos-sensor." />}
        {!loading && error && <EmptyState title="Endpoint no disponible" message={error} />}
        {!loading && !error && rows.length === 0 && <EmptyState title="Sin eventos" message="No hay eventos registrados." />}
        {!loading && !error && rows.length > 0 && (
          <DataTable
            rows={rows}
            columns={[
              { key: 'tipo', header: 'Tipo', render: (row) => <StatusBadge tone="info">{row.tipo_evento || row.tipo || 'N/D'}</StatusBadge> },
              { key: 'zona', header: 'Zona', render: (row) => row.zona || row.nombre_zona || 'Sin zona' },
              { key: 'fecha', header: 'Fecha', render: (row) => formatDate(row.fecha) },
              { key: 'duracion', header: 'Duración', render: (row) => formatDuration(row.duracion_segundos) },
            ]}
          />
        )}
      </GlassCard>
    </div>
  );
}
