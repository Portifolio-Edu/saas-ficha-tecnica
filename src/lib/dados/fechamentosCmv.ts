import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "./erros";
import type { FechamentoCmv, FechamentoEstoque, NovoFechamentoInput, VendaPeriodoLinha } from "@/lib/dominio/fechamentoCmv";

export type { FechamentoCmv, FechamentoEstoque, NovoFechamentoInput, VendaPeriodoLinha } from "@/lib/dominio/fechamentoCmv";

interface LinhaFechamento {
  id: string;
  periodo_inicio: string;
  periodo_fim: string;
  estoque_inicial: number;
  compras: number;
  estoque_final: number;
  faturamento: number;
  fechado_em: string;
}

interface LinhaVendaJoin {
  fechamento_id: string;
  receita_id: string;
  quantidade: number;
  receitas: { nome_prato: string } | null;
}

export async function listarFechamentos(): Promise<FechamentoCmv[]> {
  const supabase = await createClient();
  const { data: fechamentos, error } = await supabase
    .from("fechamentos_cmv")
    .select("id, periodo_inicio, periodo_fim, estoque_inicial, compras, estoque_final, faturamento, fechado_em")
    .order("periodo_fim", { ascending: false });
  if (error) throw new Error(mensagemErro(error));

  const linhas = (fechamentos ?? []) as LinhaFechamento[];
  if (linhas.length === 0) return [];

  const { data: vendas, error: erroVendas } = await supabase
    .from("vendas_periodo")
    .select("fechamento_id, receita_id, quantidade, receitas(nome_prato)")
    .in("fechamento_id", linhas.map((f) => f.id));
  if (erroVendas) throw new Error(mensagemErro(erroVendas));

  const vendasPorFechamento = new Map<string, VendaPeriodoLinha[]>();
  for (const v of (vendas ?? []) as unknown as LinhaVendaJoin[]) {
    if (!v.receitas) continue;
    const lista = vendasPorFechamento.get(v.fechamento_id) ?? [];
    lista.push({ receitaId: v.receita_id, nomePrato: v.receitas.nome_prato, quantidade: Number(v.quantidade) });
    vendasPorFechamento.set(v.fechamento_id, lista);
  }

  return linhas.map((f) => ({
    id: f.id,
    periodoInicio: f.periodo_inicio,
    periodoFim: f.periodo_fim,
    estoqueInicial: Number(f.estoque_inicial),
    compras: Number(f.compras),
    estoqueFinal: Number(f.estoque_final),
    faturamento: Number(f.faturamento),
    fechadoEm: f.fechado_em,
    vendas: vendasPorFechamento.get(f.id) ?? [],
  }));
}

export async function criarFechamento(clienteId: string, input: NovoFechamentoInput): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fechamentos_cmv")
    .insert({
      cliente_id: clienteId,
      periodo_inicio: input.periodoInicio,
      periodo_fim: input.periodoFim,
      estoque_inicial: input.estoqueInicial,
      compras: input.compras,
      estoque_final: input.estoqueFinal,
      faturamento: input.faturamento,
    })
    .select("id")
    .single();
  if (error) throw new Error(mensagemErro(error));

  const fechamentoId = (data as { id: string }).id;
  const vendas = input.vendas.filter((v) => v.quantidade > 0);
  if (vendas.length === 0) return;

  const { error: erroVendas } = await supabase.from("vendas_periodo").insert(
    vendas.map((v) => ({ fechamento_id: fechamentoId, receita_id: v.receitaId, quantidade: v.quantidade })),
  );
  if (erroVendas) throw new Error(mensagemErro(erroVendas));
}

interface LinhaFechamentoEstoque {
  id: string;
  periodo_inicio: string;
  periodo_fim: string;
  estoque_inicial: number;
  compras: number;
  estoque_final: number;
}

/** EQUIPE (2026-09-25): fechamentos sem faturamento, pro estoquista. A
 * tabela fechamentos_cmv é só da gestão; a função devolve só as colunas de
 * estoque. */
export async function listarFechamentosEstoque(): Promise<FechamentoEstoque[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fechamentos_cmv_estoque");
  if (error) throw new Error(mensagemErro(error));
  return ((data ?? []) as LinhaFechamentoEstoque[]).map((f) => ({
    id: f.id,
    periodoInicio: f.periodo_inicio,
    periodoFim: f.periodo_fim,
    estoqueInicial: Number(f.estoque_inicial),
    compras: Number(f.compras),
    estoqueFinal: Number(f.estoque_final),
  }));
}
