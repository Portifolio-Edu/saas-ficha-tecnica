import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "./erros";
import type { Producao, ProducaoInput, StatusProducao, Turno } from "@/lib/dominio/producao";

export type { Producao, ProducaoInput, StatusProducao, Turno, TipoItemProducao } from "@/lib/dominio/producao";

const ORDEM_TURNO_PADRAO = ["Manhã", "Tarde", "Noite"];

function ordenarTurnos(turnos: Turno[]): Turno[] {
  return [...turnos].sort((a, b) => {
    const ia = ORDEM_TURNO_PADRAO.indexOf(a.nome);
    const ib = ORDEM_TURNO_PADRAO.indexOf(b.nome);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

/** Garante os três turnos padrão do handoff (Manhã/Tarde/Noite) pro cliente
 * atual, criando-os na primeira visita à tela de Produções. Cada casa pode
 * editar depois -- não há tela de CRUD de turno ainda, então o padrão fica
 * bom o bastante pra começar a registrar produção. */
export async function garantirTurnosPadrao(clienteId: string): Promise<Turno[]> {
  const supabase = await createClient();
  const { data: existentes, error } = await supabase.from("turnos").select("id, nome, horario");
  if (error) throw new Error(mensagemErro(error));

  if (existentes && existentes.length > 0) return ordenarTurnos(existentes as Turno[]);

  const { data: criados, error: erroInsert } = await supabase
    .from("turnos")
    .insert([
      { cliente_id: clienteId, nome: "Manhã", horario: "06h-14h" },
      { cliente_id: clienteId, nome: "Tarde", horario: "14h-18h" },
      { cliente_id: clienteId, nome: "Noite", horario: "18h-00h" },
    ])
    .select("id, nome, horario");
  if (erroInsert) throw new Error(mensagemErro(erroInsert));

  return ordenarTurnos((criados ?? []) as Turno[]);
}

interface LinhaProducaoJoin {
  id: string;
  lote: string;
  receita_id: string;
  quantidade: number;
  responsavel: string;
  turno_id: string | null;
  chefe_turno: string | null;
  validade: string | null;
  status: StatusProducao;
  motivo_perda: string | null;
  criado_em: string;
  receitas: { nome_prato: string; tipo: "prato_final" | "preparo_base"; unidade_rendimento: string } | null;
  turnos: { nome: string } | null;
}

export async function listarProducoes(): Promise<Producao[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("producoes")
    .select("id, lote, receita_id, quantidade, responsavel, turno_id, chefe_turno, validade, status, motivo_perda, criado_em, receitas(nome_prato, tipo, unidade_rendimento), turnos(nome)")
    .order("criado_em", { ascending: false });
  if (error) throw new Error(mensagemErro(error));

  return ((data ?? []) as unknown as LinhaProducaoJoin[])
    .filter((p) => p.receitas)
    .map((p) => ({
      id: p.id,
      lote: p.lote,
      tipo: p.receitas!.tipo === "preparo_base" ? "preparo" : "prato",
      receitaId: p.receita_id,
      nomeReceita: p.receitas!.nome_prato,
      unidadeRendimento: p.receitas!.tipo === "preparo_base" ? p.receitas!.unidade_rendimento : "porções",
      quantidade: Number(p.quantidade),
      responsavel: p.responsavel,
      turnoId: p.turno_id,
      nomeTurno: p.turnos?.nome ?? null,
      chefeTurno: p.chefe_turno,
      validade: p.validade,
      status: p.status,
      motivoPerda: p.motivo_perda,
      criadoEm: p.criado_em,
    }));
}

export async function contarProducoesPorReceita(receitaId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("producoes")
    .select("id", { count: "exact", head: true })
    .eq("receita_id", receitaId);
  if (error) throw new Error(mensagemErro(error));
  return count ?? 0;
}

async function inserirProducao(clienteId: string, input: ProducaoInput) {
  const supabase = await createClient();
  return supabase.from("producoes").insert({
    cliente_id: clienteId,
    lote: input.lote,
    receita_id: input.receitaId,
    quantidade: input.quantidade,
    responsavel: input.responsavel,
    turno_id: input.turnoId,
    chefe_turno: input.chefeTurno,
    validade: input.validade,
    status: "em_producao",
  });
}

export async function criarProducao(clienteId: string, input: ProducaoInput): Promise<void> {
  const { error } = await inserirProducao(clienteId, input);
  if (error) throw new Error(mensagemErro(error));
}

const MAX_TENTATIVAS_LOTE = 5;

/**
 * Cria a produção com lote gerado automaticamente ("iniciar produção" a
 * partir de um card do quadro), retentando com o próximo número de sequência
 * quando o lote colide (23505 na constraint producoes_cliente_lote_unico).
 * A sequência inicial vem de um COUNT sem lock -- duas chamadas concorrentes
 * pra mesma receita podem calcular o mesmo número --, então é a constraint
 * unique no banco que detecta a colisão de verdade; o retry aqui só lida com
 * o erro esperado em vez de deixar a ação falhar pro usuário.
 */
export async function criarProducaoComLoteAutomatico(
  clienteId: string,
  receitaId: string,
  montarInput: (sequencia: number) => ProducaoInput,
): Promise<void> {
  let sequencia = (await contarProducoesPorReceita(receitaId)) + 1;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_LOTE; tentativa++) {
    const { error } = await inserirProducao(clienteId, montarInput(sequencia));
    if (!error) return;
    if (error.code !== "23505") throw new Error(mensagemErro(error));
    sequencia++;
  }
  throw new Error("Não foi possível gerar um código de lote único depois de várias tentativas. Tente novamente.");
}

export async function atualizarStatusProducao(id: string, status: StatusProducao, motivoPerda: string | null = null): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("producoes").update({ status, motivo_perda: motivoPerda }).eq("id", id);
  if (error) throw new Error(mensagemErro(error));
}
