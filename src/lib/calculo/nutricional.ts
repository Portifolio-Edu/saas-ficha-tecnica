import { pesoBrutoDaLinha } from '@/lib/dados/adaptadores';
import type { Insumo } from '@/lib/dominio/insumo';
import type { Receita } from '@/lib/dominio/receita';
import type { Processamento } from '@/lib/dominio/processamento';

export const CAMPOS_NUTRICIONAIS = [
  'caloriasKcal',
  'carboidratosG',
  'acucaresTotaisG',
  'acucaresAdicionadosG',
  'proteinasG',
  'gordurasTotaisG',
  'gordurasSaturadasG',
  'gordurasTransG',
  'fibraAlimentarG',
  'sodioMg',
] as const;

export type CampoNutricional = (typeof CAMPOS_NUTRICIONAIS)[number];

export type ValoresNutricionais = Record<CampoNutricional, number>;

/** VDR do Anexo II da IN 75/2020. Sem entrada para acucares totais: a norma nao define VDR para esse campo. */
export const VDR: Partial<Record<CampoNutricional, number>> = {
  caloriasKcal: 2000,
  carboidratosG: 300,
  acucaresAdicionadosG: 50,
  proteinasG: 50,
  gordurasTotaisG: 65,
  gordurasSaturadasG: 20,
  gordurasTransG: 2,
  fibraAlimentarG: 25,
  sodioMg: 2000,
};

export interface LinhaNutricional {
  valoresPor100g: ValoresNutricionais;
  pesoBrutoUsadoGramas: number;
}

function somarCampos(valoresA: ValoresNutricionais, valoresB: ValoresNutricionais, pesoB: number): ValoresNutricionais {
  const resultado = { ...valoresA };
  for (const campo of CAMPOS_NUTRICIONAIS) {
    resultado[campo] += (valoresB[campo] * pesoB) / 100;
  }
  return resultado;
}

function zerado(): ValoresNutricionais {
  return Object.fromEntries(CAMPOS_NUTRICIONAIS.map((c) => [c, 0])) as ValoresNutricionais;
}

/**
 * Nutricional por porcao (secao 5.9): soma o valor por 100g de cada linha
 * ponderado pelo peso bruto usado, dividido pelo rendimento da receita.
 */
export function calcularNutricionalPorPorcao(linhas: LinhaNutricional[], rendimento: number): ValoresNutricionais {
  const total = linhas.reduce((soma, linha) => somarCampos(soma, linha.valoresPor100g, linha.pesoBrutoUsadoGramas), zerado());
  const porPorcao = { ...total };
  for (const campo of CAMPOS_NUTRICIONAIS) {
    porPorcao[campo] = total[campo] / rendimento;
  }
  return porPorcao;
}

export function calcularNutricionalPor100g(porPorcao: ValoresNutricionais, pesoPorcaoGramas: number): ValoresNutricionais {
  const por100g = { ...porPorcao };
  for (const campo of CAMPOS_NUTRICIONAIS) {
    por100g[campo] = porPorcao[campo] * (100 / pesoPorcaoGramas);
  }
  return por100g;
}

/** %VD (secao 5.9). Retorna null para campos sem VDR definido (acucares totais). */
export function calcularPercentualVD(porPorcao: ValoresNutricionais, campo: CampoNutricional): number | null {
  const vdr = VDR[campo];
  if (vdr == null) return null;
  return (porPorcao[campo] / vdr) * 100;
}

/**
 * Quando existe nutricional_override (laudo laboratorial), ele substitui o
 * calculado em tudo: tabela, coluna por 100g e avaliacao do selo frontal.
 */
export function aplicarOverride(calculado: ValoresNutricionais, override: Partial<ValoresNutricionais> | null): ValoresNutricionais {
  return override ? { ...calculado, ...override } : calculado;
}

const LIMIAR_ALTO_EM = {
  solido: { gordurasSaturadasG: 6, sodioMg: 600, acucaresAdicionadosG: 15 },
  liquido: { gordurasSaturadasG: 3, sodioMg: 300, acucaresAdicionadosG: 7.5 },
} as const;

export type NutrienteComSelo = keyof typeof LIMIAR_ALTO_EM.solido;

/**
 * Selo frontal (lupa): avaliado por 100g/100mL, NUNCA por porcao. Cada
 * nutriente aciona o selo independentemente (secao 6 do handoff).
 */
export function nutrientesComSeloFrontal(por100g: ValoresNutricionais, formaFisica: 'solido' | 'liquido'): NutrienteComSelo[] {
  const limiares = LIMIAR_ALTO_EM[formaFisica];
  return (Object.keys(limiares) as NutrienteComSelo[]).filter((campo) => por100g[campo] >= limiares[campo]);
}

// =========================================================================
// Composicao recursiva por receita (prato -> sub-receita -> insumo). Movido
// de src/app/nutricional/NutricionalClient.tsx pra cá: e a mesma logica de
// composicao que calcularCmvReceita (cmv.ts) ja usa pra custo, so que pra
// nutricional -- nao fazia sentido ficar so na tela sem teste unitario.
// =========================================================================

