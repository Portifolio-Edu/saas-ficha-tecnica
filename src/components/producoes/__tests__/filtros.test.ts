import { describe, expect, it } from "vitest";
import { filtrarLotes, SEM_TURNO } from "../filtros";
import type { Producao } from "@/lib/dominio/producao";

const base: Producao = { id: "1", lote: "RC-0610-01", tipo: "prato", receitaId: "risoto", nomeReceita: "Risoto de Camarão", unidadeRendimento: "porção", quantidade: 10, responsavel: "João", turnoId: "manha", nomeTurno: "Manhã", chefeTurno: "Ana", validade: "7 dias", status: "em_producao", motivoPerda: null, criadoEm: "2026-10-06T10:00:00Z" };
const lista = [base, { ...base, id: "2", lote: "RC-0610-02", turnoId: null, nomeTurno: null, responsavel: "Maria", status: "perda" as const, motivoPerda: "Queimou" }];
const filtros = { busca: "", turnoId: "", responsavel: "" };

describe("filtros do kanban da gestão", () => {
  it("localiza prato, código do lote e responsável sem exigir acentos", () => {
    expect(filtrarLotes(lista, { ...filtros, busca: "camarao" })).toEqual(lista);
    expect(filtrarLotes(lista, { ...filtros, busca: "0610-02" })).toEqual([lista[1]]);
    expect(filtrarLotes(lista, { ...filtros, busca: "joao" })).toEqual([base]);
  });
  it("combina turno e responsável, inclusive lotes sem turno", () => {
    expect(filtrarLotes(lista, { ...filtros, turnoId: "manha", responsavel: "Maria" })).toEqual([]);
    expect(filtrarLotes(lista, { ...filtros, turnoId: SEM_TURNO })).toEqual([lista[1]]);
  });
  it("limpar recupera inclusive as perdas, sem alterar os lotes originais", () => {
    const antes = structuredClone(lista);
    expect(filtrarLotes(lista, filtros)).toEqual(lista);
    expect(lista).toEqual(antes);
  });
});
