import { useEffect, useState } from 'react';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { getApiError } from '../services/api';
import { getRecordingAnalysis } from '../services/analysisService';
import type { RecordingAnalysis } from '../types';
import { confidence } from '../utils/format';

export function AiAnalysisPage() {
  const [rows, setRows] = useState<RecordingAnalysis[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecordingAnalysis()
      .then(setRows)
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">IA simulada</span>
          <h1>Análisis de grabaciones</h1>
          <p>Resultados de clasificación visual: género, comportamiento y nivel de confianza.</p>
        </div>
      </header>

      <GlassCard>
        {loading && <EmptyState title="Cargando análisis" message="Consultando /api/grabaciones-analisis." />}
        {!loading && error && <EmptyState title="Endpoint no disponible" message={error} />}
        {!loading && !error && rows.length === 0 && <EmptyState title="Sin análisis" message="No hay análisis de grabaciones registrados." />}
        {!loading && !error && rows.length > 0 && (
          <DataTable
            rows={rows}
            columns={[
              { key: 'grabacion', header: 'Grabación', render: (row) => row.id_grabacion || row.id || 'N/D' },
              { key: 'zona', header: 'Zona', render: (row) => row.zona || 'N/D' },
              { key: 'descripcion', header: 'Descripción visual', render: (row) => row.descripcion || 'Sin descripción' },
              { key: 'genero', header: 'Género', render: (row) => row.genero || 'N/D' },
              { key: 'comportamiento', header: 'Comportamiento', render: (row) => row.comportamiento || 'N/D' },
              {
                key: 'confianza',
                header: 'Confianza',
                render: (row) => <StatusBadge tone="success">{confidence(row.nivel_confianza ?? row.confianza)}</StatusBadge>,
              },
            ]}
          />
        )}
      </GlassCard>
    </div>
  );
}
