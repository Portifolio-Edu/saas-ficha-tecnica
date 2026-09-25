import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "./erros";
import type { FichaCozinha, ItemContagem, ProducaoCozinha } from "@/lib/dominio/cozinha";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";
import type { Processamento } from "@/lib/dominio/processamento";
import type { LocalArmazenamento } from "@/lib/dominio/temperatura";
import type { StatusProducao } from "@/lib/dominio/producao";
import type { UnidadeMedida } from "@/lib/calculo/types";

// EQUIPE (2026-09-25): dados do modo cozinha. Tudo sai de dados_cozinha(),
// função do banco que devolve fichas, insumos e FC SEM preço e SEM saldo — a
// sessão da cozinha não lê as tabelas de receitas, insumos nem estoque.

interface LinhaFichaRpc {
  id: string;
  insumo_id: string | null;
  sub_receita_id: string | null;
  peso_liquido: number;
  unidade: UnidadeMedida;
}

interface ReceitaRpc {
  id: string;
  nome_prato: string;
  tipo: "prato_final" | "preparo_base";
  categoria: string | null;
  rendimento: number;
  unidade_rendimento: string;
  peso_porcao_g: number | null;
  modo_preparo: string | null;
  foto_url: string | null;
  ficha: LinhaFichaRpc[];
  etapas: { id: string; ordem: number; titulo: string | null; texto: string | null; foto_url: string | null }[];
}

interface InsumoRpc {
  id: string;
  nome: string;
  categoria: Insumo["categoria"];
  unidade_medida: UnidadeMedida;
  fator_correcao: number;
  peso_por_unidade: number | null;
  local_armazenamento_id: string | null;
  tem_estoque: boolean;
}

interface DadosRpc {
  receitas: ReceitaRpc[];
  insumos: InsumoRpc[];
  processamentos: { insumo_id: string; peso_bruto_recebido: number; peso_liquido_resultante: number; processado_em: string }[];
}

export interface DadosCozinha {
  fichas: FichaCozinha[];
  /** Mesmos dados no formato do motor de cálculo (preço zerado), pra calcular a baixa da produção. */
  receitasCalc: Receita[];
  insumosCalc: Insumo[];
  processamentosCalc: Processamento[];
  insumosComEstoque: InsumoRpc[];
}

