import { describe, expect, it } from 'vitest';
import { calcularCmvReceita, calcularCustoPorPorcao, type ResolverContexto } from '../cmv.js';
import type { Insumo, Receita } from '../types.js';

// Fixture espelha o exemplo da Lasanha Bolonhesa do mockup: prato final com
// insumos diretos e uma linha de sub-receita (molho de tomate caseiro).
const insumos: Insumo[] = [
  { id: 'massa-lasanha', unidadeMedida: 'kg', precoUnitario: 12, fatorCorrecao: 1 },
  { id: 'carne-moida', unidadeMedida: 'kg', precoUnitario: 32, fatorCorrecao: 1.05 },
  { id: 'mucarela', unidadeMedida: 'kg', precoUnitario: 35, fatorCorrecao: 1 },
  { id: 'parmesao', unidadeMedida: 'kg', precoUnitario: 55, fatorCorrecao: 1 },
  { id: 'tomate-pelado', unidadeMedida: 'kg', precoUnitario: 6, fatorCorrecao: 1 },
  { id: 'cebola', unidadeMedida: 'kg', precoUnitario: 5, fatorCorrecao: 1.29 },
  { id: 'alho', unidadeMedida: 'kg', precoUnitario: 25, fatorCorrecao: 1.08 },
  { id: 'azeite', unidadeMedida: 'l', precoUnitario: 28, fatorCorrecao: 1 },
  { id: 'manjericao', unidadeMedida: 'kg', precoUnitario: 40, fatorCorrecao: 1.15 },
];

const molhoTomate: Receita = {
  id: 'molho-tomate',
  rendimento: 5,
  linhas: [
    { tipo: 'insumo', insumoId: 'tomate-pelado', pesoLiquido: 4, unidade: 'kg' },
    { tipo: 'insumo', insumoId: 'cebola', pesoLiquido: 0.3, unidade: 'kg' },
    { tipo: 'insumo', insumoId: 'alho', pesoLiquido: 0.05, unidade: 'kg' },
    { tipo: 'insumo', insumoId: 'azeite', pesoLiquido: 0.1, unidade: 'l' },
    { tipo: 'insumo', insumoId: 'manjericao', pesoLiquido: 0.02, unidade: 'kg' },
  ],
};

const lasanha: Receita = {
  id: 'lasanha',
  rendimento: 1,
  linhas: [
    { tipo: 'insumo', insumoId: 'massa-lasanha', pesoLiquido: 0.15, unidade: 'kg' },
    { tipo: 'insumo', insumoId: 'carne-moida', pesoLiquido: 0.22, unidade: 'kg' },
    { tipo: 'sub_receita', subReceitaId: 'molho-tomate', pesoLiquido: 0.15, unidade: 'kg' },
    { tipo: 'insumo', insumoId: 'mucarela', pesoLiquido: 0.1, unidade: 'kg' },
    { tipo: 'insumo', insumoId: 'parmesao', pesoLiquido: 0.08, unidade: 'kg' },
  ],
};

const ctx: ResolverContexto = {
  insumoPorId: new Map(insumos.map((i) => [i.id, i])),
  receitaPorId: new Map([molhoTomate, lasanha].map((r) => [r.id, r])),
  lotesProteina: [],
};

describe('calcularCmvReceita', () => {
  it('calcula o custo do preparo proprio somando cada insumo com FC aplicado', () => {
    // 4*6 + 0.3*1.29*5 + 0.05*1.08*25 + 0.1*28 + 0.02*1.15*40 = 31.005
    expect(calcularCmvReceita('molho-tomate', ctx)).toBeCloseTo(31.005, 3);
  });

  it('soma insumos diretos e o custo unitario da sub-receita, sem reaplicar FC na sub-receita', () => {
    // custo_unitario_preparo = 31.005 / 5 = 6.201; linha do molho = 0.15 * 6.201 = 0.93015
    expect(calcularCmvReceita('lasanha', ctx)).toBeCloseTo(18.02215, 3);
  });

  it('custo por porcao divide pelo rendimento da receita', () => {
    expect(calcularCustoPorPorcao('lasanha', ctx)).toBeCloseTo(18.02215, 3);
    expect(calcularCustoPorPorcao('molho-tomate', ctx)).toBeCloseTo(31.005 / 5, 3);
  });

  it('lanca erro para insumo ou receita inexistente', () => {
    expect(() => calcularCmvReceita('prato-fantasma', ctx)).toThrow(/Receita nao encontrada/);
  });
});
