"use server";

import { revalidatePath } from "next/cache";
import { getClienteAtual } from "@/lib/dados/cliente";
import { rastrearInsumo, atualizarEstoque, pararDeRastrear, registrarMovimentacao } from "@/lib/dados/estoque";
import { criarFornecedor, atualizarFornecedor, excluirFornecedor } from "@/lib/dados/fornecedores";
import type { FornecedorInput } from "@/lib/dominio/fornecedor";

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
  try {
    await criarFornecedor(cliente.id, input);
    revalidatePath("/estoque");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoAtualizarFornecedor(id: string, input: FornecedorInput): Promise<Resultado> {
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
