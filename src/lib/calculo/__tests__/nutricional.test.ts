import { describe, expect, it } from 'vitest';
import type { Insumo } from '@/lib/dominio/insumo';
import type { Receita, LinhaFicha } from '@/lib/dominio/receita';
import {
  aplicarOverride,
  calcularNutricaoReceita,
  calcularNutricionalPor100g,
  calcularNutricionalPorPorcao,
  calcularPercentualVD,
  nutrientesComSeloFrontal,
  type ValoresNutricionais,
} from '../nutricional';

const zerado: ValoresNutricionais = {
  caloriasKcal: 0,
  carboidratosG: 0,
  acucaresTotaisG: 0,
  acucaresAdicionadosG: 0,
  proteinasG: 0,
  gordurasTotaisG: 0,
  gordurasSaturadasG: 0,
  gordurasTransG: 0,
  fibraAlimentarG: 0,
  sodioMg: 0,
};

describe('calcularNutricionalPorPorcao', () => {
  it('pondera o valor por 100g pelo peso bruto usado e divide pelo rendimento', () => {
    const parmesao: ValoresNutricionais = { ...zerado, sodioMg: 1530, proteinasG: 38 };
    // 80g de parmesao (peso bruto) numa receita que rende 1 porcao.
    const resultado = calcularNutricionalPorPorcao([{ valoresPor100g: parmesao, pesoBrutoUsadoGramas: 80 }], 1);

    expect(resultado.sodioMg).toBeCloseTo(1530 * 0.8);
    expect(resultado.proteinasG).toBeCloseTo(38 * 0.8);
  });

  it('divide pelo rendimento quando a receita rende mais de uma porcao', () => {
    const insumo: ValoresNutricionais = { ...zerado, caloriasKcal: 400 };
    const resultado = calcularNutricionalPorPorcao([{ valoresPor100g: insumo, pesoBrutoUsadoGramas: 1000 }], 5);
    // 1000g a 400kcal/100g = 4000kcal totais, dividido por 5 porcoes = 800kcal/porcao.
    expect(resultado.caloriasKcal).toBeCloseTo(800);
  });
});

describe('calcularNutricionalPor100g', () => {
  it('escala o valor por porcao para 100g usando o peso da porcao', () => {
    const porPorcao: ValoresNutricionais = { ...zerado, sodioMg: 900 };
    // Porcao de 450g com 900mg de sodio -> 200mg por 100g.
    expect(calcularNutricionalPor100g(porPorcao, 450).sodioMg).toBeCloseTo(200);
  });
});

describe('calcularPercentualVD', () => {
  it('calcula %VD para campo com VDR definido', () => {
    const porPorcao: ValoresNutricionais = { ...zerado, sodioMg: 600 };
    expect(calcularPercentualVD(porPorcao, 'sodioMg')).toBeCloseTo(30);
  });

  it('retorna null para acucares totais, que nao tem VDR definido pela norma', () => {
    expect(calcularPercentualVD(zerado, 'acucaresTotaisG')).toBeNull();
  });
});

describe('aplicarOverride', () => {
  it('laudo laboratorial substitui o calculado campo a campo', () => {
    const calculado: ValoresNutricionais = { ...zerado, sodioMg: 900, caloriasKcal: 300 };
    const resultado = aplicarOverride(calculado, { sodioMg: 850 });
    expect(resultado.sodioMg).toBe(850);
    expect(resultado.caloriasKcal).toBe(300);
  });

  it('retorna o calculado quando nao ha override', () => {
    const calculado: ValoresNutricionais = { ...zerado, sodioMg: 900 };
    expect(aplicarOverride(calculado, null)).toEqual(calculado);
  });
});

describe('nutrientesComSeloFrontal', () => {
  it('aciona selo de sodio para solido a partir de 600mg/100g', () => {
    const por100g: ValoresNutricionais = { ...zerado, sodioMg: 620 };
    expect(nutrientesComSeloFrontal(por100g, 'solido')).toEqual(['sodioMg']);
  });

  it('usa limiar mais baixo (metade) para liquido', () => {
    const por100g: ValoresNutricionais = { ...zerado, sodioMg: 320 };
    expect(nutrientesComSeloFrontal(por100g, 'liquido')).toEqual(['sodioMg']);
    expect(nutrientesComSeloFrontal(por100g, 'solido')).toEqual([]);
  });

  it('aciona multiplos selos independentemente', () => {
    const por100g: ValoresNutricionais = { ...zerado, sodioMg: 700, gordurasSaturadasG: 8, acucaresAdicionadosG: 2 };
    const selos = nutrientesComSeloFrontal(por100g, 'solido');
    expect(selos).toContain('sodioMg');
    expect(selos).toContain('gordurasSaturadasG');
    expect(selos).not.toContain('acucaresAdicionadosG');
  });
});

