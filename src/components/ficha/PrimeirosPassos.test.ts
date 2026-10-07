import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { PrimeirosPassos, passosDoRestaurante } from "./PrimeirosPassos";
import { insumos, todasReceitas, producoes, fechamentos } from "@/app/preview/fixtures";

describe("início da operação", () => {
  it("orienta uma conta vazia e mantém os links dentro da prévia", () => {
    const html = renderToStaticMarkup(createElement(PrimeirosPassos, { basePath: "/preview", insumos: [], receitas: [], producoes: [], fechamentos: [] }));
    expect(html).toContain("0 de 5 etapas");
    expect(html).toContain('href="/preview/insumos"');
    expect(html).toContain('href="/preview/cmv"');
  });
  it("não trata uma ficha incompleta como pronta nem estoque zerado como ausente", () => {
    const receita = todasReceitas.find(r => r.tipo === "prato_final")!;
    const dados = { insumos: [{ ...insumos[0], estoque: { saldoAtual: 0, estoqueMinimo: 0 } }], receitas: [{ ...receita, fotoUrl: null }], producoes: [], fechamentos: [] };
    expect(passosDoRestaurante(dados).map(p => p.pronto)).toEqual([true, false, true, false, false]);
  });
  it("retira o guia quando a operação já completou as etapas", () => {
    const receita = todasReceitas.find(r => r.tipo === "prato_final" && r.ficha.length > 0)!;
    const props = { basePath: "", insumos, receitas: [{ ...receita, fotoUrl: "https://exemplo.com/prato.jpg", modoPreparo: "Preparar", rendimento: 1 }], producoes, fechamentos };
    expect(renderToStaticMarkup(createElement(PrimeirosPassos, props))).toBe("");
  });
});
