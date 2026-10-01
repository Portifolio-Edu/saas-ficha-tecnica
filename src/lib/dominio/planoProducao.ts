// LISTA DE PRODUÇÃO (2026-09-26): o que a cozinha deve produzir no dia.
// Gestão monta no painel/celular e a cozinha também adiciona no tablet
// (tabela plano_producao). O "feito" não é gravado: sai do que foi produzido
// no dia daquela receita (lotes em produção ou prontos; perda não conta).
// Tipos e contas puras, sem Supabase.
import type { StatusProducao } from "./producao";

export interface ItemPlano {
  id: string;
  data: string;
  receitaId: string;
  /** Na unidade de rendimento da ficha (kg, l, porções...). */
  quantidade: number;
  observacao: string | null;
  /** Quem pediu (nome de quem estava no tablet, ou do gestor). */
  responsavel: string | null;
  /** Quem está vendo pode mudar/tirar (gestão: tudo; cozinha: o que o tablet pediu). */
  podeMexer: boolean;
  criadoEm: string;
}

export type EstadoPlano = "falta" | "em_producao" | "feito";

export interface ProgressoPlano {
  item: ItemPlano;
  feito: number;
  emProducao: number;
  falta: number;
  estado: EstadoPlano;
}

const ORDEM: Record<EstadoPlano, number> = { falta: 0, em_producao: 1, feito: 2 };
const arred = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Quanto de cada item da lista já foi feito / está no fogo.
 * A produção de uma ficha abate os itens dessa ficha em ordem: primeiro a
 * data mais antiga (hoje antes de amanhã), depois quem entrou antes na lista.
 * Assim, duas linhas da mesma ficha não contam a mesma produção duas vezes, e
 * quem já adiantou hoje o que está na lista de amanhã vê o item sair de lá.
 * O que sobra depois de todos os itens fica no último (ex.: fez 11 de 10).
 * LISTA DE PRODUÇÃO (2026-09-26, ajuste): antes cada item somava toda a
 * produção da ficha. Reverter: voltar à soma direta por item.
 */
export function progressoDoPlano(
  itens: ItemPlano[],
  producoesDoDia: { receitaId: string; quantidade: number; status: StatusProducao }[],
): ProgressoPlano[] {
  const pronto = new Map<string, number>();
  const noFogo = new Map<string, number>();
  for (const p of producoesDoDia) {
    if (p.status === "produzido") pronto.set(p.receitaId, (pronto.get(p.receitaId) ?? 0) + p.quantidade);
    else if (p.status === "em_producao") noFogo.set(p.receitaId, (noFogo.get(p.receitaId) ?? 0) + p.quantidade);
  }
  const emOrdem = [...itens].sort((a, b) => a.data.localeCompare(b.data) || a.criadoEm.localeCompare(b.criadoEm));
  const ultimo = new Map<string, string>();
  for (const i of emOrdem) ultimo.set(i.receitaId, i.id);

  const resultado = new Map<string, ProgressoPlano>();
  for (const item of emOrdem) {
    const eUltimo = ultimo.get(item.receitaId) === item.id;
    const dispPronto = pronto.get(item.receitaId) ?? 0;
    const feito = arred(eUltimo ? dispPronto : Math.min(dispPronto, item.quantidade));
    pronto.set(item.receitaId, arred(dispPronto - feito));
    const precisa = Math.max(0, item.quantidade - feito);
    const dispFogo = noFogo.get(item.receitaId) ?? 0;
    const emProducao = arred(eUltimo ? dispFogo : Math.min(dispFogo, precisa));
    noFogo.set(item.receitaId, arred(dispFogo - emProducao));
    const falta = arred(Math.max(0, item.quantidade - feito - emProducao));
    const estado: EstadoPlano = feito >= item.quantidade ? "feito" : falta === 0 ? "em_producao" : "falta";
    resultado.set(item.id, { item, feito, emProducao, falta, estado });
  }
  return itens
    .map((i) => resultado.get(i.id)!)
    .sort((a, b) => ORDEM[a.estado] - ORDEM[b.estado] || a.item.criadoEm.localeCompare(b.item.criadoEm));
}

export function resumoDoPlano(p: ProgressoPlano[]): { total: number; feitos: number; faltam: number } {
  const feitos = p.filter((x) => x.estado === "feito").length;
  return { total: p.length, feitos, faltam: p.filter((x) => x.estado === "falta").length };
}

export function validarItemPlano(i: { receitaId: string; quantidade: number; observacao?: string | null }): string | null {
  if (!i.receitaId) return "Escolha a ficha.";
  if (!(i.quantidade > 0) || i.quantidade >= 100000) return "Informe quanto produzir.";
  if ((i.observacao ?? "").trim().length > 140) return "Observação com até 140 letras.";
  return null;
}
