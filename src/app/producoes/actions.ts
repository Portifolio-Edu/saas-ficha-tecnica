"use server";

import { revalidatePath } from "next/cache";
import { getClienteAtual } from "@/lib/dados/cliente";
import { criarProducaoComLoteAutomatico, criarProducao, atualizarStatusProducao } from "@/lib/dados/producoes";
import { listarInsumos } from "@/lib/dados/insumos";
import { listarReceitas } from "@/lib/dados/receitas";
import { listarProcessamentos } from "@/lib/dados/processamentos";
import { registrarMovimentacao } from "@/lib/dados/estoque";
import { consumoDeInsumosDaProducao } from "@/lib/calculo/consumoProducao";
import { gerarLote } from "@/lib/calculo/lote";
import type { ProducaoInput, StatusProducao, TipoItemProducao } from "@/lib/dominio/producao";
import { adicionarAoPlano, tirarDoPlano } from "@/lib/dados/planoProducao";
import { validarItemPlano } from "@/lib/dominio/planoProducao";
import { hojeLocalISO } from "@/lib/calculo/dia";
import { ehGestao } from "@/lib/auth/papeis";

export type Resultado = { ok: true } | { ok: false; erro: string };

function paraResultado(e: unknown): Resultado {
  return { ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido." };
}

/**
 * Baixa do estoque o que o lote consome (peso bruto, sub-receitas na proporção
 * usada). Só mexe em insumo com estoque rastreado -- os outros não têm saldo
 * pra abater. Devolve os insumos cuja baixa falhou, pra a ação avisar em vez
 * de fingir sucesso: a produção já foi gravada, e o gerente precisa saber que
 * o saldo ficou desatualizado.
 */
async function baixarEstoqueDaProducao(receitaId: string, quantidade: number, lote: string): Promise<string[]> {
  const [insumos, receitas, processamentos] = await Promise.all([listarInsumos(), listarReceitas(), listarProcessamentos()]);
  const receitaPorId = new Map(receitas.map((r) => [r.id, r]));
  const insumoPorId = new Map(insumos.map((i) => [i.id, i]));
  const receita = receitaPorId.get(receitaId);
  if (!receita) return [];

  const consumos = consumoDeInsumosDaProducao(receita, quantidade, receitaPorId, insumoPorId, processamentos)
    .filter((c) => insumoPorId.get(c.insumoId)?.estoque);

  const falhas: string[] = [];
  for (const c of consumos) {
    try {
      await registrarMovimentacao(c.insumoId, "saida_producao", c.quantidade, `Produção — lote ${lote} (${receita.nomePrato})`);
    } catch (e) {
      falhas.push(`${c.nome}: ${e instanceof Error ? e.message : "erro desconhecido"}`);
    }
  }
  return falhas;
}

function resultadoComBaixa(falhas: string[]): Resultado {
  if (falhas.length === 0) return { ok: true };
  return { ok: false, erro: `Produção registrada, mas a baixa de estoque falhou em ${falhas.length} insumo(s): ${falhas.join("; ")}` };
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
  if (!cliente) return { ok: false, erro: "Sessão expirada. Faça login novamente." };
  try {
    let loteCriado = "";
    await criarProducaoComLoteAutomatico(cliente.id, receitaId, (sequencia): ProducaoInput => {
      loteCriado = gerarLote(nomeReceita, sequencia);
      return {
        lote: loteCriado,
        tipo,
        receitaId,
        quantidade: rendimento,
        responsavel: "A definir",
        turnoId,
        chefeTurno,
        validade: null,
      };
    });

    const falhas = await baixarEstoqueDaProducao(receitaId, rendimento, loteCriado);
    revalidatePath("/producoes");
    revalidatePath("/estoque");
    return resultadoComBaixa(falhas);
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoRegistrarProducao(input: ProducaoInput): Promise<Resultado> {
  const cliente = await getClienteAtual();
  if (!cliente) return { ok: false, erro: "Sessão expirada. Faça login novamente." };
  try {
    await criarProducao(cliente.id, input);
    const falhas = await baixarEstoqueDaProducao(input.receitaId, input.quantidade, input.lote);
    revalidatePath("/producoes");
    revalidatePath("/estoque");
    return resultadoComBaixa(falhas);
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoAtualizarStatusProducao(id: string, status: StatusProducao, motivoPerda: string | null = null): Promise<Resultado> {
  try {
    await atualizarStatusProducao(id, status, motivoPerda);
    revalidatePath("/producoes");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

// LISTA DE PRODUÇÃO (2026-09-26): dono e gestor montam a lista do dia (ou de
// amanhã) que aparece embaixo do quadro de Produção no tablet.
export type ResultadoPlano = { ok: true; aviso?: string } | { ok: false; erro: string };

async function exigirGestaoPlano() {
  const cliente = await getClienteAtual();
  if (!cliente) throw new Error("Sessão expirada. Faça login novamente.");
  if (!ehGestao(cliente.papel)) throw new Error("Só o dono e o gestor montam a lista de produção.");
  return cliente;
}

function dataValida(data: string): boolean {
  const hoje = hojeLocalISO();
  const amanha = hojeLocalISO(new Date(Date.now() + 86_400_000));
  return data === hoje || data === amanha;
}

export async function acaoPlanoAdicionar(data: string, receitaId: string, quantidade: number, observacao: string | null): Promise<ResultadoPlano> {
  try {
    const cliente = await exigirGestaoPlano();
    if (!dataValida(data)) throw new Error("A lista é de hoje ou de amanhã.");
    const problema = validarItemPlano({ receitaId, quantidade, observacao });
    if (problema) throw new Error(problema);
    const { aviso } = await adicionarAoPlano(cliente.id, { data, receitaId, quantidade, observacao, responsavel: cliente.nomeMembro || cliente.nome });
    revalidatePath("/producoes");
    revalidatePath("/cozinha");
    return aviso ? { ok: true, aviso } : { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function acaoPlanoTirar(id: string): Promise<ResultadoPlano> {
  try {
    await exigirGestaoPlano();
    await tirarDoPlano(id);
    revalidatePath("/producoes");
    revalidatePath("/cozinha");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}
