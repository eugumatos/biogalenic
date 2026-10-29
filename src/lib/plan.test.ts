import { describe, expect, it } from "vitest";
import { cycleDay, isOverdue, phaseProgress } from "./plan";

describe("plan", () => {
  it("cuenta días desde el inicio", () => {
    expect(cycleDay("2026-10-01", "2026-10-01")).toBe(1);
    expect(cycleDay("2026-10-01", "2026-10-31")).toBe(31);
  });
  it("detecta vencidas sin contar completadas ni canceladas", () => {
    expect(isOverdue({ status: "en_curso", deadline: "2026-10-01", progress: 10 }, "2026-10-02")).toBe(true);
    expect(isOverdue({ status: "completada", deadline: "2026-10-01", progress: 100 }, "2026-10-02")).toBe(false);
    expect(isOverdue({ status: "pendiente", deadline: null, progress: 0 }, "2026-10-02")).toBe(false);
  });
  it("promedia avance excluyendo canceladas", () => {
    expect(phaseProgress([])).toBeNull();
    expect(phaseProgress([{ status: "en_curso", deadline: null, progress: 50 }, { status: "cancelada", deadline: null, progress: 0 }, { status: "completada", deadline: null, progress: 100 }])).toBe(75);
  });
});
