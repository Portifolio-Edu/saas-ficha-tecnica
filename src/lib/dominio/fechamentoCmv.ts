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
