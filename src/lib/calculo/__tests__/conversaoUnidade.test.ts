import { describe, expect, it } from 'vitest';
import { converterParaUnidadeDoInsumo } from '../conversaoUnidade.js';

describe('converterParaUnidadeDoInsumo', () => {
  it('retorna o mesmo valor quando a unidade ja bate', () => {
    expect(converterParaUnidadeDoInsumo(0.2, 'kg', { unidadeMedida: 'kg' })).toBe(0.2);
  });

  it('converte kg para g', () => {
    expect(converterParaUnidadeDoInsumo(0.5, 'kg', { unidadeMedida: 'g' })).toBeCloseTo(500);
  });

  it('converte g para kg', () => {
    expect(converterParaUnidadeDoInsumo(150, 'g', { unidadeMedida: 'kg' })).toBeCloseTo(0.15);
  });

  it('converte l para ml e vice-versa', () => {
    expect(converterParaUnidadeDoInsumo(0.06, 'l', { unidadeMedida: 'ml' })).toBeCloseTo(60);
    expect(converterParaUnidadeDoInsumo(60, 'ml', { unidadeMedida: 'l' })).toBeCloseTo(0.06);
  });

  it('converte "un" para peso usando peso_por_unidade do insumo', () => {
    // 1 un de massa de pizza pesa 0.12kg (peso_por_unidade), insumo medido em kg.
    expect(converterParaUnidadeDoInsumo(1, 'un', { unidadeMedida: 'kg', pesoPorUnidade: 0.12 })).toBeCloseTo(0.12);
  });

  it('converte de peso para "un" usando peso_por_unidade do insumo', () => {
    expect(converterParaUnidadeDoInsumo(0.24, 'kg', { unidadeMedida: 'un', pesoPorUnidade: 0.12 })).toBeCloseTo(2);
  });

  it('lanca erro ao converter "un" sem peso_por_unidade cadastrado', () => {
    expect(() => converterParaUnidadeDoInsumo(1, 'un', { unidadeMedida: 'kg' })).toThrow(/peso_por_unidade/);
  });

  it('lanca erro ao converter entre massa e volume sem densidade', () => {
    expect(() => converterParaUnidadeDoInsumo(1, 'kg', { unidadeMedida: 'l' })).toThrow(/densidade/);
  });
});
