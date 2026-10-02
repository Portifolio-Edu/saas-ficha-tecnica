"use client";

// DESEMPENHO (2026-10-02): o gráfico "Oscilação de temperatura" saiu de
// SegurancaClient.tsx pra carregar sob demanda (next/dynamic) — o Recharts
// não entra mais na abertura da tela. Conteúdo igual ao que estava lá.
// Reverter: colar este JSX de volta no lugar de <GraficoTemperatura/>.

import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { ChartTooltipCard } from "@/components/charts/ChartTooltipCard";
import { CHART_ANIMATION_DURATION, CHART_ANIMATION_EASING, CHART_MARGIN, axisLineStyle, axisTickStyle, chartGridProps } from "@/components/charts/theme";
import { formatQtd } from "@/components/charts/format";
import type { LocalArmazenamento, RegistroTemperatura } from "@/lib/dominio/temperatura";
import { foraDaFaixaDoLocal } from "./faixa";

export function GraficoTemperatura({ leituras, local }: { leituras: (RegistroTemperatura & { dataLabel: string })[]; local: LocalArmazenamento | null }) {
  return (
    <ChartFrame
      vazio={leituras.length === 0}
      tituloVazio="Nenhuma leitura registrada para este local ainda."
      dicaVazio="Registre uma leitura pra esse gráfico aparecer aqui."
    >
      <LineChart data={leituras} margin={CHART_MARGIN}>
        <CartesianGrid {...chartGridProps} />
        <XAxis dataKey="dataLabel" tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} />
        <YAxis tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} width={44} tickFormatter={(v: number) => `${formatQtd(v)}°`} />
        {local?.temperaturaMinC != null && (
          <ReferenceLine
            y={local.temperaturaMinC}
            stroke="var(--border-strong)"
            strokeDasharray="4 4"
            label={{ value: "mín.", position: "insideBottomRight", fontSize: 10, fill: "var(--sub)" }}
          />
        )}
        {local?.temperaturaMaxC != null && (
          <ReferenceLine
            y={local.temperaturaMaxC}
            stroke="var(--border-strong)"
            strokeDasharray="4 4"
            label={{ value: "máx.", position: "insideTopRight", fontSize: 10, fill: "var(--sub)" }}
          />
        )}
        <Tooltip
          content={({ payload }) => {
            if (!payload || !payload.length) return null;
            const p = payload[0].payload as RegistroTemperatura & { dataLabel: string };
            const fora = foraDaFaixaDoLocal(local, p.temperaturaC);
            return (
              <ChartTooltipCard
                titulo={`${p.dataLabel} · ${p.responsavel}`}
                linhas={[
                  { rotulo: "Temperatura", valor: `${formatQtd(p.temperaturaC)}°C`, destaque: fora },
                  ...(p.nomeInsumo ? [{ rotulo: "Motivo", valor: p.nomeInsumo }] : []),
                ]}
              />
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="temperaturaC"
          stroke="var(--text)"
          strokeWidth={2}
          isAnimationActive
          animationDuration={CHART_ANIMATION_DURATION}
          animationEasing={CHART_ANIMATION_EASING}
          dot={(props) => {
            const { cx, cy, payload, index } = props as unknown as { cx: number; cy: number; payload: RegistroTemperatura; index: number };
            const fora = foraDaFaixaDoLocal(local, payload.temperaturaC);
            return <circle key={index} cx={cx} cy={cy} r={fora ? 6 : 3.5} fill={fora ? "var(--danger)" : "var(--text)"} />;
          }}
        />
      </LineChart>
    </ChartFrame>
  );
}
