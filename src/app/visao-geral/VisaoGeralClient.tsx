"use client";

import { useMemo } from "react";
import { Cell, LabelList, ReferenceArea, ReferenceLine, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { Card } from "@/components/ficha/Card";
import { Kpi } from "@/components/ficha/Kpi";
import { nums } from "@/components/ficha/tema";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { ChartTooltipCard } from "@/components/charts/ChartTooltipCard";
import { formatBRL, formatPercentEixo } from "@/components/charts/format";
import { axisLineStyle, axisTickStyle, CHART_MARGIN } from "@/components/charts/theme";
import { construirContexto } from "@/lib/dados/adaptadores";
import { calcularCmvReceita, calcularCustoPorPorcao } from "@/lib/calculo/cmv";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";
import type { Processamento } from "@/lib/dominio/processamento";
import type { Producao } from "@/lib/dominio/producao";
import type { FechamentoCmv } from "@/lib/dominio/fechamentoCmv";

export function VisaoGeralClient({
  margemAlvoCliente,
  insumos,
  receitas,
  processamentos,
  producoes,
  fechamentos,
}: {
  margemAlvoCliente: number;
  insumos: Insumo[];
  receitas: Receita[];
  processamentos: Processamento[];
  producoes: Producao[];
  fechamentos: FechamentoCmv[];
}) {
  const contexto = useMemo(() => construirContexto(insumos, receitas, processamentos), [insumos, receitas, processamentos]);
  const pratos = useMemo(() => receitas.filter((r) => r.tipo === "prato_final"), [receitas]);

  const fechamentoRecente = fechamentos[0] ?? null;
  const vendasRecentes = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const v of fechamentoRecente?.vendas ?? []) mapa.set(v.receitaId, v.quantidade);
    return mapa;
  }, [fechamentoRecente]);

  const linhas = useMemo(
    () =>
      pratos.map((p) => {
        const custoPorPorcao = calcularCustoPorPorcao(p.id, contexto);
        const qtdVendida = vendasRecentes.get(p.id) ?? p.vendasMes ?? 0;
        const precoVenda = p.precoVenda;
        const margemAlvoPct = (p.margemAlvo ?? margemAlvoCliente) * 100;
        const cmvPct = precoVenda ? (custoPorPorcao / precoVenda) * 100 : null;
        const margemPct = precoVenda ? ((precoVenda - custoPorPorcao) / precoVenda) * 100 : null;
        return {
          receita: p,
          custoPorPorcao,
          qtdVendida,
          precoVenda,
          margemAlvoPct,
          cmvPct,
          margemPct,
          abaixoDoAlvo: margemPct !== null && margemPct < margemAlvoPct,
        };
      }),
    [pratos, contexto, vendasRecentes, margemAlvoCliente],
  );

  const comPreco = linhas.filter((l) => l.precoVenda !== null && l.precoVenda > 0);
  const cmvMedio = comPreco.length > 0 ? comPreco.reduce((s, l) => s + (l.cmvPct as number), 0) / comPreco.length : null;
  const margemMedia = comPreco.length > 0 ? comPreco.reduce((s, l) => s + (l.margemPct as number), 0) / comPreco.length : null;
  const abaixoDoAlvo = comPreco.filter((l) => l.abaixoDoAlvo).length;

  const inicioMes = new Date();
  inicioMes.setDate(1);
  const prefixoMes = inicioMes.toISOString().slice(0, 7);
  const nomeMes = inicioMes.toLocaleDateString("pt-BR", { month: "long" });

  const perdasDoMes = useMemo(() => producoes.filter((p) => p.status === "perda" && p.criadoEm.startsWith(prefixoMes)), [producoes, prefixoMes]);
  const perdaTotalReais = useMemo(
    () =>
      perdasDoMes.reduce((soma, p) => {
        const receitaCalc = contexto.receitaPorId.get(p.receitaId);
        if (!receitaCalc || receitaCalc.rendimento <= 0) return soma;
        const custoDoLote = calcularCmvReceita(p.receitaId, contexto) * (p.quantidade / receitaCalc.rendimento);
        return soma + custoDoLote;
      }, 0),
    [perdasDoMes, contexto],
  );

  const perdasRecentes = useMemo(
    () => [...producoes].filter((p) => p.status === "perda").sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)).slice(0, 6),
    [producoes],
  );

  const margemAlvoMedia = comPreco.length > 0 ? comPreco.reduce((s, l) => s + l.margemAlvoPct, 0) / comPreco.length : margemAlvoCliente * 100;
  const vendasMax = Math.max(1, ...comPreco.map((l) => l.qtdVendida));
  const xMax = Math.ceil((vendasMax * 1.15) / 5) * 5;
  const margensValidas = comPreco.map((l) => l.margemPct as number).concat(margemAlvoMedia);
  const yMin = Math.floor(Math.min(0, ...margensValidas) / 5) * 5;
  const yMax = Math.ceil((Math.max(...margensValidas) + 5) / 5) * 5;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="text-[12.5px]" style={{ color: "var(--sub)" }}>
        Margem alvo: <span style={{ ...nums, color: "var(--text)", fontWeight: 600 }}>{(margemAlvoCliente * 100).toFixed(0)}%</span>
        {" · "}
        {fechamentoRecente
          ? `vendas do último fechamento salvo (${fechamentoRecente.periodoInicio.split("-").reverse().join("/")} a ${fechamentoRecente.periodoFim.split("-").reverse().join("/")})`
          : "vendas/mês cadastradas em cada receita — sem fechamento de CMV salvo ainda"}
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Kpi flat label="CMV médio dos pratos" value={cmvMedio !== null ? `${cmvMedio.toFixed(1)}%` : "—"} sub={comPreco.length === 0 ? "cadastre preço de venda nos pratos" : undefined} />
        <Kpi flat label="Margem média atual" value={margemMedia !== null ? `${margemMedia.toFixed(1)}%` : "—"} />
        <Kpi
          flat
          label="Pratos abaixo da margem alvo"
          value={abaixoDoAlvo}
          alerta={abaixoDoAlvo > 0}
          sub={`de ${comPreco.length} com preço cadastrado`}
        />
        <Kpi
          flat
          label={`Perda de estoque em ${nomeMes}`}
          value={formatBRL(perdaTotalReais)}
          alerta={perdaTotalReais > 0}
          sub={`${perdasDoMes.length} lote${perdasDoMes.length === 1 ? "" : "s"} perdido${perdasDoMes.length === 1 ? "" : "s"} no mês`}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[14px] font-semibold">Engenharia de cardápio</h2>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5" style={{ color: "var(--sub)" }}>
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} /> na margem alvo
            </span>
            <span className="flex items-center gap-1.5" style={{ color: "var(--sub)" }}>
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--danger)" }} /> abaixo do alvo
            </span>
          </div>
        </div>
        <p className="text-[12px] mb-4" style={{ color: "var(--sub)" }}>Margem por prato (eixo vertical) contra volume de vendas (eixo horizontal). Só entra quem tem preço de venda cadastrado.</p>
        <Card className="p-6">
          <ChartFrame
            vazio={comPreco.length === 0}
            tituloVazio="Nenhum prato com preço de venda cadastrado ainda."
            dicaVazio="Cadastre o preço de venda em Receitas & Fichas pra esse gráfico começar a preencher."
          >
            <ScatterChart margin={CHART_MARGIN}>
              <XAxis
                type="number"
                dataKey="qtdVendida"
                name="Vendas"
                domain={[0, xMax]}
                tick={axisTickStyle}
                tickLine={false}
                axisLine={axisLineStyle}
                label={{ value: "Vendas no período", position: "insideBottom", offset: -5, fontSize: 11, fill: "var(--faint)" }}
              />
              <YAxis
                type="number"
                dataKey="margemPct"
                name="Margem %"
                domain={[yMin, yMax]}
                tick={axisTickStyle}
                tickLine={false}
                axisLine={axisLineStyle}
                width={40}
                tickFormatter={formatPercentEixo}
              />
              <ZAxis type="number" dataKey="qtdVendida" range={[180, 480]} />
              <ReferenceArea x1={0} x2={xMax} y1={yMin} y2={margemAlvoMedia} fill="var(--danger)" fillOpacity={0.05} />
              <ReferenceLine
                y={margemAlvoMedia}
                stroke="var(--border-strong)"
                strokeDasharray="4 4"
                strokeWidth={1.2}
                label={{ value: `margem alvo ${margemAlvoMedia.toFixed(0)}%`, position: "insideBottomRight", fontSize: 10, fill: "var(--sub)" }}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ payload }) => {
                  if (!payload || !payload.length) return null;
                  const p = payload[0].payload as (typeof comPreco)[number];
                  return (
                    <ChartTooltipCard
                      titulo={p.receita.nomePrato}
                      linhas={[
                        { rotulo: "Margem", valor: `${(p.margemPct as number).toFixed(1)}%`, cor: p.abaixoDoAlvo ? "var(--danger)" : "var(--accent)", destaque: p.abaixoDoAlvo },
                        { rotulo: "Vendas no período", valor: String(p.qtdVendida) },
                        { rotulo: "CMV", valor: `${(p.cmvPct as number).toFixed(1)}%` },
                      ]}
                    />
                  );
                }}
              />
              <Scatter data={comPreco}>
                {comPreco.map((p) => (
                  <Cell key={p.receita.id} fill={p.abaixoDoAlvo ? "var(--danger)" : "var(--accent)"} stroke="var(--panel)" strokeWidth={2} />
                ))}
                <LabelList
                  dataKey="receita.nomePrato"
                  content={(props) => {
                    const { x, y, value } = props as { x: number; y: number; value: string };
                    return (
                      <text x={x} y={y - 14} textAnchor="middle" fontSize={11} fontWeight={500} fill="var(--text)">
                        {value}
                      </text>
                    );
                  }}
                />
              </Scatter>
            </ScatterChart>
          </ChartFrame>
        </Card>
      </div>

      <div>
        <h2 className="text-[14px] font-semibold mb-1">Perdas recentes</h2>
        <p className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>Últimos lotes descartados no quadro de Produções, com o motivo registrado.</p>
        <Card>
          {perdasRecentes.length === 0 ? (
            <div className="py-8 text-center text-[12.5px]" style={{ color: "var(--faint)" }}>Nenhuma perda registrada ainda.</div>
          ) : (
            <table className="w-full text-[12.5px]">
              <thead>
                <tr style={{ color: "var(--faint)" }} className="text-left text-[10.5px] uppercase tracking-wide">
                  <th className="py-2.5 px-5 font-medium">Lote</th>
                  <th className="py-2.5 px-3 font-medium">Prato/preparo</th>
                  <th className="py-2.5 px-3 font-medium text-right">Quantidade</th>
                  <th className="py-2.5 px-5 font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {perdasRecentes.map((p) => (
                  <tr key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="py-2.5 px-5 font-medium" style={nums}>{p.lote}</td>
                    <td className="py-2.5 px-3">{p.nomeReceita}</td>
                    <td className="py-2.5 px-3 text-right" style={nums}>{p.quantidade} {p.unidadeRendimento}</td>
                    <td className="py-2.5 px-5" style={{ color: "var(--danger)" }}>{p.motivoPerda ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
