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
