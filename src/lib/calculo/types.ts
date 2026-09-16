export type UnidadeMedida = 'kg' | 'g' | 'l' | 'ml' | 'un';

export interface Insumo {
  id: string;
  unidadeMedida: UnidadeMedida;
  precoUnitario: number;
  fatorCorrecao: number;
  pesoPorUnidade?: number;
}

export interface ProcessamentoProteina {
  insumoId: string;
  pesoBrutoRecebido: number;
  pesoLiquidoResultante: number;
  processadoEm: string | Date;
}

export interface LinhaInsumo {
  tipo: 'insumo';
  insumoId: string;
  pesoLiquido: number;
  unidade: UnidadeMedida;
}

export interface LinhaSubReceita {
  tipo: 'sub_receita';
  subReceitaId: string;
  pesoLiquido: number;
  unidade: UnidadeMedida;
}

export type LinhaReceita = LinhaInsumo | LinhaSubReceita;

export interface Receita {
  id: string;
  rendimento: number;
  linhas: LinhaReceita[];
}

export interface CanalVenda {
  id: string;
  comissaoPercentual: number;
  embala: boolean;
}
