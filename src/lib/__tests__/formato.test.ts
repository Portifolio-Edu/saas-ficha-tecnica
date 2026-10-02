import { describe, expect, it } from "vitest";
import { dataBR, horaBR, numeroBR } from "../formato";

// DESEMPENHO (2026-10-02): o formatador reaproveitado dá o mesmo texto que o
// toLocaleString que ele substituiu, em todos os formatos usados nas telas.
describe("formato pt-BR reaproveitado", () => {
  const d = new Date("2026-10-02T17:05:09Z");

  it("número igual ao toLocaleString", () => {
    for (const [v, o] of [
      [1234.5, undefined],
      [1234.5678, { maximumFractionDigits: 3 }],
      [0.15, { maximumFractionDigits: 3 }],
      [81.8, { minimumFractionDigits: 1, maximumFractionDigits: 1 }],
      [1999.9, { maximumFractionDigits: 0 }],
      [12.3, { style: "currency", currency: "BRL" }],
    ] as [number, Intl.NumberFormatOptions | undefined][]) {
      expect(numeroBR(v, o)).toBe(v.toLocaleString("pt-BR", o));
    }
  });

  it("data e hora iguais ao toLocale*String", () => {
    expect(dataBR(d)).toBe(d.toLocaleDateString("pt-BR"));
    expect(dataBR(d, { day: "2-digit", month: "2-digit" })).toBe(d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }));
    expect(dataBR(d, { month: "long", year: "numeric" })).toBe(d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));
    expect(dataBR(d.toISOString(), { weekday: "short", hour: "2-digit", minute: "2-digit" })).toBe(d.toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" }));
    expect(horaBR(d, { timeZone: "America/Sao_Paulo" })).toBe(d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }));
  });

  it("reaproveita: formatar muitos números não monta um formatador por número", () => {
    const t0 = performance.now();
    for (let i = 0; i < 5000; i++) numeroBR(i * 1.5, { maximumFractionDigits: 3 });
    expect(performance.now() - t0).toBeLessThan(100);
  });
});