describe('calcularNutricaoReceita', () => {
  const insumoA: Insumo = {
    id: 'insumo-a',
    nome: 'Farinha',
    categoria: 'outro',
    unidadeMedida: 'g',
    tamanhoEmbalagem: 1000,
    precoEmbalagem: 10,
    precoUnitario: 0.01,
    fatorCorrecao: 1,
    pesoPorUnidade: null,
    localArmazenamentoId: null,
    estoque: null,
  };

  function linha(overrides: Partial<LinhaFicha>): LinhaFicha {
    return { id: 'linha', insumoId: null, subReceitaId: null, pesoLiquido: 0, unidade: 'g', ...overrides };
  }

  function receita(overrides: Partial<Receita>): Receita {
    return {
      id: 'receita',
      nomePrato: 'Receita',
      tipo: 'prato_final',
      categoria: null,
      precoVenda: null,
      vendasMes: null,
      rendimento: 1,
      unidadeRendimento: 'porcao',
      pesoPorcaoG: null,
      formaFisica: 'solido',
      destinoVenda: 'proprio',
      margemAlvo: null,
      modoPreparo: null,
      fotoUrl: null,
      ficha: [],
      etapas: [],
      ...overrides,
    };
  }

  it('receita so com insumo direto: pondera pelo peso bruto e divide pelo rendimento', () => {
    const prato = receita({
      rendimento: 2,
      ficha: [linha({ id: 'l1', insumoId: 'insumo-a', pesoLiquido: 200, unidade: 'g' })],
    });
    const nutriPorInsumoId = new Map([['insumo-a', { baseGramas: 100, valores: { caloriasKcal: 100, proteinasG: 10 } }]]);

    const resultado = calcularNutricaoReceita(
      prato,
      new Map([['insumo-a', insumoA]]),
      new Map(),
      nutriPorInsumoId,
      [],
    );

    // 200g bruto a 100kcal/100g = 200kcal totais, dividido por 2 porcoes = 100kcal/porcao.
    expect(resultado.porPorcao.caloriasKcal).toBeCloseTo(100);
    expect(resultado.porPorcao.proteinasG).toBeCloseTo(10);
    expect(resultado.completo).toBe(true);
  });

  it('receita com sub-receita: soma o nutricional do preparo multiplicado pelo peso liquido usado', () => {
    const sub = receita({
      id: 'sub',
      rendimento: 1,
      ficha: [linha({ id: 'l1', insumoId: 'insumo-a', pesoLiquido: 50, unidade: 'g' })],
    });
    const prato = receita({
      id: 'prato',
      rendimento: 2,
      ficha: [linha({ id: 'l2', subReceitaId: 'sub', pesoLiquido: 4 })],
    });
    const nutriPorInsumoId = new Map([['insumo-a', { baseGramas: 100, valores: { caloriasKcal: 100 } }]]);

    const resultado = calcularNutricaoReceita(
      prato,
      new Map([['insumo-a', insumoA]]),
      new Map([['sub', sub]]),
      nutriPorInsumoId,
      [],
    );

    // Sub-receita: 50g bruto a 100kcal/100g = 50kcal totais, rendimento 1 -> 50kcal/porcao.
    // Prato: 50kcal/porcao do preparo * pesoLiquido 4 = 200kcal totais, dividido por 2 porcoes = 100kcal/porcao.
    expect(resultado.porPorcao.caloriasKcal).toBeCloseTo(100);
    expect(resultado.completo).toBe(true);
  });

  it('receita com insumo sem dado nutricional cadastrado: fica incompleta e o insumo nao entra no total', () => {
    const prato = receita({
      rendimento: 1,
      ficha: [linha({ id: 'l1', insumoId: 'insumo-a', pesoLiquido: 200, unidade: 'g' })],
    });

    const resultado = calcularNutricaoReceita(
      prato,
      new Map([['insumo-a', insumoA]]),
      new Map(),
      new Map(), // nenhum dado nutricional cadastrado pro insumo
      [],
    );

    expect(resultado.completo).toBe(false);
    expect(resultado.porPorcao.caloriasKcal).toBe(0);
  });

  it('calculo por 100g bate com o calculo por porcao, escalado pelo peso da porcao', () => {
    const prato = receita({
      rendimento: 2,
      pesoPorcaoG: 50,
      ficha: [linha({ id: 'l1', insumoId: 'insumo-a', pesoLiquido: 200, unidade: 'g' })],
    });
    const nutriPorInsumoId = new Map([['insumo-a', { baseGramas: 100, valores: { caloriasKcal: 100 } }]]);

    const { porPorcao } = calcularNutricaoReceita(
      prato,
      new Map([['insumo-a', insumoA]]),
      new Map(),
      nutriPorInsumoId,
      [],
    );
    const por100g = calcularNutricionalPor100g(porPorcao, prato.pesoPorcaoG!);

    // porPorcao = 100kcal numa porcao de 50g -> por100g deve dobrar (100g / 50g = fator 2).
    expect(porPorcao.caloriasKcal).toBeCloseTo(100);
    expect(por100g.caloriasKcal).toBeCloseTo(200);
  });
});
