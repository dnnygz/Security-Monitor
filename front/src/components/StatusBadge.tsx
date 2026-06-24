type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
};

export function StatusBadge({ children, tone = 'neutral' }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}
