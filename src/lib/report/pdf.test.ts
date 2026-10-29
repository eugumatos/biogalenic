import { describe, expect, it } from "vitest";
import { pdfSafe } from "./pdf";

describe("pdfSafe", () => {
  it("reemplaza símbolos fuera de WinAnsi y conserva acentos", () => {
    expect(pdfSafe("OEE ≥ 65% → meta — Índice ñ")).toBe("OEE >= 65% -> meta — Índice ñ");
    expect(pdfSafe({ a: ["Σ x", "日本"], m: new Map([["k", "✓"]]) })).toEqual({ a: ["suma x", ""], m: new Map([["k", "Sí"]]) });
  });
});
