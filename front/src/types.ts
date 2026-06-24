export type User = {
  id: number | string;
  nombre: string;
  correo?: string;
  id_rol?: number | string;
};

export type DashboardKpis = {
  eventos: number;
  alertas: number;
  grabaciones: number;
};

export type SensorEvent = {
  id?: number | string;
  tipo_evento?: string;
  tipo?: string;
  zona?: string;
  nombre_zona?: string;
  fecha?: string;
  duracion_segundos?: number;
};

export type Recording = {
  id: number | string;
  fecha?: string;
  camara?: string;
  zona?: string;
  estado_revision?: string;
  es_sospechoso?: boolean | number;
  url_archivo?: string;
  ruta_enlace?: string;
};

export type RecordingAnalysis = {
  id?: number | string;
  id_grabacion?: number | string;
  descripcion?: string;
  genero?: string;
  edad?: number;
  comportamiento?: string;
  nivel_confianza?: number | string;
  confianza?: number | string;
  camara?: string;
  zona?: string;
  fecha_grabacion?: string;
};

export type Report = {
  id: number | string;
  fecha?: string;
  duracion_segundos?: number;
  tienda?: string;
  zona?: string;
  nivel_riesgo?: string;
  score?: number;
  activa_camara?: boolean | number;
  genera_alerta?: boolean | number;
  tipo_evento?: string;
  sensor?: string;
  tipo_sensor?: string;
  id_grabacion?: number | string | null;
  ruta_enlace?: string | null;
  estado_revision?: string | null;
  es_sospechoso?: boolean | number | null;
  camara?: string | null;
  descripcion_ia?: string | null;
  genero?: string | null;
  edad?: number | null;
  comportamiento?: string | null;
  nivel_confianza?: string | number | null;
};

export type CatalogItem = {
  id?: number | string;
  nombre?: string;
  modelo?: string;
  descripcion?: string;
  estado?: string;
  [key: string]: unknown;
};
