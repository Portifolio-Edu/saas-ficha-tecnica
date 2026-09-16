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
