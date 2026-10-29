export type Direction = "mayor_mejor" | "menor_mejor";
export type Measurement = { period_start: string; value: number };

export type KpiStatus = "en_meta" | "fuera_de_meta" | "sin_meta" | "sin_dato";
export type KpiTrend = "mejora" | "empeora" | "estable" | "sin_tendencia";

export const KPI_STATUS_LABEL: Record<KpiStatus, string> = {
  en_meta: "En meta",
  fuera_de_meta: "Fuera de meta",
  sin_meta: "Sin meta aprobada",
  sin_dato: "Sin dato",
};
export const KPI_TREND_LABEL: Record<KpiTrend, string> = {
  mejora: "Mejora",
  empeora: "Empeora",
  estable: "Estable",
  sin_tendencia: "Sin tendencia",
};

export function sortMeasurements(ms: Measurement[]) {
  return [...ms].map((m) => ({ ...m, value: Number(m.value) })).sort((a, b) => a.period_start.localeCompare(b.period_start));
}

/** Estado frente a la meta. Sin meta aprobada no se califica: nunca se asume una referencia. */
export function kpiStatus(ms: Measurement[], target: number | null, targetApproved: boolean, direction: Direction): KpiStatus {
  const sorted = sortMeasurements(ms);
  const last = sorted.at(-1);
  if (!last) return "sin_dato";
  if (target == null || !targetApproved) return "sin_meta";
  const ok = direction === "mayor_mejor" ? last.value >= target : last.value <= target;
  return ok ? "en_meta" : "fuera_de_meta";
}

/** Tendencia: último valor frente al anterior, según la dirección deseada. */
export function kpiTrend(ms: Measurement[], direction: Direction): KpiTrend {
  const sorted = sortMeasurements(ms);
  if (sorted.length < 2) return "sin_tendencia";
  const [prev, last] = sorted.slice(-2);
  if (last.value === prev.value) return "estable";
  const up = last.value > prev.value;
  return (direction === "mayor_mejor") === up ? "mejora" : "empeora";
}
