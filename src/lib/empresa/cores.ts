// CONFIGURAÇÕES (2026-10-01): cor de destaque do restaurante. Só estas opções,
// cada uma com a versão do tema claro e a do escuro, todas com contraste
// conferido (≥ 4,5:1 contra painel, fundo e o fundo tingido do item ativo —
// teste em __tests__/cores.test.ts). Vermelho, laranja e verde ficam de fora:
// são as cores de risco, aviso e acerto do sistema.
// O banco guarda o `claro` (clientes.cor_destaque); cor desconhecida volta pro
// padrão. Reverter: tirar o <style> do AppShell e o card "Cor de destaque".

export interface CorDestaque {
  id: string;
  nome: string;
  claro: string;
  escuro: string;
}

export const CORES_DESTAQUE: readonly CorDestaque[] = [
  { id: "indigo", nome: "Índigo", claro: "#5b4fe0", escuro: "#8f87ff" },
  { id: "azul", nome: "Azul", claro: "#1d4ed8", escuro: "#6ea8ff" },
  { id: "petroleo", nome: "Petróleo", claro: "#0e7490", escuro: "#22d3ee" },
  { id: "verde-azulado", nome: "Verde-azulado", claro: "#0f766e", escuro: "#2dd4bf" },
  { id: "roxo", nome: "Roxo", claro: "#7e22ce", escuro: "#c084fc" },
  { id: "grafite", nome: "Grafite", claro: "#3f3f46", escuro: "#d4d4d8" },
];

export const COR_PADRAO = CORES_DESTAQUE[0];

/** A cor gravada no banco vira uma das opções (desconhecida = padrão). */
export function corPorValor(valor: string | null | undefined): CorDestaque {
  const v = (valor ?? "").toLowerCase();
  return CORES_DESTAQUE.find((c) => c.claro === v || c.id === v) ?? COR_PADRAO;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Cor por cima de outra com transparência (como o navegador desenha). */
export function misturar(frente: string, fundo: string, alfa: number): string {
  const a = rgb(frente);
  const b = rgb(fundo);
  return `#${a.map((v, i) => Math.round(v * alfa + b[i] * (1 - alfa)).toString(16).padStart(2, "0")).join("")}`;
}

function luminancia(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste WCAG 2 entre duas cores sólidas. */
export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Mesma transparência do --marca-suave em globals.css. */
export const ALFA_SUAVE = { claro: 0.1, escuro: 0.14 } as const;

function rgba(hex: string, alfa: number): string {
  return `rgba(${rgb(hex).join(", ")}, ${alfa})`;
}

/**
 * CSS que troca o acento do sistema. Só sai de uma opção da lista (nunca do
 * texto do banco direto), então não tem como injetar nada no <style>.
 * Seletores com `html` na frente pra valer sobre os de globals.css.
 */
export function cssDaCor(valor: string | null | undefined): string | null {
  const cor = corPorValor(valor);
  if (cor.id === COR_PADRAO.id) return null;
  return (
    `html:root{--marca:${cor.claro};--marca-suave:${rgba(cor.claro, ALFA_SUAVE.claro)}}` +
    `html[data-theme="dark"]{--marca:${cor.escuro};--marca-suave:${rgba(cor.escuro, ALFA_SUAVE.escuro)}}`
  );
}
