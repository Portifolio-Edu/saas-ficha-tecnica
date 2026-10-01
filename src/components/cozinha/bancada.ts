// FICHAS (2026-09-25): quantidades como se fala na bancada, usadas na aba
// Fichas do modo cozinha (FichasCozinha.tsx). Testes: __tests__/bancada.test.ts.

import { unidadeNoPlural } from "@/components/producoes/formato";

export const fmt = (n: number, casas: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: casas });

/** "discos" com 1 → "disco"; com 3 → "discos". kg, g, l, ml e un não mudam. */
export function unidadeCerta(qtd: number, unidade: string): string {
  if (/^(kg|g|l|ml|un)$/i.test(unidade)) return unidade;
  if (qtd > 1) return unidadeNoPlural(qtd, unidade);
  if (unidade.endsWith("ões")) return unidade.slice(0, -3) + "ão";
  if (unidade.endsWith("s")) return unidade.slice(0, -1);
  return unidade;
}

/** Quantidade como se fala na cozinha: 0,15 l → 150 ml; 0,01 kg → 10 g. */
export function qtdDeBancada(qtd: number, unidade: string): string {
  const u = unidade.trim().toLowerCase();
  const gramas = (g: number) => `${fmt(g, g >= 10 ? 0 : 1)} g`;
  const ml = (m: number) => `${fmt(m, m >= 10 ? 0 : 1)} ml`;
  if (u === "kg") return qtd < 1 ? gramas(qtd * 1000) : `${fmt(qtd, 3)} kg`;
  if (u === "g") return qtd >= 1000 ? `${fmt(qtd / 1000, 3)} kg` : gramas(qtd);
  if (u === "l" || u === "litro" || u === "litros") return qtd < 1 ? ml(qtd * 1000) : `${fmt(qtd, 3)} ${qtd === 1 ? "litro" : "litros"}`;
  if (u === "ml") return qtd >= 1000 ? `${fmt(qtd / 1000, 3)} litros` : ml(qtd);
  return `${fmt(qtd, 2)} ${unidadeCerta(qtd, unidade)}`;
}
