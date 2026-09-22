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

import { createClient } from "@/lib/supabase/server";

async function registrarSaidaEstoqueProducao(
  clienteId: string,
  receitaId: string,
  lote: string,
  nomeReceita: string,
): Promise<void> {
  try {
    const supabase = await createClient();

    const { data: itensFicha } = await supabase
      .from("receita_insumos")
      .select("insumo_id, sub_receita_id, peso_liquido")
      .eq("receita_id", receitaId);

    if (!itensFicha || itensFicha.length === 0) return;

    for (const item of itensFicha) {
      if (item.insumo_id) {
        const qtd = Number(item.peso_liquido);
        if (qtd > 0) {
          try {
            await supabase.rpc("ajustar_saldo_estoque", {
              p_insumo_id: item.insumo_id,
              p_delta: -qtd,
            });
            await supabase.from("movimentacoes_estoque").insert({
              insumo_id: item.insumo_id,
              tipo: "ajuste",
              quantidade: qtd,
              origem: `Produção — lote ${lote} (${nomeReceita})`,
            });
          } catch (eRpc) {
            console.error("Erro ao registrar saída de estoque para insumo:", item.insumo_id, eRpc);
          }
        }
      } else if (item.sub_receita_id) {
        try {
          const { data: subItens } = await supabase
            .from("receita_insumos")
            .select("insumo_id, peso_liquido")
            .eq("receita_id", item.sub_receita_id);

          if (subItens) {
            for (const subItem of subItens) {
              if (subItem.insumo_id) {
                const qtdSub = Number(subItem.peso_liquido);
                if (qtdSub > 0) {
                  await supabase.rpc("ajustar_saldo_estoque", {
                    p_insumo_id: subItem.insumo_id,
                    p_delta: -qtdSub,
                  });
                  await supabase.from("movimentacoes_estoque").insert({
                    insumo_id: subItem.insumo_id,
                    tipo: "ajuste",
                    quantidade: qtdSub,
                    origem: `Produção — lote ${lote} (${nomeReceita})`,
                  });
                }
              }
            }
          }
        } catch (eSub) {
          console.error("Erro ao registrar saída de sub-receita:", eSub);
        }
      }
    }
  } catch (err) {
    console.error("Erro ao registrar saída de estoque para produção:", err);
  }
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
    let loteCriado = "";
    await criarProducaoComLoteAutomatico(cliente.id, receitaId, (sequencia): ProducaoInput => {
      const lote = gerarLote(nomeReceita, sequencia);
      loteCriado = lote;
      return {
        lote,
        tipo,
        receitaId,
        quantidade: rendimento,
        responsavel: "A definir",
        turnoId,
        chefeTurno,
        validade: null,
      };
    });

    if (loteCriado) {
      await registrarSaidaEstoqueProducao(cliente.id, receitaId, loteCriado, nomeReceita);
    }

    revalidatePath("/producoes");
    revalidatePath("/estoque");
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
    await registrarSaidaEstoqueProducao(cliente.id, input.receitaId, input.lote, "Produção manual");
    revalidatePath("/producoes");
    revalidatePath("/estoque");
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
