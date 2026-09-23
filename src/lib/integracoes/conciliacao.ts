// INTEGRACOES (2026-09-23) -- liga o produto do PDV ("PIZZA MARGUERITA G") à
// ficha técnica ("Pizza Margherita"). A sugestão é só um ponto de partida: o
// usuário confirma ou troca, e a escolha fica lembrada pras próximas importações.

import type { ProdutoVendido, ResumoVendas } from "./documentoFiscal";

/** Produto que não tem ficha (bebida, taxa de entrega, couvert): entra no faturamento, não nas vendas por prato. */
export const SEM_FICHA = "sem-ficha";

const PALAVRAS_VAZIAS = new Set(["de", "da", "do", "das", "dos", "com", "e", "a", "o", "ao", "na", "no", "em", "c", "p", "un", "und", "g", "m", "p", "gg", "grande", "media", "medio", "pequena", "pequeno", "tradicional", "porcao", "prato"]);

export function tokens(texto: string): string[] {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 1 && !PALAVRAS_VAZIAS.has(t) && !/^\d+(ml|l|g|kg)?$/.test(t));
}

function distancia(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

function parecidas(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  const maior = Math.max(a.length, b.length);
  return maior >= 5 && 1 - distancia(a, b) / maior >= 0.8;
}

/** 0 a 1: quanto do nome da ficha aparece no nome do produto do PDV. */
export function semelhanca(produtoPdv: string, nomeFicha: string): number {
  const tp = tokens(produtoPdv);
  const tf = tokens(nomeFicha);
  if (!tp.length || !tf.length) return 0;
  const achadosFicha = tf.filter((t) => tp.some((p) => parecidas(p, t))).length;
  const achadosPdv = tp.filter((p) => tf.some((t) => parecidas(p, t))).length;
  return (achadosFicha / tf.length) * 0.8 + (achadosPdv / tp.length) * 0.2;
}

export function sugerirFicha(produto: ProdutoVendido, fichas: { id: string; nome: string }[]): string | null {
  let melhor: { id: string; nota: number } | null = null;
  for (const f of fichas) {
    const nota = semelhanca(produto.descricao, f.nome);
    if (nota >= 0.75 && (!melhor || nota > melhor.nota)) melhor = { id: f.id, nota };
  }
  return melhor?.id ?? null;
}

export interface VendasConciliadas {
  /** Quantidade vendida por ficha (receitaId). */
  vendas: { receitaId: string; quantidade: number; valor: number }[];
  faturamento: number;
  faturamentoSemFicha: number;
  /** Produtos ainda sem decisão (nem ficha, nem "sem ficha"). */
  pendentes: number;
}

export function conciliar(resumo: ResumoVendas, mapeamento: Record<string, string | undefined>): VendasConciliadas {
  const porFicha = new Map<string, { quantidade: number; valor: number }>();
  let faturamentoSemFicha = 0;
  let pendentes = 0;
  for (const p of resumo.produtos) {
    const destino = mapeamento[p.chave];
    if (!destino) {
      pendentes++;
      faturamentoSemFicha += p.valor;
      continue;
    }
    if (destino === SEM_FICHA) {
      faturamentoSemFicha += p.valor;
      continue;
    }
    const atual = porFicha.get(destino) ?? { quantidade: 0, valor: 0 };
    porFicha.set(destino, { quantidade: atual.quantidade + p.quantidade, valor: atual.valor + p.valor });
  }
  return {
    vendas: [...porFicha.entries()].map(([receitaId, v]) => ({ receitaId, quantidade: Math.round(v.quantidade * 1000) / 1000, valor: Math.round(v.valor * 100) / 100 })),
    faturamento: resumo.faturamento,
    faturamentoSemFicha: Math.round(faturamentoSemFicha * 100) / 100,
    pendentes,
  };
}
