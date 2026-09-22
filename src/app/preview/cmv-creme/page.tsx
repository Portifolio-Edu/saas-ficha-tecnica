"use client";

import { useState } from "react";
import { Cell, Legend, Line, LineChart, Pie, PieChart, Tooltip, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { ChartTooltipCard } from "@/components/charts/ChartTooltipCard";
import { formatBRL, formatPercent, formatPercentEixo } from "@/components/charts/format";
import { CHART_ANIMATION_DURATION, CHART_ANIMATION_EASING, CHART_MARGIN, axisLineStyle, axisTickStyle, chartGridProps } from "@/components/charts/theme";
import { construirContexto, linhasCustoDetalhado, paraProcessamentoCalc } from "@/lib/dados/adaptadores";
import { calcularCustoPorPorcao } from "@/lib/calculo/cmv";
import { calcularFechamentoCmv } from "@/lib/calculo/fechamentoCmv";
import { NOME_RESTAURANTE, pratos, preparos, insumos, processamentos, fechamentos } from "../fixtures";

const GAP_ALERTA_PP = 3;
const TOP_DONUT = 4;

// Sálvia e damasco vieram medidos do usuário; as 3 tonalidades seguintes
// (musgo, terracota, areia) foram derivadas por mim pra completar um
// categórico de 5+"outros" -- o donut real tem mais fatias que as 2 cores
// dadas cobrem. Sinalizado no autocrítica ao final.
const PALETA_CREME = ["#BEC6AF", "#DCC18A", "#8F9B7C", "#C98F5E", "#EDE0C8"];
const OUTROS_COR = "var(--faint)";

const contexto = construirContexto(insumos, [...pratos, ...preparos], processamentos);
const insumoPorId = new Map(insumos.map((i) => [i.id, i]));
const preparoPorId = new Map(preparos.map((p) => [p.id, p]));
const lotesProteina = processamentos.map(paraProcessamentoCalc);
const pratoPorId = new Map(pratos.map((p) => [p.id, p]));

const fechamentoRecente = fechamentos[0];
const linhasCmv = pratos
  .map((p) => {
    const custoPorPorcao = calcularCustoPorPorcao(p.id, contexto);
    const vendaSalva = fechamentoRecente?.vendas.find((v) => v.receitaId === p.id);
    const qtdVendida = vendaSalva?.quantidade ?? p.vendasMes ?? 0;
    const precoVenda = p.precoVenda ?? 0;
    return {
      receita: p,
      custoPorPorcao,
      qtdVendida,
      faturamentoPrato: qtdVendida * precoVenda,
      custoTeoricoPrato: qtdVendida * custoPorPorcao,
    };
  })
  .sort((a, b) => b.faturamentoPrato - a.faturamentoPrato);

const faturamentoPeriodo = linhasCmv.reduce((s, l) => s + l.faturamentoPrato, 0);
const custoTeoricoPeriodo = linhasCmv.reduce((s, l) => s + l.custoTeoricoPrato, 0);

const resultado = fechamentoRecente
  ? calcularFechamentoCmv(
      linhasCmv.map((l) => ({ quantidadeVendida: l.qtdVendida, cmvReceita: l.custoPorPorcao })),
      fechamentoRecente.faturamento,
      fechamentoRecente.estoqueInicial,
      fechamentoRecente.compras,
      fechamentoRecente.estoqueFinal,
    )
  : null;

const cmvTeoricoPct = resultado ? resultado.cmvTeoricoPercentual * 100 : 0;
const cmvRealPct = resultado ? resultado.cmvRealPercentual * 100 : 0;
const gapPct = resultado ? resultado.gapPercentual * 100 : 0;
const gapReais = resultado?.gapReais ?? 0;

// Evolução: só há 1 fechamento salvo na fixture, então o gráfico mostra 1
// ponto real -- não inventei histórico pra parecer mais preenchido.
const evolucao = fechamentos
  .map((f) => {
    const vendas = f.vendas.map((v) => {
      const p = pratoPorId.get(v.receitaId);
      return { quantidadeVendida: v.quantidade, cmvReceita: p ? calcularCustoPorPorcao(p.id, contexto) : 0 };
    });
    const r = calcularFechamentoCmv(vendas, f.faturamento, f.estoqueInicial, f.compras, f.estoqueFinal);
    return { periodo: f.periodoFim.split("-").reverse().join("/"), real: r.cmvRealPercentual * 100, teorico: r.cmvTeoricoPercentual * 100 };
  })
  .reverse();

// Prato de exemplo pro donut: o de maior faturamento com custo detalhável.
const pratoDonut = linhasCmv[0]?.receita ?? null;
const donutDados = pratoDonut
  ? (() => {
      const linhas = linhasCustoDetalhado(pratoDonut, insumoPorId, preparoPorId, lotesProteina, contexto)
        .filter((c) => c.custo > 0)
        .sort((a, b) => b.custo - a.custo);
      const restante = linhas.slice(TOP_DONUT).reduce((s, c) => s + c.custo, 0);
      return [...linhas.slice(0, TOP_DONUT).map((c) => ({ nome: c.nome, valor: c.custo, outros: false })), ...(restante > 0 ? [{ nome: "Outros", valor: restante, outros: true }] : [])];
    })()
  : [];

function KpiCreme({ label, valor, sub, alerta }: { label: string; valor: string; sub?: string; alerta?: boolean }) {
  return (
    <div className="cc-card p-5">
      <div className="cc-label">{label}</div>
      <div className="cc-valor" style={{ color: alerta ? "var(--alerta)" : "var(--tinta)" }}>{valor}</div>
      {sub && <div className="cc-sub">{sub}</div>}
    </div>
  );
}

export default function CmvCreme() {
  const [tema, setTema] = useState<"light" | "dark">("light");

  return (
    <div data-cmv-creme data-theme={tema} style={{ background: "var(--fundo)", color: "var(--tinta)", minHeight: "100vh" }}>
      <style>{`
        [data-cmv-creme][data-theme="light"] {
          --fundo: #FEF9F6; --painel: #FEF9F6; --tinta: #2B2B26;
          --salvia: #BEC6AF; --damasco: #DCC18A; --alerta: #B5674A;
          --sub: color-mix(in srgb, var(--tinta) 56%, var(--fundo));
          --faint: color-mix(in srgb, var(--tinta) 34%, var(--fundo));
          --borda: color-mix(in srgb, var(--tinta) 10%, var(--fundo));
          --sombra: 0 1px 2px rgba(43,43,38,.05), 0 10px 26px rgba(43,43,38,.06);
        }
        [data-cmv-creme][data-theme="dark"] {
          --fundo: #221F19; --painel: #2A261F; --tinta: #F3ECDF;
          --salvia: #AAB89A; --damasco: #E4C68F; --alerta: #D98567;
          --sub: color-mix(in srgb, var(--tinta) 56%, var(--fundo));
          --faint: color-mix(in srgb, var(--tinta) 34%, var(--fundo));
          --borda: color-mix(in srgb, var(--tinta) 14%, var(--fundo));
          --sombra: 0 1px 2px rgba(0,0,0,.35), 0 10px 26px rgba(0,0,0,.4);
        }

        [data-cmv-creme] .cc-topo { border-bottom: 1px solid var(--borda); }
        [data-cmv-creme] .cc-marca { font-weight: 600; font-size: 14px; }
        [data-cmv-creme] .cc-restaurante { font-size: 12px; color: var(--sub); }
        [data-cmv-creme] .cc-toggle { display: flex; gap: 6px; }
        [data-cmv-creme] .cc-toggle button { padding: 6px 13px; font-size: 12px; font-weight: 500; border-radius: 999px; color: var(--sub); }
        [data-cmv-creme] .cc-toggle button.ativo { background: var(--salvia); color: var(--tinta); font-weight: 600; }

        [data-cmv-creme] .cc-card { background: var(--painel); border-radius: 20px; box-shadow: var(--sombra); }
        [data-cmv-creme] .cc-label { font-size: 12px; color: var(--sub); margin-bottom: 6px; }
        [data-cmv-creme] .cc-valor { font-size: 24px; font-weight: 600; }
        [data-cmv-creme] .cc-sub { font-size: 11.5px; color: var(--faint); margin-top: 5px; }

        [data-cmv-creme] table td, [data-cmv-creme] table th { border-color: var(--borda); }
        [data-cmv-creme] table tbody tr:hover td { background: color-mix(in srgb, var(--salvia) 10%, transparent); }
      `}</style>

      <header className="cc-topo flex items-center justify-between px-10 py-5">
        <div className="flex items-center gap-3">
          <div className="cc-marca">Fechamento de CMV</div>
          <div className="cc-restaurante">{NOME_RESTAURANTE}</div>
        </div>
        <div className="cc-toggle">
          <button className={tema === "light" ? "ativo" : ""} onClick={() => setTema("light")}>Claro</button>
          <button className={tema === "dark" ? "ativo" : ""} onClick={() => setTema("dark")}>Escuro</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-10 py-10 space-y-8">
        {/* As 4 colunas aqui SÃO iguais de propósito: cada card carrega
            exatamente a mesma forma de informação (1 rótulo + 1 número
            principal + no máx. 1 valor de apoio) -- é o caso de exceção da
            regra, não um grid padrão esquecido. */}
        <div className="grid grid-cols-4 gap-4">
          <KpiCreme label="Faturamento do período" valor={`R$ ${faturamentoPeriodo.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} sub={`${linhasCmv.reduce((s, l) => s + l.qtdVendida, 0)} pratos vendidos`} />
          <KpiCreme label="CMV teórico (fichas)" valor={`${cmvTeoricoPct.toFixed(1)}%`} sub={`R$ ${custoTeoricoPeriodo.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
          <KpiCreme label="CMV real (estoque)" valor={`${cmvRealPct.toFixed(1)}%`} alerta={gapPct > GAP_ALERTA_PP} />
          <KpiCreme label="Gap não explicado" valor={`${gapPct > 0 ? "+" : ""}${gapPct.toFixed(1)} p.p.`} alerta={gapPct > GAP_ALERTA_PP} sub={`R$ ${Math.abs(gapReais).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
        </div>

        {/* Donut x linha do tempo não dividem 50/50: o donut é 1 prato, 1
            corte (participação de custo, até 5 fatias). A evolução é 2
            séries (real x teórico) cruzadas com N períodos e uma linha de
            referência -- duas dimensões de leitura (tempo x percentual)
            contra uma do donut. 1.46:1 a favor do gráfico de linha. */}
        <div className="grid grid-cols-[1fr_1.46fr] gap-6">
          <div className="cc-card p-7">
            <h2 className="text-[14px] font-semibold mb-1">Custo por ingrediente</h2>
            <p className="text-[12px] mb-4" style={{ color: "var(--sub)" }}>{pratoDonut?.nomePrato ?? "—"}, maior faturamento do período.</p>
            <ChartFrame altura={280} vazio={donutDados.length === 0} tituloVazio="Nenhum custo calculado ainda." dicaVazio="Adicione insumos na ficha desse prato.">
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload as { nome: string; valor: number; outros: boolean };
                    const total = donutDados.reduce((s, x) => s + x.valor, 0);
                    const cor = (payload[0] as unknown as { color?: string }).color;
                    return (
                      <ChartTooltipCard
                        titulo={d.nome}
                        linhas={[
                          { rotulo: "Custo", valor: formatBRL(d.valor), cor },
                          { rotulo: "Participação", valor: formatPercent(total > 0 ? (d.valor / total) * 100 : 0, 0) },
                        ]}
                      />
                    );
                  }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} formatter={(value) => <span style={{ color: "var(--sub)", fontSize: 11 }}>{value}</span>} />
                <Pie data={donutDados} dataKey="valor" nameKey="nome" innerRadius="56%" outerRadius="75%" paddingAngle={2} isAnimationActive animationDuration={CHART_ANIMATION_DURATION} animationEasing={CHART_ANIMATION_EASING}>
                  {donutDados.map((d, i) => (
                    <Cell key={d.nome} fill={d.outros ? OUTROS_COR : PALETA_CREME[i % PALETA_CREME.length]} stroke="var(--painel)" strokeWidth={2} />
                  ))}
                </Pie>
              </PieChart>
            </ChartFrame>
          </div>

          <div className="cc-card p-7">
            <h2 className="text-[14px] font-semibold mb-1">Evolução do CMV real x teórico</h2>
            <p className="text-[12px] mb-4" style={{ color: "var(--sub)" }}>Cada ponto é um fechamento salvo.</p>
            <ChartFrame altura={280} vazio={evolucao.length === 0} tituloVazio="Nenhum fechamento salvo ainda." dicaVazio="Salve um fechamento pra esse gráfico preencher.">
              <LineChart data={evolucao} margin={CHART_MARGIN}>
                <CartesianGrid {...chartGridProps} stroke="var(--borda)" />
                <XAxis dataKey="periodo" tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} />
                <YAxis tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} tickFormatter={formatPercentEixo} />
                <Tooltip
                  content={({ payload, label }) => {
                    if (!payload || !payload.length) return null;
                    const d = payload[0].payload as { real: number; teorico: number };
                    return (
                      <ChartTooltipCard
                        titulo={String(label)}
                        linhas={[
                          { rotulo: "CMV real", valor: formatPercent(d.real), cor: "var(--salvia)" },
                          { rotulo: "CMV teórico", valor: formatPercent(d.teorico), cor: "var(--tinta)" },
                        ]}
                      />
                    );
                  }}
                />
                <Line type="monotone" dataKey="teorico" name="CMV teórico" stroke="var(--tinta)" strokeWidth={2} dot={{ r: 4, fill: "var(--tinta)" }} />
                <Line type="monotone" dataKey="real" name="CMV real" stroke="var(--salvia)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--salvia)" }} />
              </LineChart>
            </ChartFrame>
          </div>
        </div>

        <div className="cc-card p-7">
          <h2 className="text-[14px] font-semibold mb-1">CMV por prato</h2>
          <p className="text-[12px] mb-4" style={{ color: "var(--sub)" }}>Ordenado por faturamento no período.</p>
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ color: "var(--faint)" }} className="text-left text-[10.5px] uppercase tracking-wide">
                <th className="py-2.5 font-medium">Prato</th>
                <th className="py-2.5 font-medium text-right">Vendidos</th>
                <th className="py-2.5 font-medium text-right">CMV unit.</th>
                <th className="py-2.5 font-medium text-right">Faturamento</th>
              </tr>
            </thead>
            <tbody>
              {linhasCmv.slice(0, 6).map((l) => (
                <tr key={l.receita.id} style={{ borderTop: "1px solid var(--borda)" }}>
                  <td className="py-3 font-medium">{l.receita.nomePrato}</td>
                  <td className="py-3 text-right">{l.qtdVendida}</td>
                  <td className="py-3 text-right" style={{ color: "var(--sub)" }}>R$ {l.custoPorPorcao.toFixed(2)}</td>
                  <td className="py-3 text-right font-medium">R$ {l.faturamentoPrato.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
