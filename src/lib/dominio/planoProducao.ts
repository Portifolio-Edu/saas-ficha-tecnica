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

export function progressoDoPlano(
  itens: ItemPlano[],
  producoesDoDia: { receitaId: string; quantidade: number; status: StatusProducao }[],
): ProgressoPlano[] {
  return itens
    .map((item) => {
      const daReceita = producoesDoDia.filter((p) => p.receitaId === item.receitaId);
      const feito = arred(daReceita.filter((p) => p.status === "produzido").reduce((s, p) => s + p.quantidade, 0));
      const emProducao = arred(daReceita.filter((p) => p.status === "em_producao").reduce((s, p) => s + p.quantidade, 0));
      const falta = arred(Math.max(0, item.quantidade - feito - emProducao));
      const estado: EstadoPlano = feito >= item.quantidade ? "feito" : falta === 0 ? "em_producao" : "falta";
      return { item, feito, emProducao, falta, estado };
    })
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
