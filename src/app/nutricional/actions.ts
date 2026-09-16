"use server";

import { revalidatePath } from "next/cache";
import {
  salvarValoresNutricionaisInsumo,
  salvarNutricionalOverride,
  removerNutricionalOverride,
  salvarRotulagem,
} from "@/lib/dados/nutricional";
import type { NutricionalOverrideInput, RotulagemInput, ValoresNutricionaisInsumoInput } from "@/lib/dominio/nutricional";

export type Resultado = { ok: true } | { ok: false; erro: string };

function paraResultado(e: unknown): Resultado {
  return { ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido." };
}

export async function acaoSalvarValoresInsumo(insumoId: string, input: ValoresNutricionaisInsumoInput): Promise<Resultado> {
  try {
    await salvarValoresNutricionaisInsumo(insumoId, input);
    revalidatePath("/nutricional");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoSalvarOverride(receitaId: string, input: NutricionalOverrideInput): Promise<Resultado> {
  try {
    await salvarNutricionalOverride(receitaId, input);
    revalidatePath("/nutricional");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoRemoverOverride(receitaId: string): Promise<Resultado> {
  try {
    await removerNutricionalOverride(receitaId);
    revalidatePath("/nutricional");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoSalvarRotulagem(receitaId: string, input: RotulagemInput): Promise<Resultado> {
  try {
    await salvarRotulagem(receitaId, input);
    revalidatePath("/nutricional");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}
