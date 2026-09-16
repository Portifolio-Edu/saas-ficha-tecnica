import { pesoBrutoDaLinha } from '@/lib/dados/adaptadores';
import type { Insumo } from '@/lib/dominio/insumo';
import type { Receita } from '@/lib/dominio/receita';
import type { Processamento } from '@/lib/dominio/processamento';

export interface InsumoNaFicha {
  insumoId: string;
  pesoBrutoPorPorcao: number;
}

export interface SaldoEstoque {
  insumoId: string;
  saldoAtual: number;
}

export interface CapacidadeProducao {
  porcoesPossiveis: number | null;
  insumoGargalo: string | null;
  insumosForaDoCalculo: string[];
}

/**
 * Capacidade de producao (secao 5.6): o limite e o insumo mais escasso da
 * ficha (o gargalo), nunca a media. Insumo sem rastreio de estoque fica de
 * FORA do calculo -- nao conta como zero, senao quase todo prato apareceria
 * como "0 porcoes". Quando nenhum insumo da ficha tem estoque rastreado,
 * porcoesPossiveis vem null (capacidade desconhecida, nao zero).
 */
export function calcularCapacidadeProducao(
  insumosDaFicha: InsumoNaFicha[],
  saldosPorInsumoId: Map<string, SaldoEstoque>,
): CapacidadeProducao {
  const rastreados: { insumoId: string; porcoesPossiveis: number }[] = [];
  const foraDoCalculo: string[] = [];

  for (const item of insumosDaFicha) {
    const saldo = saldosPorInsumoId.get(item.insumoId);
    if (!saldo) {
      foraDoCalculo.push(item.insumoId);
      continue;
    }
    rastreados.push({
      insumoId: item.insumoId,
      porcoesPossiveis: Math.floor(saldo.saldoAtual / item.pesoBrutoPorPorcao),
    });
  }

  if (rastreados.length === 0) {
    return { porcoesPossiveis: null, insumoGargalo: null, insumosForaDoCalculo: foraDoCalculo };
  }

  const gargalo = rastreados.reduce((menor, atual) =>
    atual.porcoesPossiveis < menor.porcoesPossiveis ? atual : menor,
  );

  return {
    porcoesPossiveis: gargalo.porcoesPossiveis,
    insumoGargalo: gargalo.insumoId,
    insumosForaDoCalculo: foraDoCalculo,
  };
}

/**
 * Monta as linhas de capacidade (peso bruto por porcao) a partir da ficha de
 * uma receita, pra alimentar calcularCapacidadeProducao. Prato final: peso
 * bruto dividido pelo rendimento da receita -- o resultado sai em peso por
 * PORCAO, como no detalhe da tela. Preparo proprio: peso bruto do LOTE
 * inteiro, sem dividir, porque a ficha de um preparo representa o lote
 * completo, nao uma fracao -- dividir aqui infla a capacidade alem do que a
 * cozinha produz de uma vez.
 */
export function linhasCapacidadeDaReceita(
  receita: Receita,
  insumoPorId: Map<string, Insumo>,
  processamentos: Processamento[],
): InsumoNaFicha[] {
  const linhas: InsumoNaFicha[] = [];
  for (const linha of receita.ficha) {
    if (!linha.insumoId) continue;
    const bruto = pesoBrutoDaLinha(linha, insumoPorId, processamentos);
    if (bruto === null) continue;
    linhas.push({
      insumoId: linha.insumoId,
      pesoBrutoPorPorcao: receita.tipo === 'prato_final' ? bruto / receita.rendimento : bruto,
    });
  }
  return linhas;
}
