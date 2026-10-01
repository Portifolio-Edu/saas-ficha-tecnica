export interface EstoqueLinha {
  insumoId: string;
  nome: string;
  categoria: string;
  unidadeMedida: string;
  precoUnitario: number;
  saldoAtual: number;
  estoqueMinimo: number;
}

export type TipoMovimentacao = "entrada" | "saida_venda" | "ajuste" | "saida_producao";

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

// EQUIPE (2026-09-25): contagem cega. Quem contou (cozinha) não viu o saldo;
// `sistema` é o saldo do sistema na hora do envio. Só a gestão vê isto.
export interface ItemContagemCega {
  insumoId: string;
  nome: string;
  unidadeMedida: string;
  precoUnitario: number;
  contada: number;
  sistema: number;
}

export interface ContagemCega {
  id: string;
  responsavel: string;
  criadoEm: string;
  aplicadaEm: string | null;
  itens: ItemContagemCega[];
}
