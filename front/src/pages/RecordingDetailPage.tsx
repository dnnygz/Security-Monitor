import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Link, PlayCircle, RotateCcw, XCircle } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { getApiError } from '../services/api';
import { getRecordings, markRecordingReview } from '../services/recordingsService';
import type { Recording } from '../types';
import { formatDate } from '../utils/format';
import { boolish, reviewLabel, reviewTone } from '../utils/risk';
import { imageForRecording } from './RecordingsPage';

export function RecordingDetailPage() {
  const { id } = useParams();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecordings()
      .then((rows) => setRecording(rows.find((row) => String(row.id) === String(id)) || null))
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }, [id]);

  async function updateStatus(estado_revision: 'PENDIENTE' | 'REVISADO' | 'DESCARTADO') {
    if (!recording) return;
    const previous = recording;
    setActionError('');
    setRecording({ ...recording, estado_revision });

    try {
      await markRecordingReview(recording.id, estado_revision);
    } catch (err) {
      setRecording(previous);
      setActionError(getApiError(err));
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Detalle de grabación</span>
          <h1>{recording?.zona || 'Revisión ampliada'}</h1>
          <p>Vista ampliada del clip seleccionado para observar la evidencia con más detenimiento.</p>
        </div>
        <RouterLink className="secondary-button compact-button" to="/grabaciones">
          <ArrowLeft size={16} />
          Volver
        </RouterLink>
      </header>

      {loading && <EmptyState title="Cargando grabación" message="Consultando evidencia visual." />}
      {!loading && error && <EmptyState title="No se pudo cargar la grabación" message={error} />}
      {!loading && actionError && <EmptyState title="No se pudo actualizar la revisión" message={actionError} />}
      {!loading && !error && !recording && <EmptyState title="Grabación no encontrada" message="El clip solicitado no existe en la base local." />}

      {!loading && !error && recording && (
        <GlassCard className="recording-detail-card">
          <div className="video-mock video-mock--photo video-mock--large" style={{ backgroundImage: `linear-gradient(180deg, rgba(5, 34, 49, 0.04), rgba(5, 34, 49, 0.72)), url("${imageForRecording(recording)}")` }}>
            <div className="video-mock__hud">
              <span>Simulación CCTV</span>
              <span>{recording.zona || 'Zona N/D'}</span>
            </div>
            <span className="risk-box risk-box--photo" />
            <div className="video-mock__caption">
              <PlayCircle size={18} />
              {recording.ruta_enlace || recording.url_archivo || `clip-${recording.id}.mp4`}
            </div>
          </div>

          <aside className="recording-detail-panel">
            <span className="eyebrow">Información del clip</span>
            <h2>Clip #{recording.id}</h2>
            <div className="analysis-meta">
              <StatusBadge tone={boolish(recording.es_sospechoso) ? 'danger' : 'warning'}>
                {boolish(recording.es_sospechoso) ? 'Sospechoso IA' : 'Por revisar'}
              </StatusBadge>
              <StatusBadge tone={reviewTone(recording.estado_revision)}>{reviewLabel(recording.estado_revision, recording.es_sospechoso)}</StatusBadge>
            </div>
            <div className="review-actions">
              <button className="primary-button compact-button" onClick={() => updateStatus('REVISADO')}>
                <CheckCircle2 size={16} />
                Marcar sospechoso
              </button>
              <button className="secondary-button compact-button" onClick={() => updateStatus('DESCARTADO')}>
                <XCircle size={16} />
                Falso positivo
              </button>
              {String(recording.estado_revision || 'PENDIENTE').toUpperCase() !== 'PENDIENTE' && (
                <button className="ghost-button compact-button" onClick={() => updateStatus('PENDIENTE')}>
                  <RotateCcw size={16} />
                  Reabrir
                </button>
              )}
            </div>
            <dl className="detail-list">
              <div>
                <dt>Cámara</dt>
                <dd>{recording.camara || `Cámara ${recording.id}`}</dd>
              </div>
              <div>
                <dt>Zona</dt>
                <dd>{recording.zona || 'Sin zona'}</dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>{formatDate(recording.fecha)}</dd>
              </div>
              <div>
                <dt>Ruta</dt>
                <dd>
                  <Link size={14} />
                  {recording.ruta_enlace || recording.url_archivo || 'Ruta no registrada'}
                </dd>
              </div>
            </dl>
          </aside>
        </GlassCard>
      )}
    </div>
  );
}
