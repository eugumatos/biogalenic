"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const NAVY = "#14284b";
const SALINE = "#4f7fae";
const RULE = "#d3d9e2";
const MUTED = "#5a6578";

const tooltipStyle = {
  contentStyle: { borderRadius: 4, border: `1px solid ${RULE}`, fontSize: 12, fontFamily: "var(--font-sans)" },
  labelStyle: { color: NAVY, fontWeight: 600 },
};

/**
 * Radar en escala 1–5. Las dimensiones sin dato no se dibujan como cero: se rotulan "s/d" (sin dato),
 * sin punto, y el área solo se traza cuando hay al menos tres dimensiones con dato.
 */
export function ScoreRadar({
  data,
  height = 300,
  seriesLabel = "Puntuación",
  compareLabel,
}: {
  data: { label: string; value: number | null; compare?: number | null }[];
  height?: number;
  seriesLabel?: string;
  compareLabel?: string;
}) {
  const rows = data.map((d) => ({
    label: d.value == null ? `${d.label} (s/d)` : d.label,
    value: d.value ?? 0,
    compare: d.compare ?? 0,
    hasValue: d.value != null,
    hasCompare: d.compare != null,
  }));
  const nValue = rows.filter((r) => r.hasValue).length;
  const nCompare = rows.filter((r) => r.hasCompare).length;
  const dotFor = (key: "hasValue" | "hasCompare", color: string) =>
    function Dot(props: { cx?: number; cy?: number; index?: number }) {
      const { cx, cy, index } = props;
      if (index == null || !rows[index]?.[key] || cx == null || cy == null) return <g key={`${key}-${index}`} />;
      return <circle key={`${key}-${index}`} cx={cx} cy={cy} r={3} fill={color} />;
    };
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={rows} outerRadius="62%" margin={{ top: 8, right: 40, bottom: 8, left: 40 }}>
          <PolarGrid stroke={RULE} />
          <PolarAngleAxis dataKey="label" tick={{ fontSize: 11, fill: MUTED }} />
          <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 10, fill: MUTED }} angle={90} axisLine={false} />
          {compareLabel && (
            <Radar
              name={compareLabel}
              dataKey="compare"
              stroke={nCompare >= 3 ? SALINE : "none"}
              strokeDasharray="4 3"
              fill="none"
              strokeWidth={1.5}
              dot={dotFor("hasCompare", SALINE)}
              isAnimationActive={false}
            />
          )}
          <Radar
            name={seriesLabel}
            dataKey="value"
            stroke={nValue >= 3 ? NAVY : "none"}
            fill={NAVY}
            fillOpacity={nValue >= 3 ? 0.14 : 0}
            strokeWidth={2}
            dot={dotFor("hasValue", NAVY)}
            isAnimationActive={false}
          />
          <Tooltip {...tooltipStyle} formatter={(v, _n, item) => ((item.payload as { hasValue: boolean }).hasValue || v ? v : "sin dato")} />
        </RadarChart>
      </ResponsiveContainer>
      {nValue < 3 && (
        <p className="text-xs text-muted">El área del radar se traza cuando hay al menos tres dimensiones con dato; mientras tanto se muestran solo los puntos. “s/d”: sin dato.</p>
      )}
    </div>
  );
}

function barColor(v: number | null) {
  if (v == null) return RULE;
  if (v <= 2) return "#a8322a";
  if (v < 3.5) return "#b8862c";
  return "#2f7a57";
}

/** Barras horizontales 1–5 por departamento, coloreadas por nivel. */
export function DepartmentBars({ data, height }: { data: { label: string; value: number | null; status: string }[]; height?: number }) {
  const rows = data.map((d) => ({ ...d, plotted: d.value ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(220, rows.length * 34)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={RULE} />
        <XAxis type="number" domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: MUTED }} />
        <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 12, fill: "#1a2233" }} />
        <ReferenceLine x={3} stroke={MUTED} strokeDasharray="3 3" />
        <Tooltip
          {...tooltipStyle}
          formatter={(_, __, item) => {
            const p = item.payload as { value: number | null; status: string };
            return [p.value == null ? "sin dato" : p.value, p.status];
          }}
        />
        <Bar dataKey="plotted" radius={[0, 3, 3, 0]} barSize={16} isAnimationActive={false}>
          {rows.map((r, i) => (
            <Cell key={i} fill={barColor(r.value)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
