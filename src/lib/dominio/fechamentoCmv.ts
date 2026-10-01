export interface VendaPeriodoLinha {
  receitaId: string;
  nomePrato: string;
  quantidade: number;
}

export interface FechamentoCmv {
  id: string;
  periodoInicio: string;
  periodoFim: string;
  estoqueInicial: number;
  compras: number;
  estoqueFinal: number;
  faturamento: number;
  fechadoEm: string;
  vendas: VendaPeriodoLinha[];
}

export interface NovoFechamentoInput {
  periodoInicio: string;
  periodoFim: string;
  estoqueInicial: number;
  compras: number;
  estoqueFinal: number;
  faturamento: number;
  vendas: { receitaId: string; quantidade: number }[];
}

// EQUIPE (2026-09-25): o que o estoquista vê do fechamento — o lado do
// estoque, sem faturamento (vem de fechamentos_cmv_estoque() no banco).
export interface FechamentoEstoque {
  id: string;
  periodoInicio: string;
  periodoFim: string;
  estoqueInicial: number;
  compras: number;
  estoqueFinal: number;
}
