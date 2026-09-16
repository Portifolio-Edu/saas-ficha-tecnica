"use server";

import { revalidatePath } from "next/cache";
import { getClienteAtual } from "@/lib/dados/cliente";
import {
  criarLocalArmazenamento,
  atualizarLocalArmazenamento,
  excluirLocalArmazenamento,
  registrarTemperatura,
} from "@/lib/dados/temperatura";
import type { LocalArmazenamentoInput, RegistroTemperaturaInput } from "@/lib/dominio/temperatura";

export type Resultado = { ok: true } | { ok: false; erro: string };

function paraResultado(e: unknown): Resultado {
  return { ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido." };
}

export async function acaoCriarLocal(input: LocalArmazenamentoInput): Promise<Resultado> {
  const cliente = await getClienteAtual();
  if (!cliente) return { ok: false, erro: "Sessão expirada. Faça login novamente." };
  try {
    await criarLocalArmazenamento(cliente.id, input);
    revalidatePath("/seguranca");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoAtualizarLocal(id: string, input: LocalArmazenamentoInput): Promise<Resultado> {
  try {
    await atualizarLocalArmazenamento(id, input);
    revalidatePath("/seguranca");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoExcluirLocal(id: string): Promise<Resultado> {
  try {
    await excluirLocalArmazenamento(id);
    revalidatePath("/seguranca");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoRegistrarTemperatura(input: RegistroTemperaturaInput): Promise<Resultado> {
  try {
    await registrarTemperatura(input);
    revalidatePath("/seguranca");
    revalidatePath("/relatorios");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}
