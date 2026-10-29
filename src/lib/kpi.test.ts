import { describe, expect, it } from "vitest";
import { kpiStatus, kpiTrend } from "./kpi";

const ms = [
  { period_start: "2026-09-01", value: 70 },
  { period_start: "2026-10-01", value: 65 },
];

describe("kpi", () => {
  it("no califica sin meta aprobada", () => {
    expect(kpiStatus(ms, 80, false, "mayor_mejor")).toBe("sin_meta");
    expect(kpiStatus([], 80, true, "mayor_mejor")).toBe("sin_dato");
  });
  it("evalúa contra la meta según la dirección", () => {
    expect(kpiStatus(ms, 60, true, "mayor_mejor")).toBe("en_meta");
    expect(kpiStatus(ms, 60, true, "menor_mejor")).toBe("fuera_de_meta");
  });
  it("calcula tendencia según la dirección", () => {
    expect(kpiTrend(ms, "mayor_mejor")).toBe("empeora");
    expect(kpiTrend(ms, "menor_mejor")).toBe("mejora");
    expect(kpiTrend(ms.slice(0, 1), "mayor_mejor")).toBe("sin_tendencia");
  });
});
