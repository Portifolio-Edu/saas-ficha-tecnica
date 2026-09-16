export interface EstoqueLinha {
  insumoId: string;
  nome: string;
  categoria: string;
  unidadeMedida: string;
  precoUnitario: number;
  saldoAtual: number;
  estoqueMinimo: number;
}

export type TipoMovimentacao = "entrada" | "saida_venda" | "ajuste";

export interface Movimentacao {
  id: string;
  insumoId: string;
  nomeInsumo: string;
  unidadeMedida: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  origem: string | null;
  criadoEm: string;
}
