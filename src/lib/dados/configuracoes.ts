import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "./erros";
import type { CanalVendaConfig, CanalVendaInput, DadosRestaurante, DadosRestauranteInput, TurnoInput } from "@/lib/dominio/configuracoes";

// CONFIGURAÇÕES (2026-10-03): leitura e escrita do que a tela de Configurações
// edita. Só usa colunas que já existem no schema: clientes (nome, nome_restaurante,
// cnpj, margem_alvo), canais_venda e turnos. A RLS decide quem escreve (só a
// gestão); as actions conferem o papel antes pra devolver uma mensagem clara.

export async function lerRestaurante(): Promise<DadosRestaurante> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clientes").select("nome, nome_restaurante, telefone, cnpj, margem_alvo").single();
  if (error) throw new Error(mensagemErro(error));
  return {
    nomeRestaurante: data.nome_restaurante,
    nome: data.nome,
    telefone: data.telefone,
    cnpj: data.cnpj,
    margemAlvo: Number(data.margem_alvo),
  };
}

export async function atualizarRestaurante(clienteId: string, input: DadosRestauranteInput): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .update({ nome: input.nome, nome_restaurante: input.nomeRestaurante, cnpj: input.cnpj, margem_alvo: input.margemAlvo })
    .eq("id", clienteId)
    .select("id");
  if (error) throw new Error(mensagemErro(error));
  // A RLS não devolve erro quando barra um update: devolve zero linhas.
  if (!data || data.length === 0) throw new Error("Seu acesso não permite alterar os dados do restaurante.");
}

interface LinhaCanal {
  id: string;
  nome_canal: string;
  comissao_percentual: number;
  embala: boolean;
  ativo: boolean;
}

export async function listarCanais(): Promise<CanalVendaConfig[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("canais_venda").select("id, nome_canal, comissao_percentual, embala, ativo").order("nome_canal");
  if (error) throw new Error(mensagemErro(error));
  return ((data ?? []) as LinhaCanal[]).map((c) => ({
    id: c.id,
    nomeCanal: c.nome_canal,
    comissaoPercentual: Number(c.comissao_percentual),
    embala: c.embala,
    ativo: c.ativo,
  }));
}

export async function criarCanal(clienteId: string, input: CanalVendaInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("canais_venda")
    .insert({ cliente_id: clienteId, nome_canal: input.nomeCanal, comissao_percentual: input.comissaoPercentual, embala: input.embala, ativo: input.ativo });
  if (error) throw new Error(mensagemErro(error));
}

export async function atualizarCanal(id: string, input: CanalVendaInput): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("canais_venda")
    .update({ nome_canal: input.nomeCanal, comissao_percentual: input.comissaoPercentual, embala: input.embala, ativo: input.ativo })
    .eq("id", id)
    .select("id");
  if (error) throw new Error(mensagemErro(error));
  if (!data || data.length === 0) throw new Error("Canal não encontrado ou sem permissão pra alterar.");
}

/** precos_canal aponta pro canal sem cascata: o que já foi calculado pra ele sai junto. */
export async function excluirCanal(id: string): Promise<void> {
  const supabase = await createClient();
  const { error: erroPrecos } = await supabase.from("precos_canal").delete().eq("canal_id", id);
  if (erroPrecos) throw new Error(mensagemErro(erroPrecos));
  const { error } = await supabase.from("canais_venda").delete().eq("id", id);
  if (error) throw new Error(mensagemErro(error));
}

export async function criarTurno(clienteId: string, input: TurnoInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("turnos").insert({ cliente_id: clienteId, nome: input.nome, horario: input.horario });
  if (error) throw new Error(mensagemErro(error));
}

export async function atualizarTurno(id: string, input: TurnoInput): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("turnos").update({ nome: input.nome, horario: input.horario }).eq("id", id).select("id");
  if (error) throw new Error(mensagemErro(error));
  if (!data || data.length === 0) throw new Error("Turno não encontrado ou sem permissão pra alterar.");
}

/** Turno que já teve produção ou checklist registrado não sai (o histórico aponta pra ele). */
export async function excluirTurno(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("turnos").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") throw new Error("Este turno já tem produção ou checklist registrado e não pode ser excluído. Renomeie o turno se o horário mudou.");
    throw new Error(mensagemErro(error));
  }
}
