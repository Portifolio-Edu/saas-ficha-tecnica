import { describe, expect, it } from 'vitest';
import { calcularPrecoPorCanal, calcularPrecoSugerido } from '../precificacao.js';

describe('calcularPrecoSugerido', () => {
  it('usa a margem da receita quando definida, ignorando a do cliente', () => {
    expect(calcularPrecoSugerido(10, 0.5, 0.65)).toBeCloseTo(20);
  });

  it('cai para a margem do cliente quando a receita nao tem margem propria', () => {
    expect(calcularPrecoSugerido(10, null, 0.65)).toBeCloseTo(10 / 0.35);
  });

  it('rejeita margem alvo >= 100%', () => {
    expect(() => calcularPrecoSugerido(10, 1, 0.65)).toThrow(/menor que 1/);
  });
});

describe('calcularPrecoPorCanal', () => {
  it('balcao sem comissao e sem embalagem mantem o preco original', () => {
    const preco = calcularPrecoPorCanal(48, 2, { comissaoPercentual: 0, embala: false });
    expect(preco).toBeCloseTo(48);
  });

  it('canal que embala soma custo de embalagem antes de dividir pela comissao', () => {
    // Lasanha: preco 48, embalagem 2.20, iFood Basico 15.2%.
    const preco = calcularPrecoPorCanal(48, 2.2, { comissaoPercentual: 0.152, embala: true });
    expect(preco).toBeCloseTo((48 + 2.2) / (1 - 0.152));
    // Mantem o ganho em reais do balcao, nao recalcula margem alvo em cima da
    // comissao -- por isso o preco fica bem abaixo do que uma reprecificacao
    // ingenua produziria (o erro documentado: R$48 virando R$90).
    expect(preco).toBeLessThan(90);
  });

  it('canal sem comissao mas que embala soma so o custo de embalagem', () => {
    const preco = calcularPrecoPorCanal(48, 2.2, { comissaoPercentual: 0, embala: true });
    expect(preco).toBeCloseTo(50.2);
  });

  it('rejeita comissao >= 100%', () => {
    expect(() => calcularPrecoPorCanal(48, 2, { comissaoPercentual: 1, embala: true })).toThrow(/menor que 1/);
  });
});
