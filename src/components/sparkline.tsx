export function Sparkline({ values, target, width = 96, height = 28 }: { values: number[]; target?: number | null; width?: number; height?: number }) {
  if (values.length < 2) return <span className="text-xs text-muted">—</span>;
  const all = target != null ? [...values, target] : values;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const x = (i: number) => 2 + (i / (values.length - 1)) * (width - 4);
  const y = (v: number) => height - 3 - ((v - min) / span) * (height - 6);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Serie: ${values.join(", ")}`}>
      {target != null && <line x1={0} x2={width} y1={y(target)} y2={y(target)} stroke="var(--color-muted)" strokeDasharray="2 3" strokeWidth={1} />}
      <path d={d} fill="none" stroke="var(--color-saline)" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(values.at(-1)!)} r={2.5} fill="var(--color-navy)" />
    </svg>
  );
}
