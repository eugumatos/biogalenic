import type { EscalationCategory, Level4 } from "./domain";

/** Puntaje de riesgo = Probabilidad × Impacto (1–25). */
export function riskScore(probability: number, impact: number) {
  return probability * impact;
}

/** Criticidad por puntaje: 15–25 crítico, 10–14 alto, 5–9 medio, 1–4 bajo. */
export function riskCriticality(score: number): Level4 {
  if (score >= 15) return "critico";
  if (score >= 10) return "alto";
  if (score >= 5) return "medio";
  return "bajo";
}

/**
 * Escalamiento inmediato al MD: riesgos de calidad, paciente, esterilidad, integridad de datos,
 * SST o regulatorio con impacto ≥ 4 o puntaje ≥ 15. Igual que la columna generada `risks.escalated`.
 */
export function isEscalated(category: EscalationCategory | null, probability: number, impact: number) {
  return category != null && (impact >= 4 || probability * impact >= 15);
}

export const CRITICALITY_RULE = "Crítico 15–25 · Alto 10–14 · Medio 5–9 · Bajo 1–4";
export const ESCALATION_RULE =
  "Se escala de inmediato todo riesgo de calidad, seguridad del paciente, esterilidad, integridad de datos, seguridad ocupacional o regulatorio con impacto ≥ 4 o puntaje ≥ 15, independientemente del promedio del área.";
