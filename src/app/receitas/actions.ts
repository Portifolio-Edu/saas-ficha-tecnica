"use server";

import { revalidatePath } from "next/cache";
import { getClienteAtual } from "@/lib/dados/cliente";
import { criarReceita, atualizarReceita, excluirReceita, type ReceitaInput } from "@/lib/dados/receitas";

export type Resultado = { ok: true } | { ok: false; erro: string };

function paraResultado(e: unknown): Resultado {
  return { ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido." };
}

export async function acaoCriarReceita(input: ReceitaInput): Promise<Resultado> {
  const cliente = await getClienteAtual();
  if (!cliente) return { ok: false, erro: "Sessão expirada. Faça login novamente." };
  try {
    await criarReceita(cliente.id, input);
    revalidatePath("/receitas");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoAtualizarReceita(id: string, input: ReceitaInput): Promise<Resultado> {
  try {
    await atualizarReceita(id, input);
    revalidatePath("/receitas");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoExcluirReceita(id: string): Promise<Resultado> {
  try {
    await excluirReceita(id);
    revalidatePath("/receitas");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}
