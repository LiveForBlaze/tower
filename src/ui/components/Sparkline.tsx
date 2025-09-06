type Props = {
  data: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  smooth?: boolean;
  min?: number;
  max?: number;
  label?: string;
};

export default function Sparkline({
  data,
  width = 220,
  height = 52,
  strokeWidth = 2,
  smooth = true,
  min,
  max,
  label,
}: Props) {
  const n = data.length;
  if (n === 0) return <div style={{ width, height }} />;

  const _min = min ?? Math.min(...data);
  const _max = max ?? Math.max(...data);
  const range = _max - _min || 1;

  const points = data.map((v, i) => {
    const x = (i / (n - 1)) * (width - 8) + 4;
    const y = height - 6 - ((v - _min) / range) * (height - 12);
    return { x, y };
  });

  const d = points
    .map((p, i, arr) => {
      if (!smooth || i === 0) return `M ${p.x} ${p.y}`;
      const p0 = arr[i - 1];
      const mx = (p0.x + p.x) / 2;
      return `Q ${p0.x},${p0.y} ${mx},${(p0.y + p.y) / 2} T ${p.x},${p.y}`;
    })
    .join(" ");

  const area =
    `M 4 ${height - 6} ` +
    points.map((p) => `L ${p.x} ${p.y}`).join(" ") +
    ` L ${points[n - 1].x} ${height - 6} Z`;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkGrad)" />
      <path d={d} fill="none" stroke="white" strokeWidth={strokeWidth} />
      {label && (
        <text x={8} y={16} fill="#e5e7eb" fontSize="12" fontFamily="sans-serif">
          {label}
        </text>
      )}
    </svg>
  );
}
