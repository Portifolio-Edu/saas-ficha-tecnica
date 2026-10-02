"use client";

// DESEMPENHO (2026-10-02): o gráfico "FC observado por lote" saiu de
// ProteinasClient.tsx pra carregar sob demanda (next/dynamic) — o Recharts
// não entra mais na abertura da tela. Conteúdo igual ao que estava lá.
// Reverter: colar este JSX de volta no lugar de <GraficoFcLotes/>.

import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { ChartTooltipCard } from "@/components/charts/ChartTooltipCard";
import { CHART_ANIMATION_DURATION, CHART_ANIMATION_EASING, CHART_MARGIN, axisLineStyle, axisTickStyle, chartGridProps } from "@/components/charts/theme";
import { formatNumero, formatQtd } from "@/components/charts/format";
import type { Processamento } from "@/lib/dominio/processamento";

export function GraficoFcLotes({ lotes, fatorCorrecao }: { lotes: (Processamento & { dataLabel: string })[]; fatorCorrecao: number }) {
  return (
    <ChartFrame vazio={false} tituloVazio="Nenhum lote registrado ainda." dicaVazio="Registre um lote de processamento pra esse gráfico aparecer aqui.">
      <LineChart data={lotes} margin={CHART_MARGIN}>
        <CartesianGrid {...chartGridProps} />
        <XAxis dataKey="dataLabel" tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} />
        {/* SISTEMA premium: o eixo inclui o FC cadastrado, senão a linha tracejada de referência
            ficava fora do gráfico (ex.: cadastrado 1,12 com lotes entre 1,16 e 1,22).
            Antes: domain={["dataMin - 0.03", "dataMax + 0.03"]}. */}
        <YAxis
          domain={[(min: number) => Math.min(min, fatorCorrecao) - 0.03, (max: number) => Math.max(max, fatorCorrecao) + 0.03]}
          tick={axisTickStyle}
          tickLine={false}
          axisLine={axisLineStyle}
          width={40}
          tickFormatter={(v: number) => formatNumero(v, 2)}
        />
        <ReferenceLine
          y={fatorCorrecao}
          stroke={"var(--tinta-faint)"}
          strokeDasharray="4 4"
          label={{ value: "FC cadastrado", position: "insideTopRight", fontSize: 10, fill: "var(--sub)" }}
        />
        <Tooltip
          content={({ payload }) => {
            if (!payload || !payload.length) return null;
            const p = payload[0].payload as Processamento & { dataLabel: string };
            return (
              <ChartTooltipCard
                titulo={`${p.dataLabel} · ${p.responsavel}`}
                linhas={[
                  { rotulo: "FC do lote", valor: formatNumero(p.fcObservado, 3) },
                  { rotulo: "Bruto → líquido", valor: `${formatQtd(p.pesoBrutoRecebido)}kg → ${formatQtd(p.pesoLiquidoResultante)}kg` },
                ]}
              />
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="fcObservado"
          stroke={"var(--text)"}
          strokeWidth={2}
          dot={{ r: 4, fill: "var(--text)" }}
          isAnimationActive
          animationDuration={CHART_ANIMATION_DURATION}
          animationEasing={CHART_ANIMATION_EASING}
        />
      </LineChart>
    </ChartFrame>
  );
}
