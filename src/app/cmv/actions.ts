"use server";

import { revalidatePath } from "next/cache";
import { getClienteAtual } from "@/lib/dados/cliente";
import { criarFechamento } from "@/lib/dados/fechamentosCmv";
import type { NovoFechamentoInput } from "@/lib/dominio/fechamentoCmv";

export type Resultado = { ok: true } | { ok: false; erro: string };

function paraResultado(e: unknown): Resultado {
  return { ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido." };
}

export async function acaoCriarFechamento(input: NovoFechamentoInput): Promise<Resultado> {
  const cliente = await getClienteAtual();
  if (!cliente) return { ok: false, erro: "Sessão expirada. Faça login novamente." };
  try {
    await criarFechamento(cliente.id, input);
    revalidatePath("/cmv");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}
