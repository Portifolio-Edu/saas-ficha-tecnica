"use client";

import { useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Cell, LabelList, ReferenceLine, Tooltip, ResponsiveContainer } from "recharts";
import { formatBRL, formatPercentEixo } from "@/components/charts/format";
import type { VisaoGeralData } from "./types";

export function Direcao2Atelier({ data, tema }: { data: VisaoGeralData; tema: "light" | "dark" }) {
  const [pratoFocado, setPratoFocado] = useState<string | null>(null);

  const isDark = tema === "dark";

  // Paleta Atelier Gastronômico / Caderno de Mise en Place
  const colors = {
    bg: isDark ? "#121110" : "#F7F5EE",
    painel: isDark ? "#1A1816" : "#FFFFFF",
    borda: isDark ? "#2A2622" : "#E8E2D5",
    bordaFina: isDark ? "#23201C" : "#F0ECE2",
    texto: isDark ? "#F2EDE4" : "#1C1815",
    sub: isDark ? "#9E9589" : "#6E6559",
    faint: isDark ? "#5C564D" : "#A89F91",
    oliva: isDark ? "#8CAE88" : "#364B34",
    olivaSoft: isDark ? "#1C281B" : "#EBF0EA",
    terracota: isDark ? "#E07A5F" : "#9B381E",
    terracotaSoft: isDark ? "#331812" : "#FDF0EC",
    latao: isDark ? "#D4AF37" : "#A67C1E",
  };

  return (
    <div
      className="p-6 md:p-10 transition-colors duration-200"
      style={{
        backgroundColor: colors.bg,
        color: colors.texto,
        boxShadow: isDark ? "0 0 0 1px #221F1B" : "0 0 0 1px #E5DFD1, 0 12px 36px rgba(45, 35, 20, 0.04)",
        borderRadius: "4px",
      }}
    >
      {/* Cabeçalho Editorial com Tom de Manual Culinário */}
      <div className="border-b pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4" style={{ borderColor: colors.borda }}>
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase font-semibold mb-1" style={{ color: colors.latao }}>
            Caderno Operacional & Gestão
          </div>
          <h2 className="text-[26px] font-serif font-normal tracking-tight text-[var(--text)]">
            Equilíbrio de Cozinha & Margem
          </h2>
          <p className="text-[13px] mt-1 max-w-xl leading-relaxed" style={{ color: colors.sub }}>
            Parâmetros apurados de rendimento, custo médio de mercadoria e perdas registradas na bancada.
          </p>
        </div>
        <div
          className="px-4 py-2 text-right rounded-sm border"
          style={{
            backgroundColor: colors.painel,
            borderColor: colors.borda,
          }}
        >
          <div className="text-[10px] tracking-wider uppercase font-semibold" style={{ color: colors.faint }}>
            Margem Alvo da Casa
          </div>
          <div className="text-[22px] font-serif font-semibold" style={{ color: colors.oliva }}>
            {(data.margemAlvoCliente * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Grade de Indicadores de Bancada */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {/* KPI 1: CMV */}
        <div
          className="p-6 rounded-sm border transition-transform duration-200 hover:-translate-y-0.5"
          style={{
            backgroundColor: colors.painel,
            borderColor: colors.borda,
          }}
        >
          <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: colors.sub }}>
            CMV Médio Geral
          </div>
          <div className="text-[34px] font-serif my-2 font-normal leading-none" style={{ color: colors.texto }}>
            {data.cmvMedio !== null ? `${data.cmvMedio.toFixed(1)}%` : "—"}
          </div>
          <div className="text-[12px] italic" style={{ color: colors.faint }}>
            {data.comPreco.length} receitas precificadas no cardápio
          </div>
        </div>

        {/* KPI 2: Margem Atual */}
        <div
          className="p-6 rounded-sm border transition-transform duration-200 hover:-translate-y-0.5"
          style={{
            backgroundColor: colors.painel,
            borderColor: colors.borda,
          }}
        >
          <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: colors.sub }}>
            Margem Bruta Média
          </div>
          <div className="text-[34px] font-serif my-2 font-normal leading-none" style={{ color: colors.oliva }}>
            {data.margemMedia !== null ? `${data.margemMedia.toFixed(1)}%` : "—"}
          </div>
          <div className="text-[12px] italic" style={{ color: colors.oliva }}>
            ✓ Acima da meta estipulada
          </div>
        </div>

        {/* KPI 3: Desvio */}
        <div
          className="p-6 rounded-sm border transition-transform duration-200 hover:-translate-y-0.5"
          style={{
            backgroundColor: colors.painel,
            borderColor: data.abaixoDoAlvo > 0 ? colors.terracota : colors.borda,
          }}
        >
          <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: colors.sub }}>
            Pratos com Margem Curta
          </div>
          <div
            className="text-[34px] font-serif my-2 font-normal leading-none"
            style={{ color: data.abaixoDoAlvo > 0 ? colors.terracota : colors.texto }}
          >
            {data.abaixoDoAlvo}
          </div>
          <div className="text-[12px] italic" style={{ color: colors.faint }}>
            Necessitam reajuste ou engenharia
          </div>
        </div>

        {/* KPI 4: Perdas */}
        <div
          className="p-6 rounded-sm border transition-transform duration-200 hover:-translate-y-0.5"
          style={{
            backgroundColor: colors.painel,
            borderColor: data.perdaTotalReais > 0 ? colors.terracota : colors.borda,
          }}
        >
          <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: colors.sub }}>
            Perda em {data.nomeMes}
          </div>
          <div
            className="text-[34px] font-serif my-2 font-normal leading-none"
            style={{ color: data.perdaTotalReais > 0 ? colors.terracota : colors.texto }}
          >
            {formatBRL(data.perdaTotalReais)}
          </div>
          <div className="text-[12px] italic" style={{ color: colors.faint }}>
            {data.perdasDoMes.length} ocorrências no período
          </div>
        </div>
      </div>

      {/* Engenharia de Cardápio Editorial */}
      <div
        className="p-7 rounded-sm border mb-10"
        style={{
          backgroundColor: colors.painel,
          borderColor: colors.borda,
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-4 mb-6 border-b" style={{ borderColor: colors.bordaFina }}>
          <div>
            <h3 className="text-[18px] font-serif font-normal">Matriz de Engenharia de Cardápio</h3>
            <p className="text-[12.5px] mt-0.5" style={{ color: colors.sub }}>
              Dispersão entre volume de saída de serviço e margem de contribuição.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[12px] italic" style={{ color: colors.sub }}>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: colors.oliva }} />
              Margem no alvo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: colors.terracota }} />
              Abaixo do alvo
            </span>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
              <XAxis
                type="number"
                dataKey="qtdVendida"
                domain={[0, data.xMax]}
                stroke={colors.borda}
                tick={{ fill: colors.sub, fontSize: 11, fontFamily: "serif" }}
                tickLine={false}
              />
              <YAxis
                type="number"
                dataKey="margemPct"
                domain={[data.yMin, data.yMax]}
                tickFormatter={formatPercentEixo}
                stroke={colors.borda}
                tick={{ fill: colors.sub, fontSize: 11, fontFamily: "serif" }}
                tickLine={false}
              />
              <ZAxis type="number" dataKey="qtdVendida" range={[150, 400]} />
              <ReferenceLine
                y={data.margemAlvoMedia}
                stroke={colors.latao}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                label={{
                  value: `Meta ${data.margemAlvoCliente * 100}%`,
                  fill: colors.latao,
                  fontSize: 11,
                  fontFamily: "serif",
                  position: "insideTopLeft",
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload;
                  return (
                    <div
                      className="p-4 text-[12px] rounded-sm shadow-xl border font-sans"
                      style={{
                        backgroundColor: colors.painel,
                        borderColor: colors.borda,
                        color: colors.texto,
                      }}
                    >
                      <div className="font-serif font-bold text-[14px] border-b pb-1 mb-2" style={{ borderColor: colors.bordaFina }}>
                        {item.receita.nome}
                      </div>
                      <div className="space-y-1 text-[12px]">
                        <div>Saídas: <strong>{item.qtdVendida} porções</strong></div>
                        <div>Venda: <strong>{formatBRL(item.precoVenda ?? 0)}</strong></div>
                        <div>Custo da Porção: <strong>{formatBRL(item.custoPorPorcao)}</strong></div>
                        <div style={{ color: item.abaixoDoAlvo ? colors.terracota : colors.oliva }}>
                          Margem Apurada: <strong>{item.margemPct?.toFixed(1)}%</strong>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Scatter data={data.comPreco}>
                {data.comPreco.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.abaixoDoAlvo ? colors.terracota : colors.oliva}
                    opacity={pratoFocado && pratoFocado !== entry.receita.id ? 0.3 : 0.9}
                    stroke={colors.painel}
                    strokeWidth={1.5}
                    onMouseEnter={() => setPratoFocado(entry.receita.id)}
                    onMouseLeave={() => setPratoFocado(null)}
                  />
                ))}
                <LabelList
                  dataKey="receita.nome"
                  position="top"
                  offset={8}
                  style={{ fill: colors.texto, fontSize: 11, fontFamily: "serif" }}
                />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela de Perdas estilo Menu de Degustação */}
      <div
        className="p-7 rounded-sm border"
        style={{
          backgroundColor: colors.painel,
          borderColor: colors.borda,
        }}
      >
        <div className="pb-4 mb-4 border-b flex items-center justify-between" style={{ borderColor: colors.bordaFina }}>
          <h3 className="text-[17px] font-serif font-normal">Registro Recente de Ocorrências em Cozinha</h3>
          <span className="text-[11px] tracking-wider uppercase font-semibold" style={{ color: colors.sub }}>
            Últimos apontamentos
          </span>
        </div>
        <div className="space-y-3">
          {data.perdasRecentes.length === 0 ? (
            <div className="py-6 text-center text-[13px] italic" style={{ color: colors.sub }}>
              Nenhuma perda registrada no período selecionado.
            </div>
          ) : (
            data.perdasRecentes.map((p) => {
              const rec = data.comPreco.find((c) => c.receita.id === p.receitaId)?.receita;
              return (
                <div
                  key={p.id}
                  className="flex items-baseline justify-between gap-4 py-2 border-b transition-colors hover:bg-black/5 px-2"
                  style={{ borderColor: colors.bordaFina }}
                >
                  <div className="flex items-baseline gap-3 min-w-0">
                    <span className="text-[11px] font-serif shrink-0" style={{ color: colors.faint }}>
                      {p.criadoEm.slice(0, 10)}
                    </span>
                    <span className="font-serif text-[14px] font-medium truncate">
                      {rec?.nomePrato ?? p.receitaId}
                    </span>
                    <span className="text-[12px] italic shrink-0" style={{ color: colors.sub }}>
                      ({p.quantidade} {rec?.unidadeRendimento ?? "un"})
                    </span>
                  </div>
                  <div className="flex-1 mx-2 border-b border-dotted" style={{ borderColor: colors.borda }} />
                  <div className="font-serif text-[14px] font-semibold shrink-0" style={{ color: colors.terracota }}>
                    - {formatBRL(54.2)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
