"use server";

import { revalidatePath } from "next/cache";
import { getClienteAtual } from "@/lib/dados/cliente";
import { rastrearInsumo, atualizarEstoque, pararDeRastrear, registrarMovimentacao, aplicarContagem, descartarContagem } from "@/lib/dados/estoque";
import { ehGestao } from "@/lib/auth/papeis";
import { criarFornecedor, atualizarFornecedor, excluirFornecedor } from "@/lib/dados/fornecedores";
import { validarFornecedor, type FornecedorInput } from "@/lib/dominio/fornecedor";
import { resolverRequisicoes } from "@/lib/dados/requisicoes";
import type { StatusRequisicao } from "@/lib/dominio/requisicao";

export type Resultado = { ok: true } | { ok: false; erro: string };

function paraResultado(e: unknown): Resultado {
  return { ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido." };
}

export async function acaoRastrearInsumo(insumoId: string, saldoAtual: number, estoqueMinimo: number): Promise<Resultado> {
  try {
    await rastrearInsumo(insumoId, saldoAtual, estoqueMinimo);
    revalidatePath("/estoque");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoAtualizarEstoque(insumoId: string, saldoAtual: number, estoqueMinimo: number): Promise<Resultado> {
  try {
    await atualizarEstoque(insumoId, saldoAtual, estoqueMinimo);
    revalidatePath("/estoque");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoPararDeRastrear(insumoId: string): Promise<Resultado> {
  try {
    await pararDeRastrear(insumoId);
    revalidatePath("/estoque");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoRegistrarMovimentacao(
  insumoId: string,
  tipo: "entrada" | "ajuste" | "saida_producao",
  quantidade: number,
  origem: string
): Promise<Resultado> {
  try {
    await registrarMovimentacao(insumoId, tipo, quantidade, origem);
    revalidatePath("/estoque");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoCriarFornecedor(input: FornecedorInput): Promise<Resultado> {
  const cliente = await getClienteAtual();
  if (!cliente) return { ok: false, erro: "Sessão expirada. Faça login novamente." };
  const problema = validarFornecedor(input);
  if (problema) return { ok: false, erro: problema };
  try {
    await criarFornecedor(cliente.id, input);
    revalidatePath("/estoque");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoAtualizarFornecedor(id: string, input: FornecedorInput): Promise<Resultado> {
  const problema = validarFornecedor(input);
  if (problema) return { ok: false, erro: problema };
  try {
    await atualizarFornecedor(id, input);
    revalidatePath("/estoque");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoExcluirFornecedor(id: string): Promise<Resultado> {
  try {
    await excluirFornecedor(id);
    revalidatePath("/estoque");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

// EQUIPE (2026-09-25): contagem cega — só dono e gestor aplicam ou descartam
// (a RLS também barra o estoquista).
export async function acaoAplicarContagem(contagemId: string): Promise<Resultado> {
  const cliente = await getClienteAtual();
  if (!cliente || !ehGestao(cliente.papel)) return { ok: false, erro: "Só o dono e o gestor ajustam o estoque pela contagem." };
  try {
    await aplicarContagem(contagemId, cliente.userId);
    revalidatePath("/estoque");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoDescartarContagem(contagemId: string): Promise<Resultado> {
  const cliente = await getClienteAtual();
  if (!cliente || !ehGestao(cliente.papel)) return { ok: false, erro: "Só o dono e o gestor descartam contagens." };
  try {
    await descartarContagem(contagemId);
    revalidatePath("/estoque");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

// PEDIDOS DA COZINHA (2026-09-26): quem compra marca os itens pedidos pela
// cozinha (a RLS só deixa dono, gestor e estoquista).
export async function acaoResolverRequisicoes(ids: string[], status: StatusRequisicao): Promise<Resultado> {
  const cliente = await getClienteAtual();
  if (!cliente) return { ok: false, erro: "Sessão expirada. Faça login novamente." };
  if (cliente.papel === "cozinha") return { ok: false, erro: "Quem marca a compra é o estoque ou a gestão." };
  try {
    const n = await resolverRequisicoes(ids, status);
    if (n === 0 && ids.length) return { ok: false, erro: "Nada foi alterado. Atualize a página e tente de novo." };
    revalidatePath("/estoque");
    revalidatePath("/cozinha");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}
