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
  const custoTeoricoTotal = vendas.reduce((soma, v) => soma + v.quantidadeVendida * v.cmvReceita, 0);
  const consumoReal = estoqueInicial + compras - estoqueFinal;

  // Sem faturamento no periodo os percentuais nao tem base pra existir, mas o
  // gap em reais (consumo real vs. teorico) continua valendo -- quem chama
  // (fechamento em aberto, historico, quebra de estoque acumulada) decide se
  // isso e exibido ou nao, a funcao so evita NaN/Infinity.
  const cmvTeoricoPercentual = faturamento > 0 ? custoTeoricoTotal / faturamento : 0;
  const cmvRealPercentual = faturamento > 0 ? consumoReal / faturamento : 0;

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
