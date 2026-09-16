import type { CanalVenda } from './types.js';

/**
 * Preco sugerido (secao 5.4): margem da receita sobrescreve a do cliente
 * quando definida.
 */
export function calcularPrecoSugerido(custoPorPorcao: number, margemAlvoReceita: number | null | undefined, margemAlvoCliente: number): number {
  const margemUsada = margemAlvoReceita ?? margemAlvoCliente;
  if (margemUsada >= 1) throw new Error('Margem alvo precisa ser menor que 1 (100%).');
  return custoPorPorcao / (1 - margemUsada);
}

/**
 * Preco por canal (secao 5.5): o objetivo e manter o MESMO GANHO EM REAIS
 * que o balcao, nao recalcular margem alvo em cima da comissao -- isso
 * infla o preco absurdamente (o erro documentado: lasanha de R$48 virava
 * R$90). Embalagem so entra no custo quando o canal embala.
 */
export function calcularPrecoPorCanal(
  precoVendaBalcao: number,
  custoEmbalagemUnitario: number,
  canal: Pick<CanalVenda, 'comissaoPercentual' | 'embala'>,
): number {
  if (canal.comissaoPercentual >= 1) throw new Error('Comissao do canal precisa ser menor que 1 (100%).');
  const custoEmbalagemCanal = canal.embala ? custoEmbalagemUnitario : 0;
  return (precoVendaBalcao + custoEmbalagemCanal) / (1 - canal.comissaoPercentual);
}
