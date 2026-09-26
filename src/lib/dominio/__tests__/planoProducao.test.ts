import { describe, expect, it } from "vitest";
import { progressoDoPlano, resumoDoPlano, validarItemPlano, type ItemPlano } from "../planoProducao";

const item = (id: string, receitaId: string, quantidade: number): ItemPlano => ({
  id, data: "2026-09-26", receitaId, quantidade, observacao: null, responsavel: "Gil", podeMexer: true, criadoEm: `2026-09-26T1${id}:00:00Z`,
});

describe("progressoDoPlano", () => {
  const plano = [item("1", "molho", 4), item("2", "massa", 2), item("3", "pao", 10)];
  const producoes = [
    { receitaId: "molho", quantidade: 2, status: "produzido" as const },
    { receitaId: "molho", quantidade: 2, status: "perda" as const },
    { receitaId: "massa", quantidade: 2, status: "em_producao" as const },
    { receitaId: "pao", quantidade: 6, status: "produzido" as const },
    { receitaId: "pao", quantidade: 5, status: "produzido" as const },
  ];

  it("soma o feito e o que está no fogo; perda não conta", () => {
    const p = progressoDoPlano(plano, producoes);
    const molho = p.find((x) => x.item.receitaId === "molho")!;
    expect(molho).toMatchObject({ feito: 2, emProducao: 0, falta: 2, estado: "falta" });
    expect(p.find((x) => x.item.receitaId === "massa")).toMatchObject({ emProducao: 2, falta: 0, estado: "em_producao" });
    expect(p.find((x) => x.item.receitaId === "pao")).toMatchObject({ feito: 11, falta: 0, estado: "feito" });
  });

  it("o que falta primeiro, depois no fogo, depois feito", () => {
    expect(progressoDoPlano(plano, producoes).map((x) => x.estado)).toEqual(["falta", "em_producao", "feito"]);
  });

  it("resumo", () => {
    expect(resumoDoPlano(progressoDoPlano(plano, producoes))).toEqual({ total: 3, feitos: 1, faltam: 1 });
  });

  it("valida o item", () => {
    expect(validarItemPlano({ receitaId: "", quantidade: 1 })).toBe("Escolha a ficha.");
    expect(validarItemPlano({ receitaId: "x", quantidade: 0 })).toBe("Informe quanto produzir.");
    expect(validarItemPlano({ receitaId: "x", quantidade: 2, observacao: "a".repeat(141) })).toMatch(/140/);
    expect(validarItemPlano({ receitaId: "x", quantidade: 2 })).toBeNull();
  });
});
