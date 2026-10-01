import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "./erros";
import { inicioDoDiaISO } from "@/lib/calculo/dia";
import type { Checklist, ChecklistArea, ChecklistFoto, ChecklistInput, ChecklistItem, MomentoChecklist } from "@/lib/dominio/checklist";
import { extensaoDaFoto } from "@/lib/imagem/tipoFoto";

export type { Checklist, ChecklistArea, ChecklistFoto, ChecklistInput, ChecklistItem, MomentoChecklist } from "@/lib/dominio/checklist";

// POLIMENTO checklists-pracas: bucket das fotos de referência das praças
// (migration 20260923120000_checklist_fotos_pracas.sql).
const BUCKET_FOTOS_PRACAS = "pracas-fotos";

// FUSO (2026-09-25): "hoje" é o dia de Brasília (src/lib/calculo/dia.ts).
// Antes era o fuso do servidor (UTC na Vercel): o dia virava às 21h.

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
  area_id: string | null;
}

export async function listarChecklists(): Promise<Checklist[]> {
  const supabase = await createClient();
  const { data: checklists, error } = await supabase.from("checklists").select("id, nome, momento").order("nome");
  if (error) throw new Error(mensagemErro(error));

  const listaChecklists = (checklists ?? []) as LinhaChecklist[];
  if (listaChecklists.length === 0) return [];

  const { data: itens, error: erroItens } = await supabase
    .from("checklist_itens")
    .select("id, checklist_id, texto, ordem, area_id")
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

  // POLIMENTO checklists-pracas: fotos de referência (só praças costumam ter).
  const { data: fotos, error: erroFotos } = await supabase
    .from("checklist_fotos")
    .select("id, checklist_id, url, legenda, ordem, area_id")
    .in(
      "checklist_id",
      listaChecklists.map((c) => c.id),
    )
    .order("ordem");
  if (erroFotos) throw new Error(mensagemErro(erroFotos));
  const fotosPorChecklist = new Map<string, ChecklistFoto[]>();
  for (const f of (fotos ?? []) as { id: string; checklist_id: string; url: string; legenda: string | null; ordem: number; area_id: string | null }[]) {
    const lista = fotosPorChecklist.get(f.checklist_id) ?? [];
    lista.push({ id: f.id, checklistId: f.checklist_id, url: f.url, legenda: f.legenda, ordem: f.ordem, areaId: f.area_id });
    fotosPorChecklist.set(f.checklist_id, lista);
  }

  // POLIMENTO pracas-areas: áreas das praças (migration 20260923140000).
  const { data: areas, error: erroAreas } = await supabase
    .from("checklist_areas")
    .select("id, checklist_id, nome, ordem")
    .in(
      "checklist_id",
      listaChecklists.map((c) => c.id),
    )
    .order("ordem");
  if (erroAreas) throw new Error(mensagemErro(erroAreas));
  const areasPorChecklist = new Map<string, ChecklistArea[]>();
  for (const a of (areas ?? []) as { id: string; checklist_id: string; nome: string; ordem: number }[]) {
    const lista = areasPorChecklist.get(a.checklist_id) ?? [];
    lista.push({ id: a.id, checklistId: a.checklist_id, nome: a.nome, ordem: a.ordem });
    areasPorChecklist.set(a.checklist_id, lista);
  }

  const itensPorChecklist = new Map<string, ChecklistItem[]>();
  for (const i of listaItens) {
    const lista = itensPorChecklist.get(i.checklist_id) ?? [];
    lista.push({ id: i.id, checklistId: i.checklist_id, texto: i.texto, ordem: i.ordem, concluidoHoje: concluidosHoje.has(i.id), areaId: i.area_id });
    itensPorChecklist.set(i.checklist_id, lista);
  }

  return listaChecklists.map((c) => ({
    id: c.id,
    nome: c.nome,
    momento: c.momento,
    itens: itensPorChecklist.get(c.id) ?? [],
    fotos: fotosPorChecklist.get(c.id) ?? [],
    areas: areasPorChecklist.get(c.id) ?? [],
  }));
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

export async function criarItemChecklist(checklistId: string, texto: string, ordem: number, areaId: string | null = null): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_itens").insert({ checklist_id: checklistId, texto, ordem, area_id: areaId });
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

/** POLIMENTO checklists-pracas: sobe a foto de referência da praça pro bucket
 * público pracas-fotos, na pasta do cliente (a policy de storage exige o
 * cliente_id como 1º segmento), e grava a linha em checklist_fotos. */
export async function adicionarFotoChecklist(clienteId: string, checklistId: string, arquivo: File, legenda: string | null, ordem: number, areaId: string | null = null): Promise<void> {
  const supabase = await createClient();
  const extensao = extensaoDaFoto(arquivo.type, arquivo.size);
  const caminho = `${clienteId}/${checklistId}/${crypto.randomUUID()}.${extensao}`;
  const { error } = await supabase.storage.from(BUCKET_FOTOS_PRACAS).upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
  if (error) throw new Error(mensagemErro(error));
  const { data } = supabase.storage.from(BUCKET_FOTOS_PRACAS).getPublicUrl(caminho);
  const { error: erroLinha } = await supabase.from("checklist_fotos").insert({ checklist_id: checklistId, url: data.publicUrl, caminho, legenda, ordem, area_id: areaId });
  if (erroLinha) {
    // Não deixa arquivo órfão no bucket se a linha não gravou.
    await supabase.storage.from(BUCKET_FOTOS_PRACAS).remove([caminho]);
    throw new Error(mensagemErro(erroLinha));
  }
}

/** Remove a linha e o arquivo. Se o arquivo já não existir, a linha sai mesmo assim. */
export async function removerFotoChecklist(fotoId: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("checklist_fotos").select("caminho").eq("id", fotoId).single();
  if (error) throw new Error(mensagemErro(error));
  const { error: erroDelete } = await supabase.from("checklist_fotos").delete().eq("id", fotoId);
  if (erroDelete) throw new Error(mensagemErro(erroDelete));
  await supabase.storage.from(BUCKET_FOTOS_PRACAS).remove([(data as { caminho: string }).caminho]);
}

// ---------- POLIMENTO pracas-areas (2026-09-23) ----------

/** Renomeia praça ou checklist (nome livre do cliente). */
export async function renomearChecklist(id: string, nome: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("checklists").update({ nome }).eq("id", id);
  if (error) throw new Error(mensagemErro(error));
}

export async function criarAreaChecklist(checklistId: string, nome: string, ordem: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_areas").insert({ checklist_id: checklistId, nome, ordem });
  if (error) throw new Error(mensagemErro(error));
}

export async function renomearAreaChecklist(areaId: string, nome: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_areas").update({ nome }).eq("id", areaId);
  if (error) throw new Error(mensagemErro(error));
}

/** Apaga a área com os itens e as fotos dela (linhas em cascata; arquivos aqui). */
export async function removerAreaChecklist(areaId: string): Promise<void> {
  const supabase = await createClient();
  const { data: fotos, error: erroFotos } = await supabase.from("checklist_fotos").select("caminho").eq("area_id", areaId);
  if (erroFotos) throw new Error(mensagemErro(erroFotos));
  const { error } = await supabase.from("checklist_areas").delete().eq("id", areaId);
  if (error) throw new Error(mensagemErro(error));
  const caminhos = ((fotos ?? []) as { caminho: string }[]).map((f) => f.caminho);
  if (caminhos.length) await supabase.storage.from(BUCKET_FOTOS_PRACAS).remove(caminhos);
}
