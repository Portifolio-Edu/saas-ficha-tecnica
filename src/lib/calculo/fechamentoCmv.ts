export interface VendaPeriodo {
  quantidadeVendida: number;
  cmvReceita: number;
}

export interface FechamentoCmvResultado {
  cmvTeoricoPercentual: number;
  cmvRealPercentual: number;
  gapPercentual: number;
  gapReais: number;
  consumoReal: number;
}

/**
 * CMV teorico vs real (secao 5.7). Gap de 1 a 3 pontos percentuais e ruido
 * normal de operacao; acima disso, investigar (porcao acima da ficha, perda
 * nao registrada, rendimento de proteina pior que o cadastrado, desvio).
 *
 * A comparacao so e valida com o cardapio inteiro cadastrado -- com metade
 * dos pratos sem ficha, o teorico sai baixo e o gap aparece inflado sem
 * problema real. Essa checagem fica a cargo de quem chama (a funcao nao
 * conhece o tamanho do cardapio, so os dados do periodo).
 */
export function calcularFechamentoCmv(
  vendas: VendaPeriodo[],
  faturamento: number,
  estoqueInicial: number,
  compras: number,
  estoqueFinal: number,
): FechamentoCmvResultado {
  if (faturamento <= 0) throw new Error('Faturamento precisa ser positivo para calcular CMV percentual.');

  const custoTeoricoTotal = vendas.reduce((soma, v) => soma + v.quantidadeVendida * v.cmvReceita, 0);
  const cmvTeoricoPercentual = custoTeoricoTotal / faturamento;

  const consumoReal = estoqueInicial + compras - estoqueFinal;
  const cmvRealPercentual = consumoReal / faturamento;

  return {
    cmvTeoricoPercentual,
    cmvRealPercentual,
    gapPercentual: cmvRealPercentual - cmvTeoricoPercentual,
    gapReais: consumoReal - custoTeoricoTotal,
    consumoReal,
  };
}

export interface ConsumoInsumoPeriodo {
  consumoTeorico: number;
  consumoReal: number;
  precoUnitario: number;
}

/**
 * Quebra de estoque (secao 5.8), por insumo. Sem PDV em tempo real, o
 * consumo real vem de movimentacoes lancadas em lote a partir das vendas
 * informadas -- a quebra fica aproximada por periodo, nao instantanea por
 * venda.
 */
export function calcularQuebraEstoque(insumo: ConsumoInsumoPeriodo): number {
  return (insumo.consumoReal - insumo.consumoTeorico) * insumo.precoUnitario;
}
