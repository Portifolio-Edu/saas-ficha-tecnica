"use client";

import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";
import { formatNumero } from "@/components/charts/format";
import { ChartFrame } from "./ChartFrame";
import { ChartTooltipCard } from "./ChartTooltipCard";
import { formatBRL, formatPercent } from "./format";
import { CATEGORICAL_OUTROS_COLOR, CHART_ANIMATION_DURATION, CHART_ANIMATION_EASING, CHART_MIN_HEIGHT, corCategorica } from "./theme";

export interface FatiaDonut {
  nome: string;
  valor: number;
  /** true = fatia agregada de itens de cauda longa ("Outros"), usa cor neutra em vez de entrar na ordem categorica. */
  outros?: boolean;
}

interface RotuloProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  percent?: number;
  name?: string;
}

function rotuloFatia({ cx = 0, cy = 0, midAngle = 0, outerRadius = 0, percent = 0, name = "" }: RotuloProps) {
  const RADIAN = Math.PI / 180;
  const raio = outerRadius + 18;
  const x = cx + raio * Math.cos(-midAngle * RADIAN);
  const y = cy + raio * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill={"var(--sub)"} fontSize={11} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central">
      {`${name} · ${formatNumero((percent * 100), 0)}%`}
    </text>
  );
}

/**
 * Donut de composicao (custo por ingrediente, etc.): rotulo de nome + % vive
 * na propria fatia (nao so no hover), cor categorica validada pra CVD nas
 * fatias nomeadas e cor neutra pra fatia agregada "outros".
 */
export function Donut({
  dados,
  altura = CHART_MIN_HEIGHT,
  tituloVazio,
  dicaVazio,
}: {
  dados: FatiaDonut[];
  altura?: number;
  tituloVazio: string;
  dicaVazio: string;
}) {
  const total = dados.reduce((s, d) => s + d.valor, 0);
  const vazio = dados.length === 0 || total <= 0;

  return (
    <ChartFrame altura={altura} vazio={vazio} tituloVazio={tituloVazio} dicaVazio={dicaVazio}>
      <PieChart>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload || !payload.length) return null;
            const d = payload[0].payload as FatiaDonut;
            const cor = (payload[0] as unknown as { color?: string }).color;
            const pct = total > 0 ? (d.valor / total) * 100 : 0;
            return (
              <ChartTooltipCard
                titulo={d.nome}
                linhas={[
                  { rotulo: "Custo", valor: formatBRL(d.valor), cor },
                  { rotulo: "Participação", valor: formatPercent(pct, 0) },
                ]}
              />
            );
          }}
        />
        <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} formatter={(value) => <span style={{ color: "var(--sub)", fontSize: 11 }}>{value}</span>} />
        <Pie
          data={dados}
          dataKey="valor"
          nameKey="nome"
          innerRadius="55%"
          outerRadius="75%"
          paddingAngle={dados.length > 1 ? 2 : 0}
          isAnimationActive
          animationDuration={CHART_ANIMATION_DURATION}
          animationEasing={CHART_ANIMATION_EASING}
          label={rotuloFatia}
          labelLine={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
        >
          {dados.map((d, i) => (
            <Cell key={d.nome} fill={d.outros ? CATEGORICAL_OUTROS_COLOR : corCategorica(i)} stroke={"var(--panel)"} strokeWidth={2} />
          ))}
        </Pie>
      </PieChart>
    </ChartFrame>
  );
}
