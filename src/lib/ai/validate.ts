import type { Analysis, Claim, ValidationReport } from "./schema";

type EscalatedRisk = { id: string; description: string; score: number; category: string };

/**
 * Controles posteriores a la respuesta del modelo:
 * 1. Un "hecho verificado" sin fuentes válidas del snapshot se degrada a "interpretación" y se reporta.
 * 2. Los riesgos escalados siempre aparecen en asuntos críticos, aunque el modelo los omita.
 */
export function validateAnalysis(
  input: Analysis,
  validIds: Set<string>,
  escalated: EscalatedRisk[],
): { analysis: Analysis; report: ValidationReport } {
  const analysis: Analysis = structuredClone(input);
  const report: ValidationReport = { unsupportedFacts: [], downgraded: 0 };

  const fix = (claims: { tipo: string; texto: string; fuentes: string[] }[], path: string) => {
    claims.forEach((c, i) => {
      const unknown = c.fuentes.filter((f) => !validIds.has(f));
      if (c.tipo === "hecho_verificado" && (c.fuentes.length === 0 || unknown.length === c.fuentes.length)) {
        report.unsupportedFacts.push({ path: `${path}[${i}]`, texto: c.texto, fuentes: c.fuentes });
        c.tipo = "interpretacion";
        report.downgraded++;
      }
      c.fuentes = c.fuentes.filter((f) => validIds.has(f));
    });
  };

  const walk = (node: unknown, path: string) => {
    if (Array.isArray(node)) {
      if (node.length && isClaimLike(node[0])) fix(node as Claim[], path);
      node.forEach((n, i) => walk(n, `${path}[${i}]`));
    } else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(analysis, "");

  const cited = new Set(analysis.diagnostico.asuntos_criticos.flatMap((c) => c.fuentes));
  for (const r of escalated) {
    const id = `riesgo:${r.id}`;
    if (!cited.has(id)) {
      analysis.diagnostico.asuntos_criticos.unshift({
        tipo: "hecho_verificado",
        texto: `Riesgo escalado (${r.category}, puntaje ${r.score}): ${r.description}`,
        fuentes: [id],
      });
    }
  }

  return { analysis, report };
}

function isClaimLike(x: unknown): x is { tipo: string; texto?: string; fuentes: string[] } {
  return !!x && typeof x === "object" && "tipo" in x && "fuentes" in x && Array.isArray((x as { fuentes: unknown }).fuentes);
}
