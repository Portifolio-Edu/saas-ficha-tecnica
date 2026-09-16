export interface Processamento {
  id: string;
  insumoId: string;
  responsavel: string;
  pesoBrutoRecebido: number;
  valorPagoKg: number;
  pesoLiquidoResultante: number;
  pesoAparasReaproveitaveis: number;
  pesoDescartePuro: number;
  fcObservado: number;
  fornecedor: string | null;
  observacao: string | null;
  processadoEm: string;
}

export interface ProcessamentoInput {
  insumoId: string;
  responsavel: string;
  pesoBrutoRecebido: number;
  valorPagoKg: number;
  pesoLiquidoResultante: number;
  pesoAparasReaproveitaveis: number;
  fornecedor: string | null;
  observacao: string | null;
  processadoEm: string;
}
