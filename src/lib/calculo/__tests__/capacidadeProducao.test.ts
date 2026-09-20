import { describe, expect, it } from 'vitest';
import type { Insumo } from '@/lib/dominio/insumo';
import type { Receita, LinhaFicha } from '@/lib/dominio/receita';
import { calcularCapacidadeProducao, linhasCapacidadeDaReceita } from '../capacidadeProducao';

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

describe('linhasCapacidadeDaReceita', () => {
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

  it('prato final: divide o peso bruto pelo rendimento (peso por PORCAO)', () => {
    const prato = receita({
      tipo: 'prato_final',
      rendimento: 4,
      ficha: [linha({ id: 'l1', insumoId: 'insumo-a', pesoLiquido: 200, unidade: 'g' })],
    });

    const linhas = linhasCapacidadeDaReceita(prato, new Map([['insumo-a', insumoA]]), []);

    // 200g bruto / 4 porcoes = 50g por porcao.
    expect(linhas).toEqual([{ insumoId: 'insumo-a', pesoBrutoPorPorcao: 50 }]);
  });

  it('preparo proprio: nao divide pelo rendimento -- o peso e do LOTE inteiro', () => {
    const preparo = receita({
      tipo: 'preparo_base',
      rendimento: 4,
      ficha: [linha({ id: 'l1', insumoId: 'insumo-a', pesoLiquido: 200, unidade: 'g' })],
    });

    const linhas = linhasCapacidadeDaReceita(preparo, new Map([['insumo-a', insumoA]]), []);

    expect(linhas).toEqual([{ insumoId: 'insumo-a', pesoBrutoPorPorcao: 200 }]);
  });

  it('ignora linha de sub-receita e insumo nao encontrado no mapa', () => {
    const prato = receita({
      tipo: 'prato_final',
      rendimento: 2,
      ficha: [
        linha({ id: 'l1', subReceitaId: 'sub-1', pesoLiquido: 100 }),
        linha({ id: 'l2', insumoId: 'insumo-desconhecido', pesoLiquido: 50 }),
      ],
    });

    const linhas = linhasCapacidadeDaReceita(prato, new Map([['insumo-a', insumoA]]), []);

    expect(linhas).toEqual([]);
  });
});
