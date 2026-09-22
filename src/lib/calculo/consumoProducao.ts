import { pesoBrutoDaLinha } from '@/lib/dados/adaptadores';
import type { Insumo } from '@/lib/dominio/insumo';
import type { Receita } from '@/lib/dominio/receita';
import type { Processamento } from '@/lib/dominio/processamento';

export interface ConsumoInsumo {
  insumoId: string;
  nome: string;
  unidadeMedida: string;
  quantidade: number;
}

// Sub-receita dentro de sub-receita existe (massa -> recheio -> molho), mas
// ciclo não: o limite impede loop infinito se um cadastro apontar pra si mesmo.
const PROFUNDIDADE_MAXIMA = 6;

/**
 * Quanto de cada insumo sai do estoque ao produzir `quantidade` de uma
 * receita, na unidade de rendimento dela. Usa o peso BRUTO (líquido × FC
 * efetivo), porque é o bruto que sai da câmara. Sub-receita entra pela mesma
 * proporção do CMV: quantidade usada ÷ rendimento do preparo.
 */
export function consumoDeInsumosDaProducao(
  receita: Receita,
  quantidade: number,
  receitaPorId: Map<string, Receita>,
  insumoPorId: Map<string, Insumo>,
  processamentos: Processamento[],
): ConsumoInsumo[] {
  const fator = quantidade / (receita.rendimento || 1);
  const totais = new Map<string, ConsumoInsumo>();
  acumular(receita, fator, receitaPorId, insumoPorId, processamentos, totais, 0);
  return Array.from(totais.values())
    .map((c) => ({ ...c, quantidade: Number(c.quantidade.toFixed(3)) }))
    .filter((c) => c.quantidade > 0);
}

function acumular(
  receita: Receita,
  fator: number,
  receitaPorId: Map<string, Receita>,
  insumoPorId: Map<string, Insumo>,
  processamentos: Processamento[],
  totais: Map<string, ConsumoInsumo>,
  profundidade: number,
): void {
  if (profundidade > PROFUNDIDADE_MAXIMA) return;

  for (const linha of receita.ficha) {
    if (linha.insumoId) {
      const insumo = insumoPorId.get(linha.insumoId);
      if (!insumo) continue;
      let bruto: number;
      try {
        bruto = pesoBrutoDaLinha(linha, insumoPorId, processamentos) ?? linha.pesoLiquido;
      } catch {
        // Unidade da ficha incompatível com a do insumo: baixa o líquido em vez
        // de nada, pra perda de estoque não sumir do registro.
        bruto = linha.pesoLiquido;
      }
      const atual = totais.get(insumo.id);
      const qtd = bruto * fator;
      if (atual) atual.quantidade += qtd;
      else totais.set(insumo.id, { insumoId: insumo.id, nome: insumo.nome, unidadeMedida: insumo.unidadeMedida, quantidade: qtd });
    } else if (linha.subReceitaId) {
      const sub = receitaPorId.get(linha.subReceitaId);
      if (!sub) continue;
      const proporcao = (linha.pesoLiquido / (sub.rendimento || 1)) * fator;
      acumular(sub, proporcao, receitaPorId, insumoPorId, processamentos, totais, profundidade + 1);
    }
  }
}
