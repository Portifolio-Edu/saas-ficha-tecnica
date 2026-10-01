// LISTA DE PRODUÇÃO (2026-09-26): leitura e gravação da tabela plano_producao
// com a sessão de quem pede (a RLS decide: gestão mexe em tudo; a cozinha
// pede e mexe só no que o tablet pediu). Domínio: src/lib/dominio/planoProducao.ts.
import { createClient } from "@/lib/supabase/server";
import type { ItemPlano } from "@/lib/dominio/planoProducao";
import { mensagemErro } from "./erros";

interface Linha {
  id: string;
  data: string;
  receita_id: string;
  quantidade: number;
  observacao: string | null;
  responsavel: string | null;
  criado_por: string | null;
  criado_em: string;
}

/** Itens do dia. `userId` e `gestao` dizem o que quem está vendo pode mexer. */
export async function listarPlanoDoDia(data: string, userId: string, gestao: boolean): Promise<ItemPlano[]> {
  const supabase = await createClient();
  const { data: linhas, error } = await supabase
    .from("plano_producao")
    .select("id, data, receita_id, quantidade, observacao, responsavel, criado_por, criado_em")
    .eq("data", data)
    .order("criado_em");
  if (error) throw new Error(mensagemErro(error));
  return ((linhas ?? []) as Linha[]).map((l) => ({
    id: l.id,
    data: l.data,
    receitaId: l.receita_id,
    quantidade: Number(l.quantidade),
    observacao: l.observacao,
    responsavel: l.responsavel,
    podeMexer: gestao || l.criado_por === userId,
    criadoEm: l.criado_em,
  }));
}

/** Põe na lista. Se a receita já está no dia, muda a quantidade (quando pode). */
export async function adicionarAoPlano(
  clienteId: string,
  i: { data: string; receitaId: string; quantidade: number; observacao: string | null; responsavel: string | null },
): Promise<{ aviso?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("plano_producao").insert({
    cliente_id: clienteId,
    data: i.data,
    receita_id: i.receitaId,
    quantidade: i.quantidade,
    observacao: i.observacao?.trim() || null,
    responsavel: i.responsavel,
  });
  if (!error) return {};
  if (error.code !== "23505") throw new Error(mensagemErro(error));

  const { data: mudou, error: erroUpdate } = await supabase
    .from("plano_producao")
    .update({ quantidade: i.quantidade, ...(i.observacao?.trim() ? { observacao: i.observacao.trim() } : {}) })
    .eq("cliente_id", clienteId)
    .eq("data", i.data)
    .eq("receita_id", i.receitaId)
    .select("id");
  if (erroUpdate) throw new Error(mensagemErro(erroUpdate));
  if (!mudou?.length) throw new Error("Essa ficha já está na lista, pedida pelo gestor. Fale com ele pra mudar a quantidade.");
  return { aviso: "Já estava na lista: quantidade atualizada." };
}

export async function mudarQuantidadeDoPlano(id: string, quantidade: number): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("plano_producao").update({ quantidade }).eq("id", id).select("id");
  if (error) throw new Error(mensagemErro(error));
  if (!data?.length) throw new Error("Só quem pediu (ou o gestor) muda esse item.");
}

export async function tirarDoPlano(id: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("plano_producao").delete().eq("id", id).select("id");
  if (error) throw new Error(mensagemErro(error));
  if (!data?.length) throw new Error("Só quem pediu (ou o gestor) tira esse item.");
}
