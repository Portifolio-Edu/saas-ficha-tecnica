import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "./erros";
import type { Checklist, ChecklistInput, ChecklistItem, MomentoChecklist } from "@/lib/dominio/checklist";

export type { Checklist, ChecklistInput, ChecklistItem, MomentoChecklist } from "@/lib/dominio/checklist";

/** "Hoje" no fuso do servidor -- suficiente pro caso de uso (checklist de
 * turno reinicia todo dia), sem exigir configuração de fuso por cliente. */
function inicioDoDiaISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

interface LinhaChecklist {
  id: string;
  nome: string;
  momento: MomentoChecklist;
}

interface LinhaItem {
  id: string;
  checklist_id: string;
  texto: string;
  ordem: number;
}

export async function listarChecklists(): Promise<Checklist[]> {
  const supabase = await createClient();
  const { data: checklists, error } = await supabase.from("checklists").select("id, nome, momento").order("nome");
  if (error) throw new Error(mensagemErro(error));

  const listaChecklists = (checklists ?? []) as LinhaChecklist[];
  if (listaChecklists.length === 0) return [];

  const { data: itens, error: erroItens } = await supabase
    .from("checklist_itens")
    .select("id, checklist_id, texto, ordem")
    .in(
      "checklist_id",
      listaChecklists.map((c) => c.id),
    )
    .order("ordem");
  if (erroItens) throw new Error(mensagemErro(erroItens));
  const listaItens = (itens ?? []) as LinhaItem[];

  let concluidosHoje = new Set<string>();
  if (listaItens.length > 0) {
    const { data: execucoes, error: erroExec } = await supabase
      .from("checklist_execucoes")
      .select("checklist_item_id")
      .in(
        "checklist_item_id",
        listaItens.map((i) => i.id),
      )
      .gte("concluido_em", inicioDoDiaISO());
    if (erroExec) throw new Error(mensagemErro(erroExec));
    concluidosHoje = new Set(((execucoes ?? []) as { checklist_item_id: string }[]).map((e) => e.checklist_item_id));
  }

  const itensPorChecklist = new Map<string, ChecklistItem[]>();
  for (const i of listaItens) {
    const lista = itensPorChecklist.get(i.checklist_id) ?? [];
    lista.push({ id: i.id, checklistId: i.checklist_id, texto: i.texto, ordem: i.ordem, concluidoHoje: concluidosHoje.has(i.id) });
    itensPorChecklist.set(i.checklist_id, lista);
  }

  return listaChecklists.map((c) => ({ id: c.id, nome: c.nome, momento: c.momento, itens: itensPorChecklist.get(c.id) ?? [] }));
}

export async function criarChecklist(clienteId: string, input: ChecklistInput): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklists")
    .insert({ cliente_id: clienteId, nome: input.nome, momento: input.momento })
    .select("id")
    .single();
  if (error) throw new Error(mensagemErro(error));
  return (data as { id: string }).id;
}

export async function excluirChecklist(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("checklists").delete().eq("id", id);
  if (error) throw new Error(mensagemErro(error));
}

export async function criarItemChecklist(checklistId: string, texto: string, ordem: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_itens").insert({ checklist_id: checklistId, texto, ordem });
  if (error) throw new Error(mensagemErro(error));
}

export async function removerItemChecklist(itemId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_itens").delete().eq("id", itemId);
  if (error) throw new Error(mensagemErro(error));
}

export async function marcarItemConcluido(itemId: string, turnoId: string | null, chefeTurno: string | null, responsavel: string | null): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_execucoes").insert({ checklist_item_id: itemId, turno_id: turnoId, chefe_turno: chefeTurno, responsavel });
  if (error) throw new Error(mensagemErro(error));
}

/** Desmarcar remove só a execução de hoje -- histórico de dias anteriores
 * fica intacto pra auditoria. */
export async function desmarcarItemConcluido(itemId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_execucoes").delete().eq("checklist_item_id", itemId).gte("concluido_em", inicioDoDiaISO());
  if (error) throw new Error(mensagemErro(error));
}
