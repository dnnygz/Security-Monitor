import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Link, RotateCcw, XCircle } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { getApiError } from '../services/api';
import { getRecordings, markRecordingReview } from '../services/recordingsService';
import type { Recording } from '../types';
import { formatDate } from '../utils/format';

export function RecordingsPage() {
  const [rows, setRows] = useState<Recording[]>([]);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecordings()
      .then(setRows)
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(recording: Recording, estado_revision: 'REVISADO' | 'DESCARTADO') {
    setActionError('');
    const previous = rows;
    setRows((current) => current.map((item) => (item.id === recording.id ? { ...item, estado_revision } : item)));

    try {
      await markRecordingReview(recording.id, estado_revision);
    } catch (err) {
      setRows(previous);
      setActionError(getApiError(err));
    }
  }

  const activeRows = useMemo(() => rows.filter((row) => row.estado_revision !== 'DESCARTADO'), [rows]);
  const discardedRows = useMemo(() => rows.filter((row) => row.estado_revision === 'DESCARTADO'), [rows]);

  const columns = [
    { key: 'camara', header: 'Cámara', render: (row: Recording) => row.camara || `Cámara ${row.id}` },
    { key: 'zona', header: 'Zona', render: (row: Recording) => row.zona || 'Sin zona' },
    { key: 'fecha', header: 'Fecha', render: (row: Recording) => formatDate(row.fecha) },
    {
      key: 'ruta',
      header: 'Ruta',
      render: (row: Recording) =>
        row.ruta_enlace || row.url_archivo ? (
          <span className="path-cell">
            <Link size={15} />
            {row.ruta_enlace || row.url_archivo}
          </span>
        ) : (
          'Sin ruta'
        ),
    },
    {
      key: 'sospechoso',
      header: 'Sospechoso',
      render: (row: Recording) => (
        <StatusBadge tone={row.es_sospechoso ? 'danger' : 'success'}>{row.es_sospechoso ? 'Sí' : 'No'}</StatusBadge>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (row: Recording) => <StatusBadge tone="neutral">{row.estado_revision || 'PENDIENTE'}</StatusBadge>,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row: Recording) => (
        <div className="row-actions">
          <button title="Marcar como revisado" onClick={() => updateStatus(row, 'REVISADO')}>
            <CheckCircle2 size={17} />
          </button>
          <button title="Descartar grabación" onClick={() => updateStatus(row, 'DESCARTADO')}>
            <XCircle size={17} />
          </button>
          {row.estado_revision === 'DESCARTADO' && (
            <button title="Restaurar a revisado" onClick={() => updateStatus(row, 'REVISADO')}>
              <RotateCcw size={17} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Evidencia</span>
          <h1>Grabaciones</h1>
          <p>Revisión de clips asociados a cámaras, zonas y señales de sospecha.</p>
        </div>
      </header>

      <GlassCard>
        {loading && <EmptyState title="Cargando grabaciones" message="Consultando /api/grabaciones." />}
        {!loading && error && <EmptyState title="No se pudieron cargar grabaciones" message={error} />}
        {!loading && actionError && <EmptyState title="No se pudo actualizar la revisión" message={actionError} />}
        {!loading && !error && rows.length === 0 && <EmptyState title="Sin grabaciones" message="No hay evidencia registrada." />}
        {!loading && !error && activeRows.length > 0 && <DataTable rows={activeRows} columns={columns} />}
      </GlassCard>

      {!loading && !error && discardedRows.length > 0 && (
        <GlassCard>
          <div className="card-heading">
            <div>
              <span className="eyebrow">Archivo</span>
              <h2>Grabaciones descartadas</h2>
            </div>
            <StatusBadge tone="warning">{discardedRows.length} descartadas</StatusBadge>
          </div>
          <DataTable rows={discardedRows} columns={columns} />
        </GlassCard>
      )}
    </div>
  );
}
