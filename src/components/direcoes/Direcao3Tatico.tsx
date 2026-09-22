"use client";

import { useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Cell, LabelList, ReferenceLine, Tooltip, ResponsiveContainer } from "recharts";
import { formatBRL, formatPercentEixo } from "@/components/charts/format";
import type { VisaoGeralData } from "./types";

export function Direcao3Tatico({ data, tema }: { data: VisaoGeralData; tema: "light" | "dark" }) {
  const [pratoFocado, setPratoFocado] = useState<string | null>(null);

  const isDark = tema === "dark";

  // Paleta Comando Tático / KDS High-Contrast HUD
  const colors = {
    bg: isDark ? "#06080B" : "#EDF1F5",
    painel: isDark ? "#0E131A" : "#FFFFFF",
    borda: isDark ? "#1C2430" : "#D0D9E3",
    bordaGlow: isDark ? "#00E5FF" : "#0284C7",
    texto: isDark ? "#FFFFFF" : "#090D14",
    sub: isDark ? "#8292A6" : "#4B5868",
    faint: isDark ? "#435266" : "#8A99AC",
    cyan: isDark ? "#00E5FF" : "#0284C7",
    ambar: isDark ? "#FFB300" : "#D97706",
    verde: isDark ? "#00E676" : "#059669",
    vermelho: isDark ? "#FF1744" : "#DC2626",
  };

  return (
    <div
      className="p-6 md:p-8 transition-colors duration-150 font-sans"
      style={{
        backgroundColor: colors.bg,
        color: colors.texto,
        border: `2px solid ${colors.borda}`,
      }}
    >
      {/* Barra de Status do Cockpit / KDS HUD */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 p-3.5 mb-6 border"
        style={{
          backgroundColor: colors.painel,
          borderColor: colors.borda,
        }}
      >
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: colors.verde }}
            />
            <span
              className="relative inline-flex rounded-full h-3 w-3"
              style={{ backgroundColor: colors.verde }}
            />
          </span>
          <span className="text-[13px] font-black tracking-wider uppercase">
            ESTAÇÃO CENTRAL // MONITOR DE EXPEDIÇÃO & MARGEM
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono font-bold">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded" style={{ backgroundColor: isDark ? "#122638" : "#E0F2FE", color: colors.cyan }}>
            <span>ALVO:</span>
            <span>{(data.margemAlvoCliente * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded" style={{ backgroundColor: isDark ? "#281717" : "#FEE2E2", color: colors.vermelho }}>
            <span>DESVIOS:</span>
            <span>{data.abaixoDoAlvo} ITENS</span>
          </div>
        </div>
      </div>

      {/* Grid Tático de Alta Visibilidade Angular */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* KPI 1 */}
        <div
          className="p-5 border relative overflow-hidden transition-all duration-75 active:scale-98"
          style={{
            backgroundColor: colors.painel,
            borderColor: colors.borda,
            borderTop: `4px solid ${colors.cyan}`,
          }}
        >
          <div className="flex items-center justify-between text-[11px] font-mono font-bold tracking-wider" style={{ color: colors.sub }}>
            <span>CMV MÉDIO</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: isDark ? "#172333" : "#E2E8F0" }}>GLOBAL</span>
          </div>
          <div className="text-[40px] font-black tracking-tighter leading-none my-2" style={{ color: colors.texto }}>
            {data.cmvMedio !== null ? `${data.cmvMedio.toFixed(1)}%` : "—"}
          </div>
          {/* Mini Barômetro de Tolerância */}
          <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (data.cmvMedio ?? 0) * 2)}%`,
                backgroundColor: (data.cmvMedio ?? 0) > 35 ? colors.vermelho : colors.cyan,
              }}
            />
          </div>
          <div className="text-[11px] font-mono mt-1.5 flex justify-between" style={{ color: colors.faint }}>
            <span>TOLERÂNCIA: 35%</span>
            <span>OK</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div
          className="p-5 border relative overflow-hidden transition-all duration-75 active:scale-98"
          style={{
            backgroundColor: colors.painel,
            borderColor: colors.borda,
            borderTop: `4px solid ${colors.verde}`,
          }}
        >
          <div className="flex items-center justify-between text-[11px] font-mono font-bold tracking-wider" style={{ color: colors.sub }}>
            <span>MARGEM ATUAL</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-black" style={{ backgroundColor: isDark ? "#0A291A" : "#DCFCE7", color: colors.verde }}>EM META</span>
          </div>
          <div className="text-[40px] font-black tracking-tighter leading-none my-2" style={{ color: colors.verde }}>
            {data.margemMedia !== null ? `${data.margemMedia.toFixed(1)}%` : "—"}
          </div>
          <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${Math.min(100, data.margemMedia ?? 0)}%`,
                backgroundColor: colors.verde,
              }}
            />
          </div>
          <div className="text-[11px] font-mono mt-1.5 flex justify-between" style={{ color: colors.faint }}>
            <span>META: {(data.margemAlvoCliente * 100).toFixed(0)}%</span>
            <span style={{ color: colors.verde }}>+ALCANÇADA</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div
          className="p-5 border relative overflow-hidden transition-all duration-75 active:scale-98"
          style={{
            backgroundColor: colors.painel,
            borderColor: data.abaixoDoAlvo > 0 ? colors.ambar : colors.borda,
            borderTop: `4px solid ${colors.ambar}`,
          }}
        >
          <div className="flex items-center justify-between text-[11px] font-mono font-bold tracking-wider" style={{ color: colors.sub }}>
            <span>ITENS FORA DA META</span>
            {data.abaixoDoAlvo > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-black" style={{ backgroundColor: isDark ? "#38230A" : "#FEF3C7", color: colors.ambar }}>
                AVISO
              </span>
            )}
          </div>
          <div className="text-[40px] font-black tracking-tighter leading-none my-2" style={{ color: colors.ambar }}>
            {data.abaixoDoAlvo}
          </div>
          <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (data.abaixoDoAlvo / Math.max(1, data.comPreco.length)) * 100)}%`,
                backgroundColor: colors.ambar,
              }}
            />
          </div>
          <div className="text-[11px] font-mono mt-1.5 flex justify-between" style={{ color: colors.faint }}>
            <span>BASE: {data.comPreco.length} RECEITAS</span>
            <span style={{ color: colors.ambar }}>REVISAR</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div
          className="p-5 border relative overflow-hidden transition-all duration-75 active:scale-98"
          style={{
            backgroundColor: colors.painel,
            borderColor: data.perdaTotalReais > 0 ? colors.vermelho : colors.borda,
            borderTop: `4px solid ${colors.vermelho}`,
          }}
        >
          <div className="flex items-center justify-between text-[11px] font-mono font-bold tracking-wider" style={{ color: colors.sub }}>
            <span>PERDAS EM {data.nomeMes.toUpperCase()}</span>
            {data.perdaTotalReais > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-black" style={{ backgroundColor: isDark ? "#3D0C15" : "#FEE2E2", color: colors.vermelho }}>
                CORTE
              </span>
            )}
          </div>
          <div className="text-[34px] font-black tracking-tighter leading-none my-2" style={{ color: colors.vermelho }}>
            {formatBRL(data.perdaTotalReais)}
          </div>
          <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden mt-3">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${Math.min(100, data.perdasDoMes.length * 15)}%`,
                backgroundColor: colors.vermelho,
              }}
            />
          </div>
          <div className="text-[11px] font-mono mt-1.5 flex justify-between" style={{ color: colors.faint }}>
            <span>{data.perdasDoMes.length} LOTES DESCARTADOS</span>
            <span style={{ color: colors.vermelho }}>AÇÃO IMEDIATA</span>
          </div>
        </div>
      </div>

      {/* Radar de Engenharia de Cardápio com Grade Tática */}
      <div
        className="p-6 border mb-8"
        style={{
          backgroundColor: colors.painel,
          borderColor: colors.borda,
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b" style={{ borderColor: colors.borda }}>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colors.cyan }} />
            <span className="text-[13px] font-black tracking-wider uppercase">
              RADAR DE MARGEM & SAÍDAS // MATRIZ QUADRANTE
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: colors.verde }} />
              MARGEM POSITIVA
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: colors.vermelho }} />
              MARGEM CRÍTICA
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
                tick={{ fill: colors.sub, fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }}
                tickLine={{ stroke: colors.borda }}
              />
              <YAxis
                type="number"
                dataKey="margemPct"
                domain={[data.yMin, data.yMax]}
                tickFormatter={formatPercentEixo}
                stroke={colors.borda}
                tick={{ fill: colors.sub, fontSize: 10, fontFamily: "monospace", fontWeight: "bold" }}
                tickLine={{ stroke: colors.borda }}
              />
              <ZAxis type="number" dataKey="qtdVendida" range={[180, 500]} />
              <ReferenceLine
                y={data.margemAlvoMedia}
                stroke={colors.cyan}
                strokeWidth={2}
                label={{
                  value: `CORTE MARGEM ${(data.margemAlvoCliente * 100).toFixed(0)}%`,
                  fill: colors.cyan,
                  fontSize: 10,
                  fontFamily: "monospace",
                  fontWeight: "bold",
                  position: "insideTopRight",
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload;
                  return (
                    <div
                      className="p-3.5 text-[11px] font-mono shadow-2xl border-2"
                      style={{
                        backgroundColor: colors.bg,
                        borderColor: colors.cyan,
                        color: colors.texto,
                      }}
                    >
                      <div className="font-black text-[13px] border-b pb-1 mb-2 tracking-wide" style={{ borderColor: colors.borda }}>
                        {item.receita.nome.toUpperCase()}
                      </div>
                      <div className="space-y-1 font-bold">
                        <div>VOLUME: <span style={{ color: colors.cyan }}>{item.qtdVendida} UN</span></div>
                        <div>PREÇO: {formatBRL(item.precoVenda ?? 0)}</div>
                        <div>CUSTO: {formatBRL(item.custoPorPorcao)}</div>
                        <div style={{ color: item.abaixoDoAlvo ? colors.vermelho : colors.verde }}>
                          MARGEM: {item.margemPct?.toFixed(1)}% {item.abaixoDoAlvo ? "[REVISAR]" : "[OK]"}
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
                    fill={entry.abaixoDoAlvo ? colors.vermelho : colors.verde}
                    opacity={pratoFocado && pratoFocado !== entry.receita.id ? 0.3 : 1}
                    stroke={colors.texto}
                    strokeWidth={pratoFocado === entry.receita.id ? 3 : 1}
                    onMouseEnter={() => setPratoFocado(entry.receita.id)}
                    onMouseLeave={() => setPratoFocado(null)}
                  />
                ))}
                <LabelList
                  dataKey="receita.nome"
                  position="top"
                  offset={9}
                  style={{ fill: colors.texto, fontSize: 10, fontFamily: "monospace", fontWeight: 800 }}
                />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Registro de Perdas em Formato de Fila Tática */}
      <div
        className="p-6 border"
        style={{
          backgroundColor: colors.painel,
          borderColor: colors.borda,
        }}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b" style={{ borderColor: colors.borda }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.vermelho }} />
            <span className="text-[12px] font-black tracking-wider uppercase">
              FILA DE INCIDENTES DE COZINHA // DESCARTES
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded" style={{ backgroundColor: isDark ? "#241014" : "#FEE2E2", color: colors.vermelho }}>
            {data.perdasRecentes.length} APONTAMENTOS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.perdasRecentes.length === 0 ? (
            <div className="col-span-full py-6 text-center font-mono text-[12px]" style={{ color: colors.sub }}>
              SISTEMA LIMPO // ZERO PERDAS NO RADAR
            </div>
          ) : (
            data.perdasRecentes.map((p) => {
              const rec = data.comPreco.find((c) => c.receita.id === p.receitaId)?.receita;
              return (
                <div
                  key={p.id}
                  className="p-3.5 border flex items-start justify-between gap-2 transition-all hover:border-l-4"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.borda,
                  }}
                >
                  <div>
                    <div className="text-[10px] font-mono" style={{ color: colors.faint }}>
                      {p.criadoEm.slice(0, 10)}
                    </div>
                    <div className="font-bold text-[13px] mt-0.5 truncate max-w-[170px]">
                      {rec?.nomePrato ?? p.receitaId}
                    </div>
                    <div className="text-[11px] font-mono mt-1" style={{ color: colors.sub }}>
                      {p.quantidade} {rec?.unidadeRendimento ?? "un"} descartados
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[13px] font-black font-mono" style={{ color: colors.vermelho }}>
                      - {formatBRL(54.2)}
                    </span>
                    <div className="mt-1">
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase" style={{ backgroundColor: isDark ? "#380D14" : "#FEE2E2", color: colors.vermelho }}>
                        BAIXADO
                      </span>
                    </div>
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
