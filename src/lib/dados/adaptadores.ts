import type { Insumo as InsumoCalc, Receita as ReceitaCalc, LinhaReceita } from "@/lib/calculo/types";
import type { ResolverContexto } from "@/lib/calculo/cmv";
import { converterParaUnidadeDoInsumo } from "@/lib/calculo/conversaoUnidade";
import { fatorCorrecaoEfetivo } from "@/lib/calculo/fatorCorrecao";
import type { Insumo } from "@/lib/dominio/insumo";
import type { LinhaFicha, Receita } from "@/lib/dominio/receita";

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

/** lotesProteina vazio: sem manipulação de proteína cadastrada ainda nesta
 * tela, o FC efetivo cai no fator_correcao cadastrado do insumo (seção 5.1). */
export function construirContexto(insumos: Insumo[], receitas: Receita[]): ResolverContexto {
  return {
    insumoPorId: new Map(insumos.map((i) => [i.id, paraInsumoCalc(i)])),
    receitaPorId: new Map(receitas.map((r) => [r.id, paraReceitaCalc(r)])),
    lotesProteina: [],
  };
}

/**
 * Peso bruto (já com FC aplicado, seção 5.1-5.3) de uma linha de ficha que
 * aponta pra insumo. Usado tanto no detalhe de custo (Insumos/Receitas)
 * quanto na capacidade de produção (Produções) -- centralizado aqui pra não
 * duplicar a mesma conta em cada tela.
 */
export function pesoBrutoDaLinha(linha: LinhaFicha, insumoPorId: Map<string, Insumo>): number | null {
  if (!linha.insumoId) return null;
  const insumo = insumoPorId.get(linha.insumoId);
  if (!insumo) return null;
  const insumoCalc = paraInsumoCalc(insumo);
  const fc = fatorCorrecaoEfetivo(insumoCalc, []);
  const pesoConvertido = converterParaUnidadeDoInsumo(linha.pesoLiquido, linha.unidade, insumoCalc);
  return pesoConvertido * fc;
}
