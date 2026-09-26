// PEDIDOS DA COZINHA (2026-09-26): pedidos de compra que a cozinha faz e o
// estoque/gestão resolve. A RLS decide quem faz o quê (supabase/migrations/
// 20260928130000_requisicoes_compra.sql): toda a equipe vê e pede; só
// estoque/gestão marca comprado; quem pediu errado tira enquanto pendente.

import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "./erros";
import type { AgendaFornecedor, CategoriaPedido, NovaRequisicao, Requisicao, StatusRequisicao, UnidadePedido } from "@/lib/dominio/requisicao";

interface LinhaRequisicao {
  id: string;
  categoria: CategoriaPedido;
  insumo_id: string | null;
  descricao: string;
  quantidade: number | null;
  unidade: UnidadePedido | null;
  observacao: string | null;
  responsavel: string;
  status: StatusRequisicao;
  criado_em: string;
  resolvido_em: string | null;
}

function paraRequisicao(r: LinhaRequisicao): Requisicao {
  return {
    id: r.id,
    categoria: r.categoria,
    insumoId: r.insumo_id,
    descricao: r.descricao,
    quantidade: r.quantidade === null ? null : Number(r.quantidade),
    unidade: r.unidade,
    observacao: r.observacao,
    responsavel: r.responsavel,
    status: r.status,
    criadoEm: r.criado_em,
    resolvidoEm: r.resolvido_em,
  };
}

/** Pendentes (todas) e as resolvidas nos últimos 3 dias (pra cozinha ver que chegou/foi comprado). */
export async function listarRequisicoes(): Promise<Requisicao[]> {
  const supabase = await createClient();
  const desde = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("requisicoes")
    .select("id, categoria, insumo_id, descricao, quantidade, unidade, observacao, responsavel, status, criado_em, resolvido_em")
    .or(`status.eq.pendente,resolvido_em.gte.${desde}`)
    .order("criado_em", { ascending: false })
    .limit(300);
  if (error) throw new Error(mensagemErro(error));
  return ((data ?? []) as LinhaRequisicao[]).map(paraRequisicao);
}

export async function criarRequisicao(clienteId: string, r: NovaRequisicao, responsavel: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("requisicoes").insert({
    cliente_id: clienteId,
    categoria: r.categoria,
    insumo_id: r.insumoId,
    descricao: r.descricao.trim(),
    quantidade: r.quantidade,
    unidade: r.quantidade === null ? null : r.unidade,
    observacao: r.observacao?.trim() || null,
    responsavel: responsavel.trim(),
  });
  if (error) throw new Error(mensagemErro(error));
}

export async function removerRequisicao(id: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("requisicoes").delete().eq("id", id).select("id");
  if (error) throw new Error(mensagemErro(error));
  if (!data?.length) throw new Error("Esse item já foi comprado; não dá mais pra tirar do pedido.");
}

export async function resolverRequisicoes(ids: string[], status: StatusRequisicao): Promise<number> {
  if (ids.length === 0) return 0;
  const supabase = await createClient();
  const { data, error } = await supabase.from("requisicoes").update({ status }).in("id", ids).select("id");
  if (error) throw new Error(mensagemErro(error));
  return data?.length ?? 0;
}

/** Agenda de entrega (sem contato do fornecedor), pra cozinha calcular o prazo. */
export async function listarAgendaFornecedores(): Promise<AgendaFornecedor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("agenda_fornecedores");
  if (error) throw new Error(mensagemErro(error));
  return ((data ?? []) as { empresa: string; categorias_pedido: CategoriaPedido[]; entrega_dias: number[]; pedido_ate: string | null; pedido_antecedencia: number }[]).map((f) => ({
    empresa: f.empresa,
    categorias: f.categorias_pedido ?? [],
    diasEntrega: f.entrega_dias ?? [],
    pedidoAte: f.pedido_ate ? f.pedido_ate.slice(0, 5) : null,
    antecedencia: f.pedido_antecedencia ?? 1,
  }));
}
