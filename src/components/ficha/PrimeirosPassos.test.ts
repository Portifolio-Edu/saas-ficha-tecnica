import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { PrimeirosPassos, passosDoRestaurante } from "./PrimeirosPassos";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";
const insumos: Insumo[] = [{ id: "tomate", nome: "Tomate", categoria: "hortalica", unidadeMedida: "kg", tamanhoEmbalagem: 1, precoEmbalagem: 5, precoUnitario: 5, fatorCorrecao: 1, pesoPorUnidade: null, localArmazenamentoId: null, estoque: { saldoAtual: 1, estoqueMinimo: 0 } }];
const receita: Receita = { id: "molho", nomePrato: "Molho", tipo: "prato_final", categoria: null, precoVenda: 10, vendasMes: null, rendimento: 1, unidadeRendimento: "un", pesoPorcaoG: null, formaFisica: "solido", destinoVenda: "proprio", margemAlvo: null, modoPreparo: "Cozinhar", fotoUrl: "https://exemplo.com/prato.jpg", etapas: [], ficha: [{ id: "linha", insumoId: "tomate", subReceitaId: null, pesoLiquido: 0.2, unidade: "kg" }] };

describe("início da operação", () => {
  it("orienta uma conta vazia e mantém os links dentro da prévia", () => {
    const html = renderToStaticMarkup(createElement(PrimeirosPassos, { basePath: "/preview", insumos: [], receitas: [], producoes: [], fechamentos: [] }));
    expect(html).toContain("0 de 5 etapas");
    expect(html).toContain('href="/preview/insumos"');
    expect(html).toContain('href="/preview/cmv"');
  });
  it("não trata uma ficha incompleta como pronta nem estoque zerado como ausente", () => {
    const dados = { insumos: [{ ...insumos[0], estoque: { saldoAtual: 0, estoqueMinimo: 0 } }], receitas: [{ ...receita, fotoUrl: null }], producoes: [], fechamentos: [] };
    expect(passosDoRestaurante(dados).map(p => p.pronto)).toEqual([true, false, true, false, false]);
  });
  it("retira o guia quando a operação já completou as etapas", () => {
    const props = { basePath: "", insumos, receitas: [receita], producoes: [{}], fechamentos: [{}] };
    expect(renderToStaticMarkup(createElement(PrimeirosPassos, props))).toBe("");
  });
  it("aceita preparo organizado por etapas", () => {
    const dados = { insumos, receitas: [{ ...receita, modoPreparo: null, etapas: [{ id: "etapa", ordem: 1, texto: "Cozinhar", titulo: null, fotoUrl: null }] }], producoes: [], fechamentos: [] };
    expect(passosDoRestaurante(dados)[1].pronto).toBe(true);
  });
});
