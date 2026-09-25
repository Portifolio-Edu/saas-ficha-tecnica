"use server";

// ESCALAS (2026-09-26): ações da tela Escalas. Só dono e gestor; tudo passa
// pela mesma validação da tela (src/lib/escalas/validacao.ts) e o banco
// repete as travas (trigger + RLS). Depois de gravar, /escalas e /cozinha
// recarregam (o tablet mostra a escala nova sozinho).

import { revalidatePath } from "next/cache";
import { getClienteAtual } from "@/lib/dados/cliente";
import { ehGestao } from "@/lib/auth/papeis";
import { criarOcorrencia, removerOcorrencia, salvarPessoaEscala, salvarRegrasEscala } from "@/lib/dados/escalas";
import { validarCadastro, validarOcorrencia, type CadastroEscalaInput, type OcorrenciaInput } from "@/lib/escalas/validacao";
import type { RegrasEscala } from "@/lib/escalas/tipos";

export type ResultadoEscala<T = undefined> = { ok: true; dados?: T } | { ok: false; erro: string };

const erro = (e: unknown): { ok: false; erro: string } => ({ ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido." });

async function exigirGestao() {
  const cliente = await getClienteAtual();
  if (!cliente) throw new Error("Sessão expirada. Faça login novamente.");
  if (!ehGestao(cliente.papel)) throw new Error("Só o dono e o gestor mexem na escala.");
  return cliente;
}

function recarregar() {
  revalidatePath("/escalas");
  revalidatePath("/cozinha");
}

export async function acaoSalvarPessoaEscala(id: string | null, c: CadastroEscalaInput): Promise<ResultadoEscala<{ id: string }>> {
  try {
    await exigirGestao();
    const problema = validarCadastro(c);
    if (problema) return { ok: false, erro: problema };
    const novoId = await salvarPessoaEscala(id, c);
    recarregar();
    return { ok: true, dados: { id: novoId } };
  } catch (e) {
    return erro(e);
  }
}

export async function acaoSalvarRegrasEscala(r: RegrasEscala): Promise<ResultadoEscala> {
  try {
    const cliente = await exigirGestao();
    if (!(Number.isInteger(r.intervaloDomingoSemanas) && r.intervaloDomingoSemanas >= 1 && r.intervaloDomingoSemanas <= 7)) {
      return { ok: false, erro: "Rodízio de domingo entre 1 e 7 semanas." };
    }
    const cobertura: Record<string, number> = {};
    for (const [k, v] of Object.entries(r.coberturaMinima)) {
      if (!/^(cozinha|salao|bar|outro):.{1,40}$/.test(k) || !Number.isInteger(v) || v < 0 || v > 50) return { ok: false, erro: "Cobertura mínima inválida." };
      if (v > 0) cobertura[k] = v;
    }
    await salvarRegrasEscala(cliente.id, { intervaloDomingoSemanas: r.intervaloDomingoSemanas, coberturaMinima: cobertura });
    recarregar();
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

export async function acaoCriarOcorrencia(o: OcorrenciaInput): Promise<ResultadoEscala> {
  try {
    const cliente = await exigirGestao();
    const problema = validarOcorrencia(o);
    if (problema) return { ok: false, erro: problema };
    await criarOcorrencia(cliente.id, o);
    recarregar();
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

export async function acaoRemoverOcorrencia(id: string): Promise<ResultadoEscala> {
  try {
    await exigirGestao();
    await removerOcorrencia(id);
    recarregar();
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}
