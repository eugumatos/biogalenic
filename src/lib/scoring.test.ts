import { describe, expect, it } from "vitest";
import { computeScore, completion } from "./scoring";
import { isEscalated, riskCriticality, riskScore } from "./risk";

const base = [
  { code: "financiero", name: "Financiero", weight: 15 },
  { code: "comercial", name: "Comercial", weight: 10 },
  { code: "industrial", name: "Industrial", weight: 20 },
  { code: "calidad", name: "Calidad", weight: 20 },
  { code: "supply", name: "Supply", weight: 10 },
  { code: "personas", name: "Personas", weight: 10 },
  { code: "seguridad", name: "Seguridad", weight: 5 },
  { code: "estrategia", name: "Estrategia", weight: 10 },
];

describe("computeScore", () => {
  it("calcula la suma ponderada completa", () => {
    const inputs = base.map((d) => ({ ...d, status: "aprobado" as const, proposed_score: 3, approved_score: 3 }));
    const r = computeScore(inputs);
    expect(r.coverage).toBe(100);
    expect(r.weightedSum).toBe(3);
    expect(r.overall).toBe(3);
    expect(r.incomplete).toEqual([]);
  });

  it("no trata las dimensiones faltantes como cero", () => {
    const inputs = base.map((d) => ({
      ...d,
      status: d.code === "calidad" ? ("aprobado" as const) : null,
      proposed_score: null,
      approved_score: d.code === "calidad" ? 2 : null,
    }));
    const r = computeScore(inputs);
    expect(r.coverage).toBe(20);
    expect(r.weightedSum).toBe(0.4);
    expect(r.overall).toBe(2);
    expect(r.incomplete).toHaveLength(7);
  });

  it("excluye propuestas no aprobadas en modo aprobado y las incluye en preliminar", () => {
    const inputs = base.map((d, i) => ({
      ...d,
      status: i === 0 ? ("aprobado" as const) : ("enviado" as const),
      proposed_score: 4,
      approved_score: i === 0 ? 2 : null,
    }));
    expect(computeScore(inputs, "aprobado").coverage).toBe(15);
    expect(computeScore(inputs, "aprobado").overall).toBe(2);
    const pre = computeScore(inputs, "preliminar");
    expect(pre.coverage).toBe(100);
    expect(pre.overall).toBe(3.7);
  });

  it("devuelve null sin datos", () => {
    const r = computeScore(base.map((d) => ({ ...d, status: null, proposed_score: null, approved_score: null })));
    expect(r.overall).toBeNull();
  });

  it("cuenta el avance", () => {
    const c = completion([{ status: "aprobado" }, { status: "enviado" }, { status: null }, { status: "aprobado" }]);
    expect(c.pctApproved).toBe(50);
    expect(c.started).toBe(3);
  });
});

describe("riesgos", () => {
  it("calcula puntaje y criticidad", () => {
    expect(riskScore(3, 5)).toBe(15);
    expect(riskCriticality(15)).toBe("critico");
    expect(riskCriticality(12)).toBe("alto");
    expect(riskCriticality(6)).toBe("medio");
    expect(riskCriticality(4)).toBe("bajo");
  });

  it("escala riesgos farmacéuticos críticos aunque la probabilidad sea baja", () => {
    expect(isEscalated("esterilidad", 1, 5)).toBe(true);
    expect(isEscalated("integridad_datos", 2, 3)).toBe(false);
    expect(isEscalated(null, 5, 5)).toBe(false);
    expect(isEscalated("sst", 5, 3)).toBe(true);
  });
});
