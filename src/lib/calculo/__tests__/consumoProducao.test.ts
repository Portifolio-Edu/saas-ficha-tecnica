import { describe, expect, it } from 'vitest';
import type { Insumo } from '@/lib/dominio/insumo';
import type { Receita, LinhaFicha } from '@/lib/dominio/receita';
import { consumoDeInsumosDaProducao } from '../consumoProducao';

function insumo(id: string, fatorCorrecao = 1): Insumo {
  return {
    id,
    nome: id,
    categoria: 'outro',
    unidadeMedida: 'kg',
    tamanhoEmbalagem: 1,
    precoEmbalagem: 10,
    precoUnitario: 10,
    fatorCorrecao,
    pesoPorUnidade: null,
    localArmazenamentoId: null,
    estoque: null,
  };
}

function linha(overrides: Partial<LinhaFicha>): LinhaFicha {
  return { id: 'l', insumoId: null, subReceitaId: null, pesoLiquido: 0, unidade: 'kg', ...overrides };
}

function receita(overrides: Partial<Receita>): Receita {
  return {
    id: 'r',
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

const insumos = new Map([
  ['mucarela', insumo('mucarela')],
  ['tomate', insumo('tomate')],
  ['cebola', insumo('cebola', 1.29)],
]);

const molho = receita({
  id: 'molho',
  tipo: 'preparo_base',
  rendimento: 5,
  unidadeRendimento: 'kg',
  ficha: [
    linha({ insumoId: 'tomate', pesoLiquido: 4 }),
    linha({ insumoId: 'cebola', pesoLiquido: 0.3 }),
  ],
});

const pizza = receita({
  id: 'pizza',
  rendimento: 1,
  ficha: [
    linha({ insumoId: 'mucarela', pesoLiquido: 0.2 }),
    linha({ subReceitaId: 'molho', pesoLiquido: 0.15 }),
  ],
});

const receitas = new Map([['molho', molho], ['pizza', pizza]]);

function porId(consumos: ReturnType<typeof consumoDeInsumosDaProducao>) {
  return Object.fromEntries(consumos.map((c) => [c.insumoId, c.quantidade]));
}

describe('consumoDeInsumosDaProducao', () => {
  it('baixa o peso bruto (líquido × FC), não o líquido', () => {
    const consumo = porId(consumoDeInsumosDaProducao(molho, 5, receitas, insumos, []));
    expect(consumo.tomate).toBe(4);
    expect(consumo.cebola).toBe(0.387); // 0,3 × 1,29
  });

  it('escala pela quantidade produzida sobre o rendimento da receita', () => {
    const consumo = porId(consumoDeInsumosDaProducao(molho, 10, receitas, insumos, []));
    expect(consumo.tomate).toBe(8);
  });

  it('sub-receita entra só na proporção usada, não o preparo inteiro', () => {
    // 10 pizzas × 0,15 kg de molho = 1,5 kg de molho = 30% do lote de 5 kg.
    const consumo = porId(consumoDeInsumosDaProducao(pizza, 10, receitas, insumos, []));
    expect(consumo.mucarela).toBe(2);
    expect(consumo.tomate).toBe(1.2);
    expect(consumo.cebola).toBe(0.116);
  });

  it('soma o mesmo insumo quando aparece direto e dentro de sub-receita', () => {
    const pizzaComTomateExtra = receita({
      ...pizza,
      ficha: [...pizza.ficha, linha({ insumoId: 'tomate', pesoLiquido: 0.05 })],
    });
    const consumo = porId(consumoDeInsumosDaProducao(pizzaComTomateExtra, 1, receitas, insumos, []));
    expect(consumo.tomate).toBe(0.17); // 0,12 do molho + 0,05 direto
  });

  it('não entra em loop com sub-receita que aponta pra si mesma', () => {
    const ciclica = receita({
      id: 'ciclica',
      ficha: [linha({ insumoId: 'tomate', pesoLiquido: 1 }), linha({ subReceitaId: 'ciclica', pesoLiquido: 1 })],
    });
    const consumo = consumoDeInsumosDaProducao(ciclica, 1, new Map([['ciclica', ciclica]]), insumos, []);
    expect(consumo[0].quantidade).toBeGreaterThan(0);
  });
});
