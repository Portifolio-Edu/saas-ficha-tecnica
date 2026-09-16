import type { Insumo, UnidadeMedida } from './types';

const FATOR_PARA_BASE: Record<'kg' | 'g' | 'l' | 'ml', number> = { kg: 1000, g: 1, l: 1000, ml: 1 };

function familia(unidade: UnidadeMedida): 'massa' | 'volume' | 'unidade' {
  if (unidade === 'kg' || unidade === 'g') return 'massa';
  if (unidade === 'l' || unidade === 'ml') return 'volume';
  return 'unidade';
}

/**
 * Converte o peso/volume de uma linha de receita (na unidade em que foi
 * pesada) para a unidade de medida do insumo (na qual preco_unitario esta
 * expresso). Regras da secao 5.2 do handoff:
 *   - kg<->g e l<->ml: fator fixo de 1000, nao guardado em lugar nenhum.
 *   - 'un': so converte usando insumos.peso_por_unidade, que ja esta
 *     expresso na unidade_medida do proprio insumo (especifico dele).
 * Conversao entre massa e volume por densidade ("1 xicara de farinha")
 * fica fora de escopo -- varia por insumo e por quem mede.
 */
export function converterParaUnidadeDoInsumo(
  valor: number,
  unidadeOrigem: UnidadeMedida,
  insumo: Pick<Insumo, 'unidadeMedida' | 'pesoPorUnidade'>,
): number {
  const destino = insumo.unidadeMedida;
  if (unidadeOrigem === destino) return valor;

  if (unidadeOrigem === 'un' || destino === 'un') {
    if (insumo.pesoPorUnidade == null) {
      throw new Error('Conversao de/para "un" exige peso_por_unidade cadastrado no insumo.');
    }
    return unidadeOrigem === 'un' ? valor * insumo.pesoPorUnidade : valor / insumo.pesoPorUnidade;
  }

  if (familia(unidadeOrigem) !== familia(destino)) {
    throw new Error(`Nao e possivel converter ${unidadeOrigem} para ${destino} sem densidade.`);
  }

  const emBase = valor * FATOR_PARA_BASE[unidadeOrigem as 'kg' | 'g' | 'l' | 'ml'];
  return emBase / FATOR_PARA_BASE[destino as 'kg' | 'g' | 'l' | 'ml'];
}
