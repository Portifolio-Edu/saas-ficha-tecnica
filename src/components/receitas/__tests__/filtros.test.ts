import { describe, expect, it } from "vitest";
import { filtrarReceitas } from "../filtros";

const lista = [
  { receita: { nomePrato: "Risoto de Camarão", categoria: "Pratos quentes", margemAlvo: 0.72 }, margemPct: 70.8 },
  { receita: { nomePrato: "Pizza", categoria: "Pizzas", margemAlvo: null }, margemPct: 70.8 },
  { receita: { nomePrato: "Salada", categoria: null, margemAlvo: 0.65 }, margemPct: 65 },
];
const filtros = { busca: "", categoria: "", abaixoDoAlvo: false, margemAlvoCliente: 0.65 };

describe("localização de receitas", () => {
  it("busca sem acentos e por categoria", () => {
    expect(filtrarReceitas(lista, { ...filtros, busca: " CAMARAO " })).toEqual([lista[0]]);
    expect(filtrarReceitas(lista, { ...filtros, busca: "quentes" })).toEqual([lista[0]]);
  });
  it("usa a meta individual e não considera igualdade como margem baixa", () => {
    expect(filtrarReceitas(lista, { ...filtros, abaixoDoAlvo: true })).toEqual([lista[0]]);
  });
  it("combina filtros e permite recuperar a lista inteira ao limpar", () => {
    expect(filtrarReceitas(lista, { ...filtros, categoria: "Pizzas", abaixoDoAlvo: true })).toEqual([]);
    expect(filtrarReceitas(lista, { ...filtros, categoria: "Sem categoria" })).toEqual([lista[2]]);
    expect(filtrarReceitas(lista, filtros)).toEqual(lista);
  });
});
