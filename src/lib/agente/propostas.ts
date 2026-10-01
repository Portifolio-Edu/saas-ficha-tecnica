// AGENTE IA (2026-09-26): o agente nunca grava direto. Ele PROPÕE (linha em
// agente_acoes) e a pessoa confirma — no chat ("sim") ou no botão da tela.
// Aplicar roda COMO a pessoa (comoUsuario), pela RLS dela: estoquista não
// grava o que a tela dele não deixa. Confirmar é em dois passos (pendente →
// "aplicando" → resultado), então um "sim" repetido não aplica duas vezes.
import { createClient } from "@/lib/supabase/server";
import { registrarMovimentacao, rastrearInsumo } from "@/lib/dados/estoque";
import { salvarValoresNutricionaisInsumo } from "@/lib/dados/nutricional";
import { criarRequisicao } from "@/lib/dados/requisicoes";
import { adicionarAoPlano } from "@/lib/dados/planoProducao";
import { mensagemErro } from "@/lib/dados/erros";
import type { CategoriaPedido, UnidadePedido } from "@/lib/dominio/requisicao";
import type { ValoresNutricionais } from "@/lib/calculo/nutricional";
import type { ItemEntrada } from "./entradaNota";
import type { PasseAgente } from "./passe";
import { ErroFerramenta } from "./erro";

export type TipoProposta = "entrada_estoque" | "valores_nutricionais" | "pedido_compra" | "perda_estoque" | "lista_producao";

export interface DadosEntrada {
  itens: ItemEntrada[];
  fornecedor: string | null;
  numeroNota: string | null;
  atualizarPrecos: boolean;
}
export interface DadosNutricionais {
  insumoId: string;
  insumoNome: string;
  baseGramas: number;
  valores: Partial<ValoresNutricionais>;
}
export interface DadosPedido {
  itens: { categoria: CategoriaPedido; insumoId: string | null; descricao: string; quantidade: number | null; unidade: UnidadePedido | null; observacao: string | null }[];
}
export interface DadosPerda {
  insumoId: string;
  insumoNome: string;
  quantidade: number;
  unidade: string;
  motivo: string;
}
export interface DadosListaProducao {
  data: string;
  itens: { receitaId: string; receitaNome: string; quantidade: number; unidade: string; observacao: string | null }[];
}

export interface Proposta {
  id: string;
  tipo: TipoProposta;
  resumo: string;
  status: "pendente" | "confirmada" | "cancelada" | "falhou";
  resultado: string | null;
  criadoEm: string;
}

export async function criarProposta(passe: PasseAgente, tipo: TipoProposta, resumo: string, dados: object): Promise<Proposta> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agente_acoes")
    .insert({ cliente_id: passe.c, user_id: passe.u, tipo, resumo: resumo.slice(0, 1500), dados, canal: passe.canal })
    .select("id, tipo, resumo, status, resultado, criado_em")
    .single();
  if (error) throw new Error(mensagemErro(error));
  return { id: data.id, tipo: data.tipo, resumo: data.resumo, status: data.status, resultado: data.resultado, criadoEm: data.criado_em };
}

export async function listarPropostasPendentes(passe: PasseAgente): Promise<Proposta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agente_acoes")
    .select("id, tipo, resumo, status, resultado, criado_em")
    .eq("user_id", passe.u)
    .eq("status", "pendente")
    .order("criado_em", { ascending: false })
    .limit(10);
  if (error) throw new Error(mensagemErro(error));
  return ((data ?? []) as { id: string; tipo: TipoProposta; resumo: string; status: Proposta["status"]; resultado: string | null; criado_em: string }[]).map((d) => ({ id: d.id, tipo: d.tipo, resumo: d.resumo, status: d.status, resultado: d.resultado, criadoEm: d.criado_em }));
}

export async function cancelarProposta(passe: PasseAgente, id: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agente_acoes")
    .update({ status: "cancelada", resultado: "Cancelada pela pessoa." })
    .eq("id", id)
    .eq("user_id", passe.u)
    .eq("status", "pendente")
    .select("id");
  if (error) throw new Error(mensagemErro(error));
  if (!data?.length) throw new ErroFerramenta("Essa proposta não está mais pendente.");
  return "Cancelada. Nada foi gravado.";
}

