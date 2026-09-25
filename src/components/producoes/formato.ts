// Formatos do quadro de produção, usados pelo gestor (ProducoesClient) e pela
// cozinha (QuadroProducaoCozinha). Saiu de ProducoesClient em 2026-09-25.

/** Plural da unidade de rendimento ("15 porções", "2 discos", "3 kg"). */
export function unidadeNoPlural(qtd: number, unidade: string): string {
  if (qtd === 1) return unidade;
  if (unidade.endsWith("ção")) return unidade.slice(0, -3) + "ções";
  if (/^(kg|g|l|ml|un)$/i.test(unidade) || unidade.endsWith("s")) return unidade;
  return /[aeiou]$/i.test(unidade) ? unidade + "s" : unidade;
}

/** Tint sobre um token do tema (cores de etapa). */
export const tint = (cor: string, pct: number) => `color-mix(in srgb, ${cor} ${pct}%, transparent)`;
