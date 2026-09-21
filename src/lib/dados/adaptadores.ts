import type { Insumo as InsumoCalc, ProcessamentoProteina, Receita as ReceitaCalc, LinhaReceita, UnidadeMedida } from "@/lib/calculo/types";
import type { ResolverContexto } from "@/lib/calculo/cmv";
import { calcularCustoPorPorcao } from "@/lib/calculo/cmv";
import { converterParaUnidadeDoInsumo } from "@/lib/calculo/conversaoUnidade";
import { fatorCorrecaoEfetivo } from "@/lib/calculo/fatorCorrecao";
import type { Insumo } from "@/lib/dominio/insumo";
import type { LinhaFicha, Receita } from "@/lib/dominio/receita";
import type { Processamento } from "@/lib/dominio/processamento";

// Converte os tipos vindos do banco (dados/insumos.ts, dados/receitas.ts)
// para os tipos do motor de cálculo, que não conhece Supabase nem essas
// formas específicas de linha. Mantém src/lib/calculo/ isolado.

export function paraInsumoCalc(i: Insumo): InsumoCalc {
  return {
    id: i.id,
    unidadeMedida: i.unidadeMedida,
    precoUnitario: i.precoUnitario,
    fatorCorrecao: i.fatorCorrecao,
    pesoPorUnidade: i.pesoPorUnidade ?? undefined,
  };
}

export function paraReceitaCalc(r: Receita): ReceitaCalc {
  const linhas: LinhaReceita[] = r.ficha.map((f) =>
    f.insumoId
      ? { tipo: "insumo", insumoId: f.insumoId, pesoLiquido: f.pesoLiquido, unidade: f.unidade }
      : { tipo: "sub_receita", subReceitaId: f.subReceitaId as string, pesoLiquido: f.pesoLiquido, unidade: f.unidade },
  );
  return { id: r.id, rendimento: r.rendimento, linhas };
}

export function paraProcessamentoCalc(p: Processamento): ProcessamentoProteina {
  return {
    insumoId: p.insumoId,
    pesoBrutoRecebido: p.pesoBrutoRecebido,
    pesoLiquidoResultante: p.pesoLiquidoResultante,
    processadoEm: p.processadoEm,
  };
}

/**
 * lotesProteina alimenta o FC efetivo (seção 5.1): com lote registrado pra um
 * insumo, a média do FC observado prevalece sobre o fator_correcao cadastrado
 * em todo cálculo de CMV -- Insumos, Receitas e Produções passam os mesmos
 * processamentos aqui, pra não haver dois números de FC diferentes no sistema.
 */
export function construirContexto(insumos: Insumo[], receitas: Receita[], processamentos: Processamento[] = []): ResolverContexto {
  return {
    insumoPorId: new Map(insumos.map((i) => [i.id, paraInsumoCalc(i)])),
    receitaPorId: new Map(receitas.map((r) => [r.id, paraReceitaCalc(r)])),
    lotesProteina: processamentos.map(paraProcessamentoCalc),
  };
}

/**
 * Peso bruto (já com FC aplicado, seção 5.1-5.3) de uma linha de ficha que
 * aponta pra insumo. Usado tanto no detalhe de custo (Insumos/Receitas)
 * quanto na capacidade de produção (Produções) -- centralizado aqui pra não
 * duplicar a mesma conta em cada tela.
 */
export function pesoBrutoDaLinha(linha: LinhaFicha, insumoPorId: Map<string, Insumo>, processamentos: Processamento[] = []): number | null {
  if (!linha.insumoId) return null;
  const insumo = insumoPorId.get(linha.insumoId);
  if (!insumo) return null;
  const insumoCalc = paraInsumoCalc(insumo);
  const fc = fatorCorrecaoEfetivo(insumoCalc, processamentos.map(paraProcessamentoCalc));
  const pesoConvertido = converterParaUnidadeDoInsumo(linha.pesoLiquido, linha.unidade, insumoCalc);
  return pesoConvertido * fc;
}

export interface LinhaCustoDetalhado {
  id: string;
  nome: string;
  pesoLiquido: number;
  unidade: UnidadeMedida;
  fc: number | null;
  precoUnitario: number;
  custo: number;
  ehPreparo: boolean;
}

/**
 * Explode a ficha de uma receita linha a linha com o custo já calculado
 * (insumo com FC efetivo, ou sub-receita pelo custo por porção do preparo) --
 * usado tanto na tabela de composição de custo (Receitas & Fichas) quanto no
 * detalhe por prato do Fechamento de CMV, pra não duplicar a mesma resolução
 * de linha nos dois lugares.
 */
export function linhasCustoDetalhado(
  receita: Receita,
  insumoPorId: Map<string, Insumo>,
  preparoPorId: Map<string, Receita>,
  lotesProteina: ProcessamentoProteina[],
  contexto: ResolverContexto,
): LinhaCustoDetalhado[] {
  return receita.ficha
    .map((f): LinhaCustoDetalhado | null => {
      if (f.insumoId) {
        const insumo = insumoPorId.get(f.insumoId);
        if (!insumo) return null;
        const insumoCalc = paraInsumoCalc(insumo);
        const fc = fatorCorrecaoEfetivo(insumoCalc, lotesProteina);
        const pesoConvertido = converterParaUnidadeDoInsumo(f.pesoLiquido, f.unidade, insumoCalc);
        const custo = pesoConvertido * fc * insumo.precoUnitario;
        return { id: f.id, nome: insumo.nome, pesoLiquido: f.pesoLiquido, unidade: f.unidade, fc, precoUnitario: insumo.precoUnitario, custo, ehPreparo: false };
      }
      const preparo = preparoPorId.get(f.subReceitaId!);
      if (!preparo) return null;
      const custoUnitarioPreparo = calcularCustoPorPorcao(preparo.id, contexto);
      const custo = f.pesoLiquido * custoUnitarioPreparo;
      return { id: f.id, nome: preparo.nomePrato, pesoLiquido: f.pesoLiquido, unidade: f.unidade, fc: null, precoUnitario: custoUnitarioPreparo, custo, ehPreparo: true };
    })
    .filter((l): l is LinhaCustoDetalhado => l !== null);
}
