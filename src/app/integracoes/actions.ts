"use server";

import { revalidatePath } from "next/cache";
import { getClienteAtual } from "@/lib/dados/cliente";
import { ehGestao } from "@/lib/auth/papeis";
import { resolverProdutoPdv, salvarProdutosPdv } from "@/lib/dados/produtosPdv";
import type { ItemParaSalvar } from "@/lib/dominio/produtoPdv";

export type ResultadoSalvar = { ok: true; pendentes: number } | { ok: false; erro: string };
export type Resultado = { ok: true } | { ok: false; erro: string };

function erroDe(e: unknown): string {
  return e instanceof Error ? e.message : "Erro desconhecido.";
}

const LIMITE_ITENS = 3000;

function itensValidos(itens: unknown): itens is ItemParaSalvar[] {
  return (
    Array.isArray(itens) &&
    itens.length <= LIMITE_ITENS &&
    itens.every(
      (i) =>
        i &&
        typeof i.chave === "string" &&
        i.chave.length > 0 &&
        i.chave.length <= 300 &&
        typeof i.descricao === "string" &&
        i.descricao.trim().length > 0 &&
        Number.isFinite(i.quantidade) &&
        Number.isFinite(i.valor) &&
        (i.receitaId === null || typeof i.receitaId === "string"),
    )
  );
}

/** Grava as decisões da importação, inclusive os produtos sem decisão (viram pendência visível). */
export async function acaoSalvarProdutosPdv(itens: ItemParaSalvar[]): Promise<ResultadoSalvar> {
  const cliente = await getClienteAtual();
  if (!cliente) return { ok: false, erro: "Sessão expirada. Faça login novamente." };
  if (!ehGestao(cliente.papel)) return { ok: false, erro: "Só dono e gestor ligam produtos do PDV às fichas." };
  if (!itensValidos(itens)) return { ok: false, erro: "Lista de produtos inválida." };
  try {
    const pendentes = await salvarProdutosPdv(itens);
    revalidatePath("/integracoes");
    revalidatePath("/cmv");
    return { ok: true, pendentes };
  } catch (e) {
    return { ok: false, erro: erroDe(e) };
  }
}

/** Resolve um produto pendente (ou muda a decisão): id da ficha, "sem-ficha" ou null. */
export async function acaoResolverProdutoPdv(id: string, destino: string | null): Promise<Resultado> {
  const cliente = await getClienteAtual();
  if (!cliente) return { ok: false, erro: "Sessão expirada. Faça login novamente." };
  if (!ehGestao(cliente.papel)) return { ok: false, erro: "Só dono e gestor ligam produtos do PDV às fichas." };
  if (typeof id !== "string" || !id) return { ok: false, erro: "Produto inválido." };
  try {
    await resolverProdutoPdv(id, destino);
    revalidatePath("/integracoes");
    revalidatePath("/cmv");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: erroDe(e) };
  }
}
