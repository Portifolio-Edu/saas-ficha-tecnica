import type { Insumo, ProcessamentoProteina } from './types.js';

/**
 * FC medido sempre prevalece sobre o de tabela: se existe ao menos um lote
 * processado para o insumo, a media do FC observado nesses lotes substitui
 * o fator_correcao cadastrado. E isso que torna o CMV preciso em vez de
 * estimado (secao 5.1 do handoff).
 */
export function fatorCorrecaoEfetivo(insumo: Insumo, lotes: ProcessamentoProteina[]): number {
  const doInsumo = lotes.filter((l) => l.insumoId === insumo.id);
  if (doInsumo.length === 0) return insumo.fatorCorrecao;

  const media =
    doInsumo.reduce((soma, lote) => soma + lote.pesoBrutoRecebido / lote.pesoLiquidoResultante, 0) /
    doInsumo.length;

  return media;
}
