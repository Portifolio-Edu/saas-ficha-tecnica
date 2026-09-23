"use server";

import { revalidatePath } from "next/cache";
import { getClienteAtual } from "@/lib/dados/cliente";
import {
  criarChecklist,
  excluirChecklist,
  criarItemChecklist,
  removerItemChecklist,
  marcarItemConcluido,
  desmarcarItemConcluido,
  adicionarFotoChecklist,
  removerFotoChecklist,
} from "@/lib/dados/checklists";
import type { ChecklistInput } from "@/lib/dominio/checklist";

export type Resultado = { ok: true } | { ok: false; erro: string };

function paraResultado(e: unknown): Resultado {
  return { ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido." };
}

export async function acaoCriarChecklist(input: ChecklistInput): Promise<Resultado> {
  const cliente = await getClienteAtual();
  if (!cliente) return { ok: false, erro: "Sessão expirada. Faça login novamente." };
  try {
    await criarChecklist(cliente.id, input);
    revalidatePath("/checklists");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoExcluirChecklist(id: string): Promise<Resultado> {
  try {
    await excluirChecklist(id);
    revalidatePath("/checklists");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoCriarItem(checklistId: string, texto: string, ordem: number): Promise<Resultado> {
  try {
    await criarItemChecklist(checklistId, texto, ordem);
    revalidatePath("/checklists");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoRemoverItem(itemId: string): Promise<Resultado> {
  try {
    await removerItemChecklist(itemId);
    revalidatePath("/checklists");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoAlternarItem(
  itemId: string,
  concluidoAtualmente: boolean,
  turnoId: string | null,
  chefeTurno: string | null,
  responsavel: string | null,
): Promise<Resultado> {
  try {
    if (concluidoAtualmente) await desmarcarItemConcluido(itemId);
    else await marcarItemConcluido(itemId, turnoId, chefeTurno, responsavel);
    revalidatePath("/checklists");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

// POLIMENTO checklists-pracas: fotos de referência da praça montada. O arquivo
// chega já reduzido pelo navegador (lib/imagem/reduzirImagem.ts), abaixo do
// limite de 1 MB das server actions.
export async function acaoAdicionarFotoPraca(formData: FormData): Promise<Resultado> {
  const cliente = await getClienteAtual();
  if (!cliente) return { ok: false, erro: "Sessão expirada. Faça login novamente." };
  const arquivo = formData.get("arquivo");
  const checklistId = formData.get("checklistId");
  const legenda = formData.get("legenda");
  const ordem = Number(formData.get("ordem") ?? 0);
  if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, erro: "Nenhuma foto enviada." };
  if (typeof checklistId !== "string" || !checklistId) return { ok: false, erro: "Praça não informada." };
  try {
    await adicionarFotoChecklist(cliente.id, checklistId, arquivo, typeof legenda === "string" && legenda.trim() ? legenda.trim() : null, Number.isFinite(ordem) ? ordem : 0);
    revalidatePath("/checklists");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoRemoverFotoPraca(fotoId: string): Promise<Resultado> {
  try {
    await removerFotoChecklist(fotoId);
    revalidatePath("/checklists");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}
