"use client";

// DESEMPENHO (2026-10-02): o gráfico "Evolução do CMV real x teórico" saiu
// de CmvClient.tsx pra carregar sob demanda (next/dynamic) — o Recharts não
// entra mais na abertura da tela. Conteúdo igual ao que estava lá.
// Reverter: colar este JSX de volta no lugar de <GraficoEvolucaoCmv/>.

import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { ChartTooltipCard } from "@/components/charts/ChartTooltipCard";
import { formatPercent, formatPercentEixo } from "@/components/charts/format";
import {
  CATEGORICAL_PALETTE,
  CHART_ANIMATION_DURATION,
  CHART_ANIMATION_EASING,
  CHART_MARGIN,
  axisLineStyle,
  axisTickStyle,
  chartGridProps,
} from "@/components/charts/theme";

// CMV real x teorico e uma comparacao de identidade (2 series), nao de
// status -- verde do accent fica proximo demais do preto do texto pra
// distinguir num grafico pequeno, entao usa o primeiro tom categorico
// (mesma paleta validada do donut) pro "real", mantendo o teorico em "var(--text)".
const COR_CMV_REAL = CATEGORICAL_PALETTE[0];

export function GraficoEvolucaoCmv({ dados }: { dados: { periodo: string; cmvReal: number; cmvTeorico: number }[] }) {
  return (
    <ChartFrame
      vazio={dados.length === 0}
      tituloVazio="Nenhum fechamento salvo ainda."
      dicaVazio="Salve o fechamento do período acima pra esse gráfico começar a preencher."
    >
      <LineChart data={dados} margin={CHART_MARGIN}>
        <CartesianGrid {...chartGridProps} />
        <XAxis dataKey="periodo" tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} />
        <YAxis tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} tickFormatter={formatPercentEixo} />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ color: "var(--sub)", fontSize: 11 }}>{value}</span>}
        />
        <Tooltip
          content={({ payload, label }) => {
            if (!payload || !payload.length) return null;
            const d = payload[0].payload as { periodo: string; cmvReal: number; cmvTeorico: number };
            return (
              <ChartTooltipCard
                titulo={String(label)}
                linhas={[
                  { rotulo: "CMV real", valor: formatPercent(d.cmvReal), cor: COR_CMV_REAL },
                  { rotulo: "CMV teórico", valor: formatPercent(d.cmvTeorico), cor: "var(--text)" },
                ]}
              />
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="cmvTeorico"
          name="CMV teórico"
          stroke={"var(--text)"}
          strokeWidth={2}
          dot={{ r: 4, fill: "var(--text)" }}
          isAnimationActive
          animationDuration={CHART_ANIMATION_DURATION}
          animationEasing={CHART_ANIMATION_EASING}
        />
        <Line
          type="monotone"
          dataKey="cmvReal"
          name="CMV real"
          stroke={COR_CMV_REAL}
          strokeWidth={2}
          dot={{ r: 4, fill: COR_CMV_REAL }}
          isAnimationActive
          animationDuration={CHART_ANIMATION_DURATION}
          animationEasing={CHART_ANIMATION_EASING}
        />
      </LineChart>
    </ChartFrame>
  );
}