/** Aplica a proposta e devolve o que foi feito (texto pro agente/tela). */
export async function confirmarProposta(passe: PasseAgente, id: string): Promise<string> {
  const supabase = await createClient();
  const { data: travada, error } = await supabase
    .from("agente_acoes")
    .update({ status: "confirmada", resultado: "aplicando" })
    .eq("id", id)
    .eq("user_id", passe.u)
    .eq("status", "pendente")
    .select("id, tipo, dados")
    .maybeSingle();
  if (error) throw new Error(mensagemErro(error));
  if (!travada) throw new ErroFerramenta("Essa proposta não está mais pendente (já foi confirmada ou cancelada).");

  try {
    const resultado = await aplicar(passe, travada.tipo as TipoProposta, travada.dados);
    await supabase.from("agente_acoes").update({ status: "confirmada", resultado }).eq("id", id);
    return resultado;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido.";
    await supabase.from("agente_acoes").update({ status: "falhou", resultado: msg.slice(0, 1500) }).eq("id", id);
    throw new Error(`Não deu pra gravar: ${msg}`);
  }
}

async function aplicar(passe: PasseAgente, tipo: TipoProposta, dados: unknown): Promise<string> {
  switch (tipo) {
    case "entrada_estoque":
      return aplicarEntrada(dados as DadosEntrada);
    case "valores_nutricionais": {
      const d = dados as DadosNutricionais;
      await salvarValoresNutricionaisInsumo(d.insumoId, { baseGramas: d.baseGramas, valores: d.valores });
      return `Tabela nutricional de ${d.insumoNome} salva (por ${d.baseGramas} g).`;
    }
    case "pedido_compra": {
      const d = dados as DadosPedido;
      for (const item of d.itens) await criarRequisicao(passe.c, item, passe.n);
      return `${d.itens.length} ${d.itens.length === 1 ? "item entrou" : "itens entraram"} nos pedidos de compra.`;
    }
    case "perda_estoque": {
      const d = dados as DadosPerda;
      await registrarMovimentacao(d.insumoId, "ajuste", d.quantidade, `Perda: ${d.motivo} (agente IA, ${passe.n})`);
      return `Perda de ${d.quantidade} ${d.unidade} de ${d.insumoNome} registrada.`;
    }
    case "lista_producao": {
      const d = dados as DadosListaProducao;
      const avisos: string[] = [];
      for (const item of d.itens) {
        const r = await adicionarAoPlano(passe.c, { data: d.data, receitaId: item.receitaId, quantidade: item.quantidade, observacao: item.observacao, responsavel: passe.n });
        if (r.aviso) avisos.push(`${item.receitaNome}: ${r.aviso}`);
      }
      return `Lista de produção de ${d.data} atualizada (${d.itens.length} ${d.itens.length === 1 ? "item" : "itens"}).${avisos.length ? ` ${avisos.join(" ")}` : ""}`;
    }
  }
}

async function aplicarEntrada(d: DadosEntrada): Promise<string> {
  const supabase = await createClient();
  const origem = `Nota${d.numeroNota ? ` ${d.numeroNota}` : ""}${d.fornecedor ? ` — ${d.fornecedor}` : ""} (agente IA)`;
  const precos: string[] = [];
  for (const item of d.itens) {
    const { data: estoque } = await supabase.from("estoque").select("insumo_id").eq("insumo_id", item.insumoId).maybeSingle();
    if (!estoque) {
      // Insumo ainda não rastreado: passa a ser, com o que chegou.
      await rastrearInsumo(item.insumoId, 0, 0);
    }
    await registrarMovimentacao(item.insumoId, "entrada", item.quantidade, origem);

    if (d.atualizarPrecos && item.precoUnitarioNovo !== null && Math.abs(item.precoUnitarioNovo - item.precoUnitarioAtual) / Math.max(item.precoUnitarioAtual, 0.0001) > 0.005) {
      const { data: ins, error } = await supabase.from("insumos").select("tamanho_embalagem, preco_unitario").eq("id", item.insumoId).single();
      if (error) throw new Error(mensagemErro(error));
      const novoEmbalagem = Math.round(item.precoUnitarioNovo * Number(ins.tamanho_embalagem) * 100) / 100;
      const { error: erroPreco } = await supabase.from("insumos").update({ preco_embalagem: novoEmbalagem }).eq("id", item.insumoId);
      if (erroPreco) throw new Error(mensagemErro(erroPreco));
      await supabase.from("historico_preco_insumo").insert({ insumo_id: item.insumoId, preco_anterior: Number(ins.preco_unitario), preco_novo: item.precoUnitarioNovo });
      precos.push(`${item.insumoNome} R$ ${Number(ins.preco_unitario).toFixed(2)} → R$ ${item.precoUnitarioNovo.toFixed(2)}/${item.unidade}`);
    }
  }
  return `Entrada de ${d.itens.length} ${d.itens.length === 1 ? "item" : "itens"} no estoque.${precos.length ? ` Preços atualizados: ${precos.join("; ")}.` : ""}`;
}
