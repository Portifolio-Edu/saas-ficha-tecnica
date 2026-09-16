"use server";

import { revalidatePath } from "next/cache";
import { criarProcessamento } from "@/lib/dados/processamentos";
import type { ProcessamentoInput } from "@/lib/dominio/processamento";

export type Resultado = { ok: true } | { ok: false; erro: string };

function paraResultado(e: unknown): Resultado {
  return { ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido." };
}

export async function acaoCriarProcessamento(input: ProcessamentoInput): Promise<Resultado> {
  try {
    await criarProcessamento(input);
    revalidatePath("/proteinas");
    revalidatePath("/insumos");
    revalidatePath("/receitas");
    revalidatePath("/producoes");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}
