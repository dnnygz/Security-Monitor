import { AlertCircle } from 'lucide-react';

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="empty-state">
      <AlertCircle size={22} />
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}
