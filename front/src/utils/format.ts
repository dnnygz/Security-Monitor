export function formatDate(value?: string) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatDuration(seconds?: number) {
  if (seconds === undefined || seconds === null) return '0 s';
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes} min ${remaining} s`;
}

export function confidence(value?: number | string) {
  if (value === undefined || value === null) return 'N/D';
  if (typeof value === 'string') return value;
  const normalized = value <= 1 ? value * 100 : value;
  return `${Math.round(normalized)}%`;
}
