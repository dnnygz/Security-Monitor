type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function GlassCard({ children, className = '' }: GlassCardProps) {
  return <section className={`glass-card ${className}`}>{children}</section>;
}
