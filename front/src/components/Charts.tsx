type ChartDatum = {
  label: string;
  value: number;
};

const colors = ['#2b8fe7', '#26b99a', '#18a8b8', '#df5b61', '#d49a28', '#7b8fe8'];

export function BarChart({ data, title }: { data: ChartDatum[]; title: string }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <div className="bar-chart">
        {data.map((item, index) => (
          <div className="bar-row" key={item.label}>
            <span>{item.label}</span>
            <div className="bar-track">
              <div style={{ width: `${(item.value / max) * 100}%`, background: colors[index % colors.length] }} />
            </div>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({ data, title }: { data: ChartDatum[]; title: string }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulative = 0;
  const gradient = total
    ? data
        .map((item, index) => {
          const start = (cumulative / total) * 100;
          cumulative += item.value;
          const end = (cumulative / total) * 100;
          return `${colors[index % colors.length]} ${start}% ${end}%`;
        })
        .join(', ')
    : '#d9edf2 0% 100%';

  return (
    <div className="chart-card chart-card--donut">
      <h3>{title}</h3>
      <div className="donut" style={{ background: `conic-gradient(${gradient})` }}>
        <span>{total}</span>
      </div>
      <div className="legend-list">
        {data.map((item, index) => (
          <span key={item.label}>
            <i style={{ background: colors[index % colors.length] }} />
            {item.label}: {item.value}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LineChart({ data, title }: { data: ChartDatum[]; title: string }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const width = 420;
  const height = 170;
  const points = data.map((item, index) => {
    const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
    const y = height - (item.value / max) * (height - 28) - 14;
    return { ...item, x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img">
        <path d={path} fill="none" stroke="#2b8fe7" strokeWidth="5" strokeLinecap="round" />
        {points.map((point) => (
          <g key={`${point.label}-${point.x}`}>
            <circle cx={point.x} cy={point.y} r="6" fill="#26b99a" />
            <text x={point.x} y={height - 2} textAnchor="middle">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
