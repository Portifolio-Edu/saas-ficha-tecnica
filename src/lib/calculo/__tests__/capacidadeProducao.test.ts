import { describe, expect, it } from 'vitest';
import { calcularCapacidadeProducao } from '../capacidadeProducao';

describe('calcularCapacidadeProducao', () => {
  it('usa o insumo mais escasso como gargalo, nao a media', () => {
    const saldos = new Map([
      ['farinha', { insumoId: 'farinha', saldoAtual: 9 }],
      ['mucarela', { insumoId: 'mucarela', saldoAtual: 4.2 }],
    ]);
    const ficha = [
      { insumoId: 'farinha', pesoBrutoPorPorcao: 0.05 }, // 180 porcoes possiveis
      { insumoId: 'mucarela', pesoBrutoPorPorcao: 0.2 }, // 21 porcoes possiveis
    ];

    const resultado = calcularCapacidadeProducao(ficha, saldos);

    expect(resultado.porcoesPossiveis).toBe(21);
    expect(resultado.insumoGargalo).toBe('mucarela');
    expect(resultado.insumosForaDoCalculo).toEqual([]);
  });

  it('ignora insumo sem estoque rastreado em vez de tratar como zero', () => {
    const saldos = new Map([['farinha', { insumoId: 'farinha', saldoAtual: 9 }]]);
    const ficha = [
      { insumoId: 'farinha', pesoBrutoPorPorcao: 0.05 },
      { insumoId: 'insumo-sem-rastreio', pesoBrutoPorPorcao: 0.1 },
    ];

    const resultado = calcularCapacidadeProducao(ficha, saldos);

    expect(resultado.porcoesPossiveis).toBe(180);
    expect(resultado.insumosForaDoCalculo).toEqual(['insumo-sem-rastreio']);
  });

  it('retorna capacidade desconhecida (null), nao zero, quando nenhum insumo tem estoque rastreado', () => {
    const resultado = calcularCapacidadeProducao(
      [{ insumoId: 'sem-rastreio', pesoBrutoPorPorcao: 0.1 }],
      new Map(),
    );

    expect(resultado.porcoesPossiveis).toBeNull();
    expect(resultado.insumoGargalo).toBeNull();
    expect(resultado.insumosForaDoCalculo).toEqual(['sem-rastreio']);
  });
});
