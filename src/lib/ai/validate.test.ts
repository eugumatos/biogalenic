import { describe, expect, it } from "vitest";
import { validateAnalysis } from "./validate";
import type { Analysis } from "./schema";

const empty = { situacion_general: "", hallazgos_clave: [], fortalezas: [], debilidades: [], asuntos_criticos: [] };

function base(): Analysis {
  return {
    diagnostico: {
      ...empty,
      hallazgos_clave: [
        { tipo: "hecho_verificado", texto: "OEE cayó", fuentes: ["kpi:abc"] },
        { tipo: "hecho_verificado", texto: "EBITDA de 4 M", fuentes: [] },
        { tipo: "hecho_verificado", texto: "Inventado", fuentes: ["kpi:no-existe"] },
      ],
    },
    stars: { principal: "turnaround", secundarios: [], evidencia_a_favor: [], evidencia_en_contra: [], confianza: "baja", justificacion: "", implicaciones_estrategicas: [] },
    causas_raiz: { problemas_recurrentes: [], relaciones: [], problemas_estructurales: [] },
    recomendaciones: { prioridades: [], quick_wins: [], mediano_plazo: [], largo_plazo: [] },
    soporte_decision: { decisiones_md: [], decisiones_delegables: [], asignacion_recursos: [], alineacion_organizacional: [] },
    recomendaciones_por_dimension: [],
    evidencia_requerida: [],
  };
}

describe("validateAnalysis", () => {
  it("degrada hechos sin fuentes válidas", () => {
    const { analysis, report } = validateAnalysis(base(), new Set(["kpi:abc"]), []);
    const h = analysis.diagnostico.hallazgos_clave;
    expect(h[0].tipo).toBe("hecho_verificado");
    expect(h[1].tipo).toBe("interpretacion");
    expect(h[2].tipo).toBe("interpretacion");
    expect(h[2].fuentes).toEqual([]);
    expect(report.downgraded).toBe(2);
  });

  it("agrega riesgos escalados omitidos a asuntos críticos", () => {
    const { analysis } = validateAnalysis(base(), new Set(), [
      { id: "r1", description: "Falla en validación de autoclave", score: 10, category: "Aseguramiento de esterilidad" },
    ]);
    expect(analysis.diagnostico.asuntos_criticos[0].fuentes).toEqual(["riesgo:r1"]);
  });
});