export async function carregarDadosCozinha(): Promise<DadosCozinha> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dados_cozinha");
  if (error) throw new Error(mensagemErro(error));
  const dados = data as DadosRpc;

  const nomeInsumo = new Map(dados.insumos.map((i) => [i.id, i.nome]));
  const nomeReceita = new Map(dados.receitas.map((r) => [r.id, r.nome_prato]));

  const fichas: FichaCozinha[] = dados.receitas.map((r) => ({
    id: r.id,
    nome: r.nome_prato,
    tipo: r.tipo,
    categoria: r.categoria,
    rendimento: Number(r.rendimento),
    unidadeRendimento: r.unidade_rendimento,
    pesoPorcaoG: r.peso_porcao_g == null ? null : Number(r.peso_porcao_g),
    modoPreparo: r.modo_preparo,
    fotoUrl: r.foto_url,
    ingredientes: r.ficha.map((l) => ({
      id: l.id,
      nome: (l.insumo_id ? nomeInsumo.get(l.insumo_id) : nomeReceita.get(l.sub_receita_id ?? "")) ?? "Item removido",
      quantidade: Number(l.peso_liquido),
      unidade: l.unidade,
      ehPreparo: !l.insumo_id,
    })),
    etapas: r.etapas.map((e) => ({ ordem: e.ordem, titulo: e.titulo, texto: e.texto, fotoUrl: e.foto_url })),
  }));

  const receitasCalc: Receita[] = dados.receitas.map((r) => ({
    id: r.id,
    nomePrato: r.nome_prato,
    tipo: r.tipo,
    categoria: r.categoria,
    precoVenda: null,
    vendasMes: null,
    rendimento: Number(r.rendimento),
    unidadeRendimento: r.unidade_rendimento,
    pesoPorcaoG: r.peso_porcao_g == null ? null : Number(r.peso_porcao_g),
    formaFisica: "solido",
    destinoVenda: "proprio",
    margemAlvo: null,
    modoPreparo: r.modo_preparo,
    fotoUrl: r.foto_url,
    ficha: r.ficha.map((l) => ({ id: l.id, insumoId: l.insumo_id, subReceitaId: l.sub_receita_id, pesoLiquido: Number(l.peso_liquido), unidade: l.unidade })),
    etapas: [],
  }));

  const insumosCalc: Insumo[] = dados.insumos.map((i) => ({
    id: i.id,
    nome: i.nome,
    categoria: i.categoria,
    unidadeMedida: i.unidade_medida,
    tamanhoEmbalagem: 1,
    precoEmbalagem: 0,
    precoUnitario: 0,
    fatorCorrecao: Number(i.fator_correcao),
    pesoPorUnidade: i.peso_por_unidade == null ? null : Number(i.peso_por_unidade),
    localArmazenamentoId: i.local_armazenamento_id,
    // O saldo não vem (a cozinha não vê); só importa saber se o item é rastreado.
    estoque: i.tem_estoque ? { saldoAtual: 0, estoqueMinimo: 0 } : null,
  }));

  const processamentosCalc: Processamento[] = dados.processamentos.map((p, n) => ({
    id: `p${n}`,
    insumoId: p.insumo_id,
    responsavel: "",
    pesoBrutoRecebido: Number(p.peso_bruto_recebido),
    valorPagoKg: 0,
    pesoLiquidoResultante: Number(p.peso_liquido_resultante),
    pesoAparasReaproveitaveis: 0,
    pesoDescartePuro: 0,
    fcObservado: Number(p.peso_bruto_recebido) / (Number(p.peso_liquido_resultante) || 1),
    fornecedor: null,
    observacao: null,
    processadoEm: p.processado_em,
  }));

  return { fichas, receitasCalc, insumosCalc, processamentosCalc, insumosComEstoque: dados.insumos.filter((i) => i.tem_estoque) };
}

/** Itens pra contagem cega, agrupáveis por local. Sem saldo. */
export function itensDeContagem(dados: DadosCozinha, locais: LocalArmazenamento[]): ItemContagem[] {
  const nomeLocal = new Map(locais.map((l) => [l.id, l.nome]));
  return dados.insumosComEstoque.map((i) => ({
    insumoId: i.id,
    nome: i.nome,
    unidade: i.unidade_medida,
    local: (i.local_armazenamento_id && nomeLocal.get(i.local_armazenamento_id)) || "Outros",
  }));
}

/** Produções de hoje (sem join em receitas: a cozinha não lê a tabela; o nome vem das fichas). */
export async function listarProducoesDeHoje(fichas: FichaCozinha[]): Promise<ProducaoCozinha[]> {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("producoes")
    .select("id, lote, receita_id, quantidade, responsavel, status, motivo_perda, criado_em")
    .gte("criado_em", inicio.toISOString())
    .order("criado_em", { ascending: false });
  if (error) throw new Error(mensagemErro(error));
  const fichaPorId = new Map(fichas.map((f) => [f.id, f]));
  return ((data ?? []) as { id: string; lote: string; receita_id: string; quantidade: number; responsavel: string; status: StatusProducao; motivo_perda: string | null; criado_em: string }[]).map((p) => ({
    id: p.id,
    lote: p.lote,
    receitaId: p.receita_id,
    nomeReceita: fichaPorId.get(p.receita_id)?.nome ?? "Receita",
    quantidade: Number(p.quantidade),
    unidade: fichaPorId.get(p.receita_id)?.unidadeRendimento ?? "",
    responsavel: p.responsavel,
    status: p.status,
    motivoPerda: p.motivo_perda,
    criadoEm: p.criado_em,
  }));
}

export async function enviarContagemCega(responsavel: string, itens: { insumoId: string; quantidade: number }[]): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("enviar_contagem", { p_responsavel: responsavel, p_itens: itens });
  if (error) throw new Error(mensagemErro(error));
}