/** Peso bruto (ja convertido e com FC aplicado por pesoBrutoDaLinha, na
 * unidade_medida do proprio insumo) expresso em gramas -- base que a tabela
 * nutricional usa (valores_nutricionais_insumo.base_gramas). Liquido conta
 * como 1L=1000g (densidade 1): mesma simplificacao que o resto do sistema ja
 * assume ao nao converter massa<->volume por densidade real. */
export function pesoBrutoEmGramas(insumo: Insumo, pesoBruto: number): number {
  switch (insumo.unidadeMedida) {
    case 'kg':
    case 'l':
      return pesoBruto * 1000;
    case 'g':
    case 'ml':
      return pesoBruto;
    case 'un':
      return pesoBruto * (insumo.pesoPorUnidade ?? 0) * 1000;
  }
}

export function valoresPor100gDoInsumo(
  dados: { baseGramas: number; valores: Partial<ValoresNutricionais> } | undefined,
): ValoresNutricionais | null {
  if (!dados) return null;
  const fator = 100 / dados.baseGramas;
  const preenchido = CAMPOS_NUTRICIONAIS.some((c) => dados.valores[c] != null);
  if (!preenchido) return null;
  return Object.fromEntries(CAMPOS_NUTRICIONAIS.map((c) => [c, (dados.valores[c] ?? 0) * fator])) as ValoresNutricionais;
}

export interface ResultadoNutricional {
  porPorcao: ValoresNutricionais;
  completo: boolean;
}

/**
 * Nutricional por porcao de uma receita (secao 5.9), recursivo pra
 * sub-receita -- mesmo padrao de calcularCmvReceita (cmv.ts): o preparo
 * resolve o proprio nutricional por porcao, e a linha que o referencia no
 * prato pai multiplica isso pelo peso liquido informado, sem reconverter
 * unidade (mesma simplificacao ja usada pelo CMV pra sub-receita).
 */
export function calcularNutricaoReceita(
  receita: Receita,
  insumoPorId: Map<string, Insumo>,
  receitaPorId: Map<string, Receita>,
  nutriPorInsumoId: Map<string, { baseGramas: number; valores: Partial<ValoresNutricionais> }>,
  processamentos: Processamento[],
  cache: Map<string, ResultadoNutricional> = new Map(),
): ResultadoNutricional {
  const existente = cache.get(receita.id);
  if (existente) return existente;

  const linhasInsumo: LinhaNutricional[] = [];
  let completo = true;
  const totalSubReceitas = zerado();

  for (const linha of receita.ficha) {
    if (linha.insumoId) {
      const insumo = insumoPorId.get(linha.insumoId);
      if (!insumo) {
        completo = false;
        continue;
      }
      const bruto = pesoBrutoDaLinha(linha, insumoPorId, processamentos);
      const por100g = valoresPor100gDoInsumo(nutriPorInsumoId.get(linha.insumoId));
      if (bruto === null || !por100g) {
        completo = false;
        continue;
      }
      linhasInsumo.push({ valoresPor100g: por100g, pesoBrutoUsadoGramas: pesoBrutoEmGramas(insumo, bruto) });
    } else if (linha.subReceitaId) {
      const sub = receitaPorId.get(linha.subReceitaId);
      if (!sub) {
        completo = false;
        continue;
      }
      const resultado = calcularNutricaoReceita(sub, insumoPorId, receitaPorId, nutriPorInsumoId, processamentos, cache);
      if (!resultado.completo) completo = false;
      for (const campo of CAMPOS_NUTRICIONAIS) totalSubReceitas[campo] += resultado.porPorcao[campo] * linha.pesoLiquido;
    }
  }

  const totalInsumos = calcularNutricionalPorPorcao(linhasInsumo, 1);
  const totalAbsoluto = zerado();
  for (const campo of CAMPOS_NUTRICIONAIS) totalAbsoluto[campo] = totalInsumos[campo] + totalSubReceitas[campo];
  const porPorcao = Object.fromEntries(CAMPOS_NUTRICIONAIS.map((c) => [c, totalAbsoluto[c] / receita.rendimento])) as ValoresNutricionais;

  const resultado = { porPorcao, completo };
  cache.set(receita.id, resultado);
  return resultado;
}

/** Ids de todos os insumos usados numa receita, recursivamente atraves de
 * sub-receitas -- usado pra sinalizar quais insumos ainda faltam dado
 * nutricional cadastrado. */
export function insumosUsados(
  receita: Receita,
  receitaPorId: Map<string, Receita>,
  acc: Set<string> = new Set(),
  visitado: Set<string> = new Set(),
): Set<string> {
  if (visitado.has(receita.id)) return acc;
  visitado.add(receita.id);
  for (const linha of receita.ficha) {
    if (linha.insumoId) acc.add(linha.insumoId);
    else if (linha.subReceitaId) {
      const sub = receitaPorId.get(linha.subReceitaId);
      if (sub) insumosUsados(sub, receitaPorId, acc, visitado);
    }
  }
  return acc;
}
