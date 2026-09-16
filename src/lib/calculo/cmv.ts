import { converterParaUnidadeDoInsumo } from './conversaoUnidade.js';
import { fatorCorrecaoEfetivo } from './fatorCorrecao.js';
import type { Insumo, ProcessamentoProteina, Receita } from './types.js';

export interface ResolverContexto {
  insumoPorId: Map<string, Insumo>;
  receitaPorId: Map<string, Receita>;
  lotesProteina: ProcessamentoProteina[];
}

/**
 * CMV de uma receita (secao 5.3). Cada linha aponta para um insumo comprado
 * ou para uma sub-receita (preparo proprio); o custo das duas e somado.
 *
 * Uma linha de sub-receita usa o custo unitario do preparo (cmv do preparo /
 * rendimento do preparo) e NAO aplica FC de novo: a perda ja foi absorvida
 * no calculo da sub-receita. Suporta um nivel de aninhamento -- preparo
 * dentro de preparo exigiria checagem de ciclo, fora de escopo aqui.
 */
export function calcularCmvReceita(receitaId: string, ctx: ResolverContexto): number {
  const receita = obterReceita(receitaId, ctx);

  return receita.linhas.reduce((soma, linha) => {
    if (linha.tipo === 'insumo') {
      const insumo = obterInsumo(linha.insumoId, ctx);
      const pesoConvertido = converterParaUnidadeDoInsumo(linha.pesoLiquido, linha.unidade, insumo);
      const fc = fatorCorrecaoEfetivo(insumo, ctx.lotesProteina);
      const pesoBruto = pesoConvertido * fc;
      return soma + pesoBruto * insumo.precoUnitario;
    }

    const subReceita = obterReceita(linha.subReceitaId, ctx);
    const custoUnitarioPreparo = calcularCmvReceita(subReceita.id, ctx) / subReceita.rendimento;
    return soma + linha.pesoLiquido * custoUnitarioPreparo;
  }, 0);
}

export function calcularCustoPorPorcao(receitaId: string, ctx: ResolverContexto): number {
  const receita = obterReceita(receitaId, ctx);
  return calcularCmvReceita(receitaId, ctx) / receita.rendimento;
}

function obterInsumo(insumoId: string, ctx: ResolverContexto): Insumo {
  const insumo = ctx.insumoPorId.get(insumoId);
  if (!insumo) throw new Error(`Insumo nao encontrado: ${insumoId}`);
  return insumo;
}

function obterReceita(receitaId: string, ctx: ResolverContexto): Receita {
  const receita = ctx.receitaPorId.get(receitaId);
  if (!receita) throw new Error(`Receita nao encontrada: ${receitaId}`);
  return receita;
}
