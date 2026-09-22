
// Padrao visual compartilhado por todo grafico do sistema (Recharts). Ver
// src/components/charts/README.md pra o que cada peca cobre.

export const CHART_MIN_HEIGHT = 320;

// Margem interna generosa: espaco pros rotulos de valor (topo/direita) nao
// colidirem com a borda do card, sem cortar o eixo Y a esquerda.
export const CHART_MARGIN = { top: 28, right: 28, bottom: 8, left: 8 } as const;
export const CHART_MARGIN_HORIZONTAL_BARS = { top: 12, right: 40, bottom: 8, left: 8 } as const;

// Grade horizontal sutil apenas -- nenhuma linha vertical (regra do padrao).
export const chartGridProps = { stroke: "var(--border)", horizontal: true, vertical: false } as const;
export const chartGridPropsHorizontalBars = { stroke: "var(--border)", horizontal: false, vertical: true } as const;

export const axisTickStyle = { fontSize: 11, fill: "var(--faint)", fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" } as const;
export const axisLineStyle = { stroke: "var(--border)" } as const;

export const CHART_ANIMATION_DURATION = 700;
export const CHART_ANIMATION_EASING = "ease-out" as const;

// Ordem categorica validada (dataviz skill, references/palette.md, slots
// 1-5): CVD Delta E >= 8 adjacente, contraste >= 3:1 na superficie clara do
// app. Reservada pra identidade (donut de ingredientes) -- nunca reciclada
// pra status (isso continua sendo "var(--danger)" / "var(--text)" nos graficos de barra).
export const CATEGORICAL_PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"] as const;
export const CATEGORICAL_OUTROS_COLOR = "var(--faint)";

export function corCategorica(indice: number): string {
  return CATEGORICAL_PALETTE[indice % CATEGORICAL_PALETTE.length];
}
