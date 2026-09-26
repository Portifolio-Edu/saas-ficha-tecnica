// LISTA DE PRODUÇÃO (2026-09-26): a lista do dia na demonstração. Fica no
// "banco" da demo (CHAVES_DEMO.planoProducao) e vale pro painel e pro tablet.
// `origem` faz o papel do criado_por do banco: o tablet tira só o que ele pediu.
import type { ItemPlano } from "@/lib/dominio/planoProducao";

export type ItemPlanoDemo = Omit<ItemPlano, "podeMexer"> & { origem: "gestao" | "cozinha" };

/** Lista inicial de hoje: dois pedidos do gestor e um da cozinha. */
export function planoDemoInicial(hoje: string, receitas: { id: string; tipo: string; rendimento: number }[]): ItemPlanoDemo[] {
  const preparos = receitas.filter((r) => r.tipo === "preparo_base").slice(0, 3);
  const base = `${hoje}T09:00:00.000Z`;
  return preparos.map((r, i) => ({
    id: `plano-demo-${i + 1}`,
    data: hoje,
    receitaId: r.id,
    quantidade: r.rendimento * (i === 0 ? 2 : 1),
    observacao: i === 0 ? "Pro almoço, antes das 11h" : null,
    responsavel: i === 2 ? "Juliana Costa" : "Gil (gestor)",
    origem: i === 2 ? "cozinha" : "gestao",
    criadoEm: base.replace("09:00", `09:0${i}`),
  }));
}

export function paraVisao(itens: ItemPlanoDemo[], hoje: string, visao: "gestao" | "cozinha"): ItemPlano[] {
  return itens
    .filter((i) => i.data === hoje)
    .map(({ origem, ...i }) => ({ ...i, podeMexer: visao === "gestao" || origem === "cozinha" }));
}
