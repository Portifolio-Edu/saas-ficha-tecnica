// LIGAÇÃO PRODUTO DO PDV -> FICHA (2026-10-03): tipos e regras puras (sem
// Supabase), usados pelo servidor e pela tela. Tabela: produtos_pdv
// (supabase/migrations/20261003100000_produtos_pdv.sql).
//
// Três estados por produto vendido: ligado a uma ficha, "não tem ficha"
// (bebida, taxa, couvert) ou PENDENTE (nenhum dos dois). Pendente é a
// pendência visível: aparece em Integrações e no Fechamento de CMV até alguém
// decidir; nunca é descartado em silêncio.
import type { ResumoVendas } from "@/lib/integracoes/documentoFiscal";
import { SEM_FICHA } from "@/lib/integracoes/conciliacao";

/** Canal das vendas que entram por XML fiscal ou planilha. iFood, Anota AI e Saipos terão o próprio. */
export const CANAL_IMPORTACAO = "importacao";

export interface ProdutoPdv {
  id: string;
  canal: string;
  chave: string;
  codigo: string | null;
  descricao: string;
  receitaId: string | null;
  semFicha: boolean;
  ultimaQuantidade: number | null;
  ultimoValor: number | null;
  /** AAAA-MM-DD */
  ultimaVendaEm: string | null;
}

/** Item mandado ao banco por `salvar_produtos_pdv`. */
export interface ItemParaSalvar {
  chave: string;
  codigo: string;
  descricao: string;
  receitaId: string | null;
  semFicha: boolean;
  quantidade: number;
  valor: number;
  data: string | null;
}

export function estaPendente(p: Pick<ProdutoPdv, "receitaId" | "semFicha">): boolean {
  return p.receitaId === null && !p.semFicha;
}

export interface ResumoPendencias {
  /** Quantos produtos vendidos estão sem decisão. */
  produtos: number;
  /** Faturamento da última importação desses produtos (R$). */
  valor: number;
}

export function resumirPendencias(produtos: ProdutoPdv[]): ResumoPendencias {
  const pendentes = produtos.filter(estaPendente);
  return { produtos: pendentes.length, valor: Math.round(pendentes.reduce((s, p) => s + (p.ultimoValor ?? 0), 0) * 100) / 100 };
}

/** O que a tela de importação usa: chave do produto → id da ficha ou SEM_FICHA. Pendente fica de fora. */
export function mapeamentoDosProdutos(produtos: ProdutoPdv[]): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const p of produtos) {
    if (p.receitaId) mapa[p.chave] = p.receitaId;
    else if (p.semFicha) mapa[p.chave] = SEM_FICHA;
  }
  return mapa;
}

/**
 * Todo produto da importação vai pro banco, decidido ou não: o que ficou sem
 * decisão entra como pendente (é isso que torna a pendência visível). Ficha
 * que não existe mais (apagada entre a abertura da tela e o envio) vira
 * pendente em vez de falhar, e o produto não some.
 */
export function itensParaSalvar(resumo: ResumoVendas, mapeamento: Record<string, string | undefined>, fichasValidas?: Set<string>): ItemParaSalvar[] {
  return resumo.produtos.map((p) => {
    const destino = mapeamento[p.chave];
    const semFicha = destino === SEM_FICHA;
    const receitaId = destino && !semFicha && (!fichasValidas || fichasValidas.has(destino)) ? destino : null;
    return {
      chave: p.chave,
      codigo: p.codigo,
      // Limites da tabela: descrição até 300 e valor nunca negativo (estorno na
      // planilha pode deixar a soma abaixo de zero e derrubar a gravação inteira).
      descricao: p.descricao.slice(0, 300),
      receitaId,
      semFicha,
      quantidade: Math.round(p.quantidade * 1000) / 1000,
      valor: Math.max(0, p.valor),
      data: resumo.fim,
    };
  });
}

/** Converte o destino escolhido na tela (id da ficha, SEM_FICHA ou vazio) no que a linha guarda. */
export function destinoParaLinha(destino: string | null): { receitaId: string | null; semFicha: boolean } {
  if (!destino) return { receitaId: null, semFicha: false };
  if (destino === SEM_FICHA) return { receitaId: null, semFicha: true };
  return { receitaId: destino, semFicha: false };
}
