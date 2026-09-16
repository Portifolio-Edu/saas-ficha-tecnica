"use server";

import { revalidatePath } from "next/cache";
import { getClienteAtual } from "@/lib/dados/cliente";
import { criarInsumo, atualizarInsumo, excluirInsumo, type InsumoInput } from "@/lib/dados/insumos";
import {
  criarReceita,
  atualizarReceita,
  excluirReceita,
  type ReceitaInput,
} from "@/lib/dados/receitas";

export type Resultado = { ok: true } | { ok: false; erro: string };

function paraResultado(e: unknown): Resultado {
  return { ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido." };
}

export async function acaoCriarInsumo(input: InsumoInput): Promise<Resultado> {
  const cliente = await getClienteAtual();
  if (!cliente) return { ok: false, erro: "Sessão expirada. Faça login novamente." };
  try {
    await criarInsumo(cliente.id, input);
    revalidatePath("/insumos");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoAtualizarInsumo(id: string, input: InsumoInput): Promise<Resultado> {
  try {
    await atualizarInsumo(id, input);
    revalidatePath("/insumos");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoExcluirInsumo(id: string): Promise<Resultado> {
  try {
    await excluirInsumo(id);
    revalidatePath("/insumos");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

// Preparos próprios são receitas com tipo = 'preparo_base', mas vivem na tela
// de Insumos -- mesma organização de ficha-tecnica-mvp.jsx.
export async function acaoCriarPreparo(input: ReceitaInput): Promise<Resultado> {
  const cliente = await getClienteAtual();
  if (!cliente) return { ok: false, erro: "Sessão expirada. Faça login novamente." };
  try {
    await criarReceita(cliente.id, input);
    revalidatePath("/insumos");
    revalidatePath("/receitas");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoAtualizarPreparo(id: string, input: ReceitaInput): Promise<Resultado> {
  try {
    await atualizarReceita(id, input);
    revalidatePath("/insumos");
    revalidatePath("/receitas");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoExcluirPreparo(id: string): Promise<Resultado> {
  try {
    await excluirReceita(id);
    revalidatePath("/insumos");
    revalidatePath("/receitas");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}
