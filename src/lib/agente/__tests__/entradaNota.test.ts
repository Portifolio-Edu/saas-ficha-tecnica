import { describe, expect, it } from "vitest";
import { converter, montarEntrada, unidadeCanonica } from "../entradaNota";
import type { Insumo } from "@/lib/dominio/insumo";

const insumo = (id: string, nome: string, unidadeMedida: Insumo["unidadeMedida"], precoUnitario: number, pesoPorUnidade: number | null = null) =>
  ({ id, nome, categoria: "outro", unidadeMedida, tamanhoEmbalagem: 1, precoEmbalagem: precoUnitario, precoUnitario, fatorCorrecao: 1, pesoPorUnidade, localArmazenamentoId: null, estoque: null }) as Insumo;

const cadastro = [
  insumo("tom", "Tomate Italiano", "kg", 6),
  insumo("ceb", "Cebola Branca", "kg", 4),
  insumo("leite", "Leite Integral", "l", 5),
  insumo("ovo", "Ovo", "un", 0.8, 0.05),
];

describe("unidades", () => {
  it("entende as unidades da nota", () => {
    expect(unidadeCanonica("KG")).toBe("kg");
    expect(unidadeCanonica("Lt")).toBe("l");
    expect(unidadeCanonica("UND")).toBe("un");
    expect(unidadeCanonica("CX")).toBeNull();
  });
  it("converte", () => {
    expect(converter(500, "g", "kg", null)).toBe(0.5);
    expect(converter(2, "l", "ml", null)).toBe(2000);
    expect(converter(1, "kg", "l", null)).toBeNull();
    expect(converter(30, "un", "kg", 0.05)).toBe(1.5);
  });
});

describe("entrada da nota", () => {
  it("casa pelo nome, converte e calcula o preço novo", () => {
    const { entrada, pendentes } = montarEntrada(
      [
        { descricao: "TOMATE ITALIANO KG", quantidade: 12.5, unidade: "KG", valorTotal: 86.25 },
        { descricao: "LEITE INTEGRAL 1L", quantidade: 12000, unidade: "ML", valorTotal: 60 },
        { descricao: "OVOS BRANCOS CX 30", quantidade: 2, unidade: "CX", valorTotal: 40, insumoId: "ovo" },
        { descricao: "ALFACE CRESPA", quantidade: 3, unidade: "UN" },
      ],
      cadastro,
    );
    expect(entrada).toEqual([
      { descricao: "TOMATE ITALIANO KG", insumoId: "tom", insumoNome: "Tomate Italiano", quantidade: 12.5, unidade: "kg", precoUnitarioAtual: 6, precoUnitarioNovo: 6.9 },
      { descricao: "LEITE INTEGRAL 1L", insumoId: "leite", insumoNome: "Leite Integral", quantidade: 12, unidade: "l", precoUnitarioAtual: 5, precoUnitarioNovo: 5 },
    ]);
    expect(pendentes.map((p) => p.descricao)).toEqual(["OVOS BRANCOS CX 30", "ALFACE CRESPA"]);
    expect(pendentes[0].motivo).toMatch(/converter "CX"/);
    expect(pendentes[1].motivo).toMatch(/Não achei/);
  });
});
