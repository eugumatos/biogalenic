import { COMPETENCIES } from "./domain";

export function competencyAverage(e: Record<string, unknown> | null | undefined) {
  if (!e) return null;
  const vals = COMPETENCIES.map((c) => e[c.key]).filter((v): v is number => typeof v === "number");
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
}
