import { describe, expect, it } from 'vitest';
import { calcularFechamentoCmv, calcularQuebraEstoque } from '../fechamentoCmv.js';

describe('calcularFechamentoCmv', () => {
  it('calcula CMV teorico, real e o gap entre eles', () => {
    const vendas = [
      { quantidadeVendida: 200, cmvReceita: 18.02 },
      { quantidadeVendida: 180, cmvReceita: 12.5 },
    ];
    const faturamento = 200 * 48 + 180 * 45;

    const resultado = calcularFechamentoCmv(vendas, faturamento, 6800, 9200, 7480);

    const custoTeoricoTotal = 200 * 18.02 + 180 * 12.5;
    expect(resultado.cmvTeoricoPercentual).toBeCloseTo(custoTeoricoTotal / faturamento, 6);

    const consumoReal = 6800 + 9200 - 7480;
    expect(resultado.consumoReal).toBe(consumoReal);
    expect(resultado.cmvRealPercentual).toBeCloseTo(consumoReal / faturamento, 6);
    expect(resultado.gapPercentual).toBeCloseTo(resultado.cmvRealPercentual - resultado.cmvTeoricoPercentual, 6);
  });

  it('rejeita faturamento zero ou negativo', () => {
    expect(() => calcularFechamentoCmv([], 0, 100, 100, 100)).toThrow(/positivo/);
  });
});

describe('calcularQuebraEstoque', () => {
  it('e positiva quando o consumo real supera o teorico (perda)', () => {
    const quebra = calcularQuebraEstoque({ consumoTeorico: 10, consumoReal: 12, precoUnitario: 35 });
    expect(quebra).toBeCloseTo(70);
  });

  it('e negativa quando o consumo real fica abaixo do teorico', () => {
    const quebra = calcularQuebraEstoque({ consumoTeorico: 12, consumoReal: 10, precoUnitario: 35 });
    expect(quebra).toBeCloseTo(-70);
  });
});
