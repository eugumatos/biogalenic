import type { AssessmentStatus } from "./domain";

export type ScoreInput = {
  code: string;
  name: string;
  weight: number; // porcentaje, Σ = 100
  status: AssessmentStatus | null;
  proposed_score: number | null;
  approved_score: number | null;
};

export type ScoreLine = ScoreInput & {
  score: number | null;
  weighted: number | null; // score × peso (peso como fracción)
  counted: boolean;
};

export type ScoreSummary = {
  lines: ScoreLine[];
  /** Suma ponderada solo de las dimensiones evaluadas. */
  weightedSum: number;
  /** Peso cubierto por dimensiones evaluadas (0–100). */
  coverage: number;
  /** Puntuación global sobre la escala 1–5, re-normalizada al peso cubierto. Null si no hay datos. */
  overall: number | null;
  incomplete: string[];
};

/**
 * Puntuación ponderada = puntuación × peso. Global = Σ ponderadas / Σ pesos evaluados.
 * Las dimensiones sin evaluar NO cuentan como cero: se excluyen y se informa la cobertura.
 *
 * mode "aprobado": solo puntuaciones aprobadas por el MD.
 * mode "preliminar": aprobadas + propuestas enviadas o en borrador.
 */
export function computeScore(inputs: ScoreInput[], mode: "aprobado" | "preliminar" = "aprobado"): ScoreSummary {
  const lines: ScoreLine[] = inputs.map((d) => {
    const score =
      d.status === "aprobado"
        ? d.approved_score
        : mode === "preliminar"
          ? d.proposed_score
          : null;
    const counted = score != null;
    return { ...d, score, counted, weighted: counted ? round(score * (d.weight / 100), 4) : null };
  });

  const counted = lines.filter((l) => l.counted);
  const weightedSum = round(counted.reduce((s, l) => s + (l.weighted ?? 0), 0), 4);
  const coverage = round(counted.reduce((s, l) => s + l.weight, 0), 2);
  const overall = coverage > 0 ? round(weightedSum / (coverage / 100), 2) : null;

  return {
    lines,
    weightedSum,
    coverage,
    overall,
    incomplete: lines.filter((l) => !l.counted).map((l) => l.name),
  };
}

export function completion(inputs: { status: AssessmentStatus | null }[]) {
  const total = inputs.length;
  const approved = inputs.filter((i) => i.status === "aprobado").length;
  const submitted = inputs.filter((i) => i.status === "enviado").length;
  const started = inputs.filter((i) => i.status != null).length;
  return {
    total,
    approved,
    submitted,
    started,
    pctApproved: total ? Math.round((approved / total) * 100) : 0,
  };
}

export function round(n: number, d = 2) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
