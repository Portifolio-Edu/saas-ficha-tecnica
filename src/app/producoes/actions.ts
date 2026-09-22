"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getClienteAtual } from "@/lib/dados/cliente";
import { criarProducaoComLoteAutomatico, criarProducao, atualizarStatusProducao } from "@/lib/dados/producoes";
import type { ProducaoInput, StatusProducao, TipoItemProducao } from "@/lib/dominio/producao";

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

function gerarLote(nome: string, sequencia: number): string {
  const agora = new Date();
  const dd = String(agora.getDate()).padStart(2, "0");
  const mm = String(agora.getMonth() + 1).padStart(2, "0");
  const sigla = nome
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const seq = String(sequencia).padStart(2, "0");
  return `${sigla}-${dd}${mm}-${seq}`;
}

/** "Iniciar produção" a partir de um card de capacidade do quadro (clique ou
 * drag da coluna "Em estoque"): gera o lote sozinho, mesma lógica do mockup. */
export async function acaoIniciarProducao(
  receitaId: string,
  tipo: TipoItemProducao,
  nomeReceita: string,
  rendimento: number,
  turnoId: string | null,
  chefeTurno: string | null,
): Promise<Resultado> {
  const cliente = await getClienteAtual();
  if (!cliente) {
    if (await isRequisicaoPreview()) return { ok: true };
    return { ok: false, erro: "Sessão expirada. Faça login novamente." };
  }
  try {
    await criarProducaoComLoteAutomatico(cliente.id, receitaId, (sequencia): ProducaoInput => ({
      lote: gerarLote(nomeReceita, sequencia),
      tipo,
      receitaId,
      quantidade: rendimento,
      responsavel: "A definir",
      turnoId,
      chefeTurno,
      validade: null,
    }));
    revalidatePath("/producoes");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoRegistrarProducao(input: ProducaoInput): Promise<Resultado> {
  const cliente = await getClienteAtual();
  if (!cliente) {
    if (await isRequisicaoPreview()) return { ok: true };
    return { ok: false, erro: "Sessão expirada. Faça login novamente." };
  }
  try {
    await criarProducao(cliente.id, input);
    revalidatePath("/producoes");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoAtualizarStatusProducao(id: string, status: StatusProducao, motivoPerda: string | null = null): Promise<Resultado> {
  if (id.startsWith("demo-") || (await isRequisicaoPreview())) {
    return { ok: true };
  }
  try {
    await atualizarStatusProducao(id, status, motivoPerda);
    revalidatePath("/producoes");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}
