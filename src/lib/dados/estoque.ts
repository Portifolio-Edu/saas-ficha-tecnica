import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "./erros";
import type { Insumo } from "@/lib/dominio/insumo";
import type { EstoqueLinha, Movimentacao, TipoMovimentacao } from "@/lib/dominio/estoque";

export type { EstoqueLinha, Movimentacao, TipoMovimentacao } from "@/lib/dominio/estoque";

interface LinhaEstoqueJoin {
  insumo_id: string;
  saldo_atual: number;
  estoque_minimo: number;
  insumos: { nome: string; categoria: string; unidade_medida: string; preco_unitario: number } | null;
}

export async function listarEstoque(): Promise<EstoqueLinha[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("estoque")
    .select("insumo_id, saldo_atual, estoque_minimo, insumos(nome, categoria, unidade_medida, preco_unitario)")
    .order("atualizado_em", { ascending: false });
  if (error) throw new Error(mensagemErro(error));

  return ((data ?? []) as unknown as LinhaEstoqueJoin[])
    .filter((r) => r.insumos)
    .map((r) => ({
      insumoId: r.insumo_id,
      nome: r.insumos!.nome,
      categoria: r.insumos!.categoria,
      unidadeMedida: r.insumos!.unidade_medida,
      precoUnitario: Number(r.insumos!.preco_unitario),
      saldoAtual: Number(r.saldo_atual),
      estoqueMinimo: Number(r.estoque_minimo),
    }));
}

/** Insumos que ainda não têm linha em `estoque` -- candidatos pro formulário "rastrear insumo". */
export function insumosNaoRastreados(todosInsumos: Insumo[], rastreados: EstoqueLinha[]): Insumo[] {
  const idsRastreados = new Set(rastreados.map((e) => e.insumoId));
  return todosInsumos.filter((i) => !idsRastreados.has(i.id));
}

export async function rastrearInsumo(insumoId: string, saldoAtual: number, estoqueMinimo: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("estoque").insert({ insumo_id: insumoId, saldo_atual: saldoAtual, estoque_minimo: estoqueMinimo });
  if (error) throw new Error(mensagemErro(error));
}

export async function atualizarEstoque(insumoId: string, saldoAtual: number, estoqueMinimo: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("estoque")
    .update({ saldo_atual: saldoAtual, estoque_minimo: estoqueMinimo, atualizado_em: new Date().toISOString() })
    .eq("insumo_id", insumoId);
  if (error) throw new Error(mensagemErro(error));
}

export async function pararDeRastrear(insumoId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("estoque").delete().eq("insumo_id", insumoId);
  if (error) throw new Error(mensagemErro(error));
}

interface LinhaMovimentacaoJoin {
  id: string;
  insumo_id: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  origem: string | null;
  criado_em: string;
  insumos: { nome: string; unidade_medida: string } | null;
}

export async function listarMovimentacoes(limite = 30): Promise<Movimentacao[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("movimentacoes_estoque")
    .select("id, insumo_id, tipo, quantidade, origem, criado_em, insumos(nome, unidade_medida)")
    .order("criado_em", { ascending: false })
    .limit(limite);
  if (error) throw new Error(mensagemErro(error));

  return ((data ?? []) as unknown as LinhaMovimentacaoJoin[])
    .filter((m) => m.insumos)
    .map((m) => ({
      id: m.id,
      insumoId: m.insumo_id,
      nomeInsumo: m.insumos!.nome,
      unidadeMedida: m.insumos!.unidade_medida,
      tipo: m.tipo,
      quantidade: Number(m.quantidade),
      origem: m.origem,
      criadoEm: m.criado_em,
    }));
}

/**
 * Registra a movimentação e ajusta estoque.saldo_atual no mesmo sinal: entrada
 * soma, ajuste subtrai (o único exemplo do handoff pra "ajuste" é perda/correção
 * pra baixo -- correção pra cima é só lançar como entrada). saida_venda não tem
 * formulário aqui: no handoff ela é lançada em lote a partir da importação de
 * vendas do fechamento de CMV, não digitada uma a uma.
 *
 * O ajuste de saldo roda como RPC atômica (ajustar_saldo_estoque) em vez de
 * SELECT+UPDATE no cliente, pra não perder update sob concorrência. Chamamos
 * a RPC antes de inserir a movimentação: se o ajuste de saldo falhar, nada é
 * gravado; se o INSERT do histórico falhar depois, fica só uma lacuna no
 * histórico (saldo já correto), o que é preferível a saldo e histórico
 * dessincronizados.
 */
export async function registrarMovimentacao(
  insumoId: string,
  tipo: "entrada" | "ajuste" | "saida_producao",
  quantidade: number,
  origem: string
): Promise<void> {
  const supabase = await createClient();

  const delta = tipo === "entrada" ? quantidade : -quantidade;

  const { error: erroRpc } = await supabase.rpc("ajustar_saldo_estoque", { p_insumo_id: insumoId, p_delta: delta });
  if (erroRpc) throw new Error(mensagemErro(erroRpc));

  // saida_producao depende da migration 20260922190000_movimentacao_saida_producao.
  const { error: erroInsert } = await supabase.from("movimentacoes_estoque").insert({ insumo_id: insumoId, tipo, quantidade, origem });
  if (erroInsert) throw new Error(mensagemErro(erroInsert));
}
