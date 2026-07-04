import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Eye, PlayCircle } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { GlassCard } from '../components/GlassCard';
import { StatusBadge } from '../components/StatusBadge';
import { getApiError } from '../services/api';
import { getRecordings } from '../services/recordingsService';
import type { Recording } from '../types';
import { formatDate } from '../utils/format';
import { boolish, reviewLabel, reviewTone } from '../utils/risk';

export const cameraImages = [
  'https://safeguardsystems.co.uk/wp-content/uploads/2022/06/shop-and-retail-cctv-systems-730x487.jpg',
  'https://biz.service.ntt-east.co.jp/columns/files/camera_security_surveillance_image02.webp',
  'https://i.ytimg.com/vi/ddgV5wodzKc/hqdefault.jpg',
  'https://i.pinimg.com/736x/a6/71/c2/a671c2e9101fb04f24382583eabca6b8.jpg',
  'https://i.ytimg.com/vi/tAy0HTNxR3M/maxresdefault.jpg?sqp=-oaymwEmCIAKENAF8quKqQMa8AEB-AH-CYAC0AWKAgwIABABGGUgWyhTMA8=&rs=AOn4CLBiS7_RubdObfzTI-aM2p7ib5ezBQ',
  'https://i.pinimg.com/originals/f8/4a/b9/f84ab9a05c9c57aefd0ea10d33ac2504.jpg',
];

export function imageForRecording(recording?: Recording | null) {
  if (!recording) return cameraImages[0];
  return cameraImages[Number(recording.id) % cameraImages.length];
}

function queueLabel(recording: Recording) {
  return boolish(recording.es_sospechoso) ? 'Sospechoso IA' : 'Por revisar';
}

export function RecordingsPage() {
  const [rows, setRows] = useState<Recording[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecordings()
      .then((data) => {
        setRows(data);
        const firstPending = data.find((row) => String(row.estado_revision || 'PENDIENTE').toUpperCase() === 'PENDIENTE');
        if (!selectedId && firstPending) setSelectedId(String(firstPending.id));
      })
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  }, []);

  const pending = useMemo(() => rows.filter((row) => String(row.estado_revision || 'PENDIENTE').toUpperCase() === 'PENDIENTE'), [rows]);
  const reviewed = useMemo(() => rows.filter((row) => String(row.estado_revision || '').toUpperCase() !== 'PENDIENTE'), [rows]);
  const selected = selectedId ? rows.find((row) => String(row.id) === selectedId) || null : pending[0] || null;
  const selectedStatus = String(selected?.estado_revision || 'PENDIENTE').toUpperCase();
  const selectedIsPending = selectedStatus === 'PENDIENTE';

  function selectRecording(row: Recording) {
    setSelectedId(String(row.id));
  }

  function renderRecording(row: Recording, mode: 'queue' | 'history') {
    const active = selected && String(row.id) === String(selected.id);
    const label = mode === 'queue' ? queueLabel(row) : reviewLabel(row.estado_revision, row.es_sospechoso);
    const tone = mode === 'queue' ? (boolish(row.es_sospechoso) ? 'danger' : 'warning') : reviewTone(row.estado_revision);

    return (
      <button className={`recording-row ${active ? 'recording-row--active' : ''}`} key={row.id} onClick={() => selectRecording(row)}>
        <span className="recording-thumb">
          <PlayCircle size={24} />
          Clip #{row.id}
        </span>
        <span className="recording-row__body">
          <strong>{row.zona || 'Zona no asignada'}</strong>
          <small>{row.camara || `Cámara ${row.id}`} · {formatDate(row.fecha)}</small>
        </span>
        <StatusBadge tone={tone}>{label}</StatusBadge>
        <RouterLink className="recording-detail-link recording-detail-icon" to={`/grabaciones/${row.id}`} onClick={(event) => event.stopPropagation()} title="Ver detalle">
          <Eye size={18} />
        </RouterLink>
      </button>
    );
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Grabaciones</span>
          <h1>Evidencia visual</h1>
          <p>Abre el clip disparado por sensores y registra si fue sospecha real o falso positivo.</p>
        </div>
      </header>

      {loading && <EmptyState title="Cargando grabaciones" message="Consultando /api/grabaciones." />}
      {!loading && error && <EmptyState title="No se pudieron cargar grabaciones" message={error} />}

      {!loading && !error && (
        <section className="recording-workspace">
          {selected ? (
            <GlassCard className="video-review-card">
              <div className="video-mock video-mock--photo" style={{ backgroundImage: `linear-gradient(180deg, rgba(5, 34, 49, 0.08), rgba(5, 34, 49, 0.78)), url("${imageForRecording(selected)}")` }}>
                <div className="video-mock__hud">
                  <span>Simulación CCTV</span>
                  <span>{selected.zona || 'Zona N/D'}</span>
                </div>
                <span className="risk-box risk-box--photo" />
                <div className="video-mock__caption">
                  <PlayCircle size={18} />
                  {selected.ruta_enlace || selected.url_archivo || `clip-${selected.id}.mp4`}
                </div>
              </div>

              <div className="review-panel">
                <div>
                <span className="eyebrow">{selectedIsPending ? 'Decisión del operador' : 'Decisión registrada'}</span>
                <h2>{selected.zona || 'Grabación seleccionada'}</h2>
                <p>{selected.camara || `Cámara ${selected.id}`} · {formatDate(selected.fecha)}</p>
              </div>
              <div className="analysis-meta">
                  <StatusBadge tone={selectedIsPending ? (boolish(selected.es_sospechoso) ? 'danger' : 'warning') : reviewTone(selected.estado_revision)}>
                    {selectedIsPending ? queueLabel(selected) : reviewLabel(selected.estado_revision, selected.es_sospechoso)}
                  </StatusBadge>
                  {selectedIsPending && <StatusBadge tone="warning">Pendiente</StatusBadge>}
              </div>
                <RouterLink className="primary-button compact-button detail-button" to={`/grabaciones/${selected.id}`}>
                  <Eye size={16} />
                  Revisar
                </RouterLink>
              </div>
            </GlassCard>
          ) : (
            <GlassCard className="video-review-card video-review-card--empty">
              <EmptyState title="No hay más grabaciones pendientes" message="Todas las evidencias fueron marcadas como sospechosas o falso positivo." />
            </GlassCard>
          )}

          <div className="recording-queues">
            <GlassCard>
              <div className="card-heading">
                <div>
                  <span className="eyebrow">Cola</span>
                  <h2>Pendientes</h2>
                </div>
                <StatusBadge tone="warning">{pending.length} abiertos</StatusBadge>
              </div>
              {pending.length ? <div className="recording-list">{pending.map((row) => renderRecording(row, 'queue'))}</div> : <EmptyState title="Cola limpia" message="No hay clips pendientes de validación." />}
            </GlassCard>
          </div>

          <GlassCard className="recording-history-card">
            <div className="card-heading">
              <div>
                <span className="eyebrow">Historial</span>
                <h2>Decisiones registradas</h2>
              </div>
              <StatusBadge tone="info">{reviewed.length} cerrados</StatusBadge>
            </div>
            {reviewed.length ? <div className="recording-list recording-list--history">{reviewed.map((row) => renderRecording(row, 'history'))}</div> : <EmptyState title="Sin historial" message="Aún no se cerraron clips." />}
          </GlassCard>
        </section>
      )}
    </div>
  );
}
