import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "./erros";
import type { Categoria, Insumo, InsumoInput } from "@/lib/dominio/insumo";
import type { UnidadeMedida } from "@/lib/calculo/types";

export type { Categoria, Insumo, InsumoInput } from "@/lib/dominio/insumo";

interface LinhaInsumo {
  id: string;
  nome: string;
  categoria: Categoria;
  unidade_medida: UnidadeMedida;
  tamanho_embalagem: number;
  preco_embalagem: number;
  preco_unitario: number;
  fator_correcao: number;
  peso_por_unidade: number | null;
}

interface LinhaEstoque {
  insumo_id: string;
  saldo_atual: number;
  estoque_minimo: number;
}

export async function listarInsumos(): Promise<Insumo[]> {
  const supabase = await createClient();

  const { data: insumos, error } = await supabase
    .from("insumos")
    .select("id, nome, categoria, unidade_medida, tamanho_embalagem, preco_embalagem, preco_unitario, fator_correcao, peso_por_unidade")
    .order("nome");
  if (error) throw new Error(mensagemErro(error));

  const linhas = (insumos ?? []) as LinhaInsumo[];
  if (linhas.length === 0) return [];

  const { data: estoques } = await supabase
    .from("estoque")
    .select("insumo_id, saldo_atual, estoque_minimo")
    .in("insumo_id", linhas.map((i) => i.id));

  const estoquePorInsumo = new Map<string, { saldoAtual: number; estoqueMinimo: number }>();
  for (const e of (estoques ?? []) as LinhaEstoque[]) {
    estoquePorInsumo.set(e.insumo_id, { saldoAtual: Number(e.saldo_atual), estoqueMinimo: Number(e.estoque_minimo) });
  }

  return linhas.map((i) => ({
    id: i.id,
    nome: i.nome,
    categoria: i.categoria,
    unidadeMedida: i.unidade_medida,
    tamanhoEmbalagem: Number(i.tamanho_embalagem),
    precoEmbalagem: Number(i.preco_embalagem),
    precoUnitario: Number(i.preco_unitario),
    fatorCorrecao: Number(i.fator_correcao),
    pesoPorUnidade: i.peso_por_unidade == null ? null : Number(i.peso_por_unidade),
    estoque: estoquePorInsumo.get(i.id) ?? null,
  }));
}

function paraLinhas(input: InsumoInput) {
  return {
    nome: input.nome,
    categoria: input.categoria,
    unidade_medida: input.unidadeMedida,
    tamanho_embalagem: input.tamanhoEmbalagem,
    preco_embalagem: input.precoEmbalagem,
    fator_correcao: input.fatorCorrecao,
    peso_por_unidade: input.pesoPorUnidade,
  };
}

export async function criarInsumo(clienteId: string, input: InsumoInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("insumos").insert({ cliente_id: clienteId, ...paraLinhas(input) });
  if (error) throw new Error(mensagemErro(error));
}

export async function atualizarInsumo(id: string, input: InsumoInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("insumos").update(paraLinhas(input)).eq("id", id);
  if (error) throw new Error(mensagemErro(error));
}

export async function excluirInsumo(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("insumos").delete().eq("id", id);
  if (error) throw new Error(mensagemErro(error));
}
