import { describe, expect, it } from "vitest";
import { periodoAberto } from "../CmvEstoqueView";

describe("período em aberto do estoquista", () => {
  it("começa no dia seguinte ao último fechamento, seja qual for a ordem da lista", () => {
    expect(periodoAberto([{ periodoFim: "2026-08-31" }, { periodoFim: "2026-09-15" }], "2026-10-03")).toEqual({ inicio: "2026-09-16", fim: "2026-10-03" });
  });

  it("vira o mês e o ano", () => {
    expect(periodoAberto([{ periodoFim: "2026-09-30" }], "2026-10-03").inicio).toBe("2026-10-01");
    expect(periodoAberto([{ periodoFim: "2026-12-31" }], "2027-01-05").inicio).toBe("2027-01-01");
  });

  it("sem fechamento, começa no dia 1º do mês", () => {
    expect(periodoAberto([], "2026-10-03")).toEqual({ inicio: "2026-10-01", fim: "2026-10-03" });
  });

  it("fechamento que vai até hoje (ou depois) não gera período invertido", () => {
    expect(periodoAberto([{ periodoFim: "2026-10-03" }], "2026-10-03")).toEqual({ inicio: "2026-10-03", fim: "2026-10-03" });
  });
});
