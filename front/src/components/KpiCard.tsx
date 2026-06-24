import type { LucideIcon } from 'lucide-react';

type KpiCardProps = {
  title: string;
  value: number;
  helper: string;
  icon: LucideIcon;
  tone: 'blue' | 'green' | 'aqua';
};

export function KpiCard({ title, value, helper, icon: Icon, tone }: KpiCardProps) {
  return (
    <article className={`kpi-card kpi-card--${tone}`}>
      <div className="kpi-card__icon">
        <Icon size={24} />
      </div>
      <div>
        <span>{title}</span>
        <strong>{value.toLocaleString('es-PE')}</strong>
        <small>{helper}</small>
      </div>
    </article>
  );
}
