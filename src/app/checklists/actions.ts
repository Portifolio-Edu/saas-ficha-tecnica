"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getClienteAtual } from "@/lib/dados/cliente";
import {
  criarChecklist,
  excluirChecklist,
  criarItemChecklist,
  removerItemChecklist,
  marcarItemConcluido,
  desmarcarItemConcluido,
} from "@/lib/dados/checklists";
import type { ChecklistInput } from "@/lib/dominio/checklist";

export type Resultado = { ok: true } | { ok: false; erro: string };

function paraResultado(e: unknown): Resultado {
  return { ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido." };
}

async function isRequisicaoPreview(): Promise<boolean> {
  try {
    const h = await headers();
    const referer = h.get("referer") || "";
    return referer.includes("/preview");
  } catch {
    return false;
  }
}

export async function acaoCriarChecklist(input: ChecklistInput): Promise<Resultado> {
  const cliente = await getClienteAtual();
  if (!cliente) {
    if (await isRequisicaoPreview()) return { ok: true };
    return { ok: false, erro: "Sessão expirada. Faça login novamente." };
  }
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
  if (itemId.startsWith("demo-") || (await isRequisicaoPreview())) {
    return { ok: true };
  }
  try {
    if (concluidoAtualmente) await desmarcarItemConcluido(itemId);
    else await marcarItemConcluido(itemId, turnoId, chefeTurno, responsavel);
    revalidatePath("/checklists");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}
