"use client";

import { useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Cell, LabelList, ReferenceLine, Tooltip, ResponsiveContainer } from "recharts";
import { formatBRL, formatPercentEixo } from "@/components/charts/format";
import type { VisaoGeralData } from "./types";

export function Direcao1Precisao({ data, tema }: { data: VisaoGeralData; tema: "light" | "dark" }) {
  const [pratoFocado, setPratoFocado] = useState<string | null>(null);

  const isDark = tema === "dark";

  // Paleta de Precisão Cirúrgica
  const colors = {
    bg: isDark ? "#0A0C0E" : "#F4F5F7",
    chassi: isDark ? "#12151A" : "#FFFFFF",
    borda: isDark ? "#222832" : "#DDE2E8",
    bordaForte: isDark ? "#353F4E" : "#BAC3CE",
    texto: isDark ? "#E6EDF5" : "#0D1117",
    sub: isDark ? "#7E8B9B" : "#57606A",
    faint: isDark ? "#485363" : "#8C959F",
    cobre: isDark ? "#FF8843" : "#D95B14",
    verde: isDark ? "#00D06C" : "#0A8544",
    sangria: isDark ? "#FF3B30" : "#CF222E",
  };

  return (
    <div
      className="p-6 md:p-8 rounded-none transition-colors duration-150 font-sans"
      style={{
        backgroundColor: colors.bg,
        color: colors.texto,
        border: `1px solid ${colors.borda}`,
      }}
    >
      {/* HUD de Calibração Topo */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 text-[11px] font-mono tracking-wider uppercase border-b"
        style={{ borderColor: colors.borda }}
      >
        <div className="flex items-center gap-3">
          <span
            className="px-2 py-0.5 font-bold"
            style={{ backgroundColor: colors.cobre, color: "#FFFFFF" }}
          >
            SYS.CALIBRATION // 01
          </span>
          <span style={{ color: colors.sub }}>
            ALVO DE MARGEM OPERACIONAL:{" "}
            <strong style={{ color: colors.texto }}>{(data.margemAlvoCliente * 100).toFixed(1)}%</strong>
          </span>
        </div>
        <div style={{ color: colors.faint }}>
          {data.fechamentoRecente
            ? `BASE VENDAS: [${data.fechamentoRecente.periodoInicio}] -> [${data.fechamentoRecente.periodoFim}]`
            : "MODO: ESTIMATIVA BASE / CADASTRO DE RECEITAS"}
        </div>
      </div>

      {/* Grid de KPIs - Estilo Módulos de Bancada Inox */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px mb-8" style={{ backgroundColor: colors.borda }}>
        {/* KPI 1 */}
        <div
          className="p-5 relative transition-all duration-100 hover:bg-black/5"
          style={{ backgroundColor: colors.chassi }}
        >
          <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-[var(--sub)] mb-1" style={{ color: colors.faint }}>
            <span>[M-01] CMV MEDIO</span>
            <span>RATIO</span>
          </div>
          <div className="text-[34px] font-bold font-mono tracking-tight leading-none my-2" style={{ color: colors.texto }}>
            {data.cmvMedio !== null ? `${data.cmvMedio.toFixed(1)}%` : "--"}
          </div>
          <div className="text-[11px] font-mono" style={{ color: colors.sub }}>
            {data.comPreco.length === 0 ? "CADASTRO PENDENTE" : `${data.comPreco.length} PRATOS COM PREÇO`}
          </div>
        </div>

        {/* KPI 2 */}
        <div
          className="p-5 relative transition-all duration-100 hover:bg-black/5"
          style={{ backgroundColor: colors.chassi }}
        >
          <div className="flex items-center justify-between text-[10px] font-mono tracking-widest mb-1" style={{ color: colors.faint }}>
            <span>[M-02] MARGEM REAL</span>
            <span style={{ color: colors.verde }}>+ALVO</span>
          </div>
          <div className="text-[34px] font-bold font-mono tracking-tight leading-none my-2" style={{ color: colors.verde }}>
            {data.margemMedia !== null ? `${data.margemMedia.toFixed(1)}%` : "--"}
          </div>
          <div className="text-[11px] font-mono" style={{ color: colors.sub }}>
            DELTA: +{((data.margemMedia ?? 0) - data.margemAlvoCliente * 100).toFixed(1)}% vs. META
          </div>
        </div>

        {/* KPI 3 */}
        <div
          className="p-5 relative transition-all duration-100 hover:bg-black/5"
          style={{
            backgroundColor: colors.chassi,
            outline: data.abaixoDoAlvo > 0 ? `1px solid ${colors.cobre}` : "none",
            outlineOffset: -1,
          }}
        >
          <div className="flex items-center justify-between text-[10px] font-mono tracking-widest mb-1" style={{ color: colors.faint }}>
            <span>[M-03] DESVIO MARGEM</span>
            {data.abaixoDoAlvo > 0 && <span style={{ color: colors.cobre }}>ATENÇÃO</span>}
          </div>
          <div
            className="text-[34px] font-bold font-mono tracking-tight leading-none my-2"
            style={{ color: data.abaixoDoAlvo > 0 ? colors.cobre : colors.texto }}
          >
            {data.abaixoDoAlvo}
          </div>
          <div className="text-[11px] font-mono" style={{ color: colors.sub }}>
            DE {data.comPreco.length} PRATOS ANALISADOS
          </div>
        </div>

        {/* KPI 4 */}
        <div
          className="p-5 relative transition-all duration-100 hover:bg-black/5"
          style={{
            backgroundColor: colors.chassi,
            outline: data.perdaTotalReais > 0 ? `1px solid ${colors.sangria}` : "none",
            outlineOffset: -1,
          }}
        >
          <div className="flex items-center justify-between text-[10px] font-mono tracking-widest mb-1" style={{ color: colors.faint }}>
            <span>[M-04] PERDA DE BANCADA</span>
            {data.perdaTotalReais > 0 && <span style={{ color: colors.sangria }}>CRÍTICO</span>}
          </div>
          <div
            className="text-[34px] font-bold font-mono tracking-tight leading-none my-2"
            style={{ color: data.perdaTotalReais > 0 ? colors.sangria : colors.texto }}
          >
            {formatBRL(data.perdaTotalReais)}
          </div>
          <div className="text-[11px] font-mono" style={{ color: colors.sub }}>
            {data.perdasDoMes.length} LOTES REGISTRADOS EM {data.nomeMes.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Engenharia de Cardápio - Grid Técnico */}
      <div
        className="p-6 mb-8 border"
        style={{
          backgroundColor: colors.chassi,
          borderColor: colors.borda,
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b" style={{ borderColor: colors.borda }}>
          <div>
            <div className="text-[13px] font-mono font-bold tracking-tight uppercase">
              PLANO DE COORDENADAS // ENGENHARIA DE CARDÁPIO
            </div>
            <div className="text-[11px] font-mono mt-0.5" style={{ color: colors.sub }}>
              EIXO Y: MARGEM DE CONTRIBUIÇÃO (%) · EIXO X: VOLUME DE SAÍDA (UNID)
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10.5px] font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 inline-block rounded-none" style={{ backgroundColor: colors.verde }} />
              MARGEM CALIBRADA (≥ {(data.margemAlvoCliente * 100).toFixed(0)}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 inline-block rounded-none" style={{ backgroundColor: colors.sangria }} />
              ABAIXO DO ALVO
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
                stroke={colors.bordaForte}
                tick={{ fill: colors.sub, fontSize: 10, fontFamily: "monospace" }}
                tickLine={{ stroke: colors.borda }}
              />
              <YAxis
                type="number"
                dataKey="margemPct"
                domain={[data.yMin, data.yMax]}
                tickFormatter={formatPercentEixo}
                stroke={colors.bordaForte}
                tick={{ fill: colors.sub, fontSize: 10, fontFamily: "monospace" }}
                tickLine={{ stroke: colors.borda }}
              />
              <ZAxis type="number" dataKey="qtdVendida" range={[120, 420]} />
              <ReferenceLine
                y={data.margemAlvoMedia}
                stroke={colors.cobre}
                strokeDasharray="4 4"
                label={{
                  value: `ALVO ${(data.margemAlvoCliente * 100).toFixed(0)}%`,
                  fill: colors.cobre,
                  fontSize: 10,
                  fontFamily: "monospace",
                  position: "insideTopRight",
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload;
                  return (
                    <div
                      className="p-3 font-mono text-[11px] shadow-2xl border"
                      style={{
                        backgroundColor: colors.chassi,
                        borderColor: colors.cobre,
                        color: colors.texto,
                      }}
                    >
                      <div className="font-bold text-[12px] border-b pb-1 mb-2" style={{ borderColor: colors.borda }}>
                        {item.receita.nome}
                      </div>
                      <div className="space-y-1">
                        <div>VENDAS: <strong>{item.qtdVendida} un</strong></div>
                        <div>PREÇO: <strong>{formatBRL(item.precoVenda ?? 0)}</strong></div>
                        <div>CUSTO: <strong>{formatBRL(item.custoPorPorcao)}</strong></div>
                        <div style={{ color: item.abaixoDoAlvo ? colors.sangria : colors.verde }}>
                          MARGEM: <strong>{item.margemPct?.toFixed(1)}%</strong>
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
                    fill={entry.abaixoDoAlvo ? colors.sangria : colors.verde}
                    opacity={pratoFocado && pratoFocado !== entry.receita.id ? 0.35 : 0.9}
                    stroke={colors.texto}
                    strokeWidth={pratoFocado === entry.receita.id ? 2 : 0}
                    onMouseEnter={() => setPratoFocado(entry.receita.id)}
                    onMouseLeave={() => setPratoFocado(null)}
                  />
                ))}
                <LabelList
                  dataKey="receita.nome"
                  position="top"
                  offset={7}
                  style={{ fill: colors.texto, fontSize: 10, fontFamily: "monospace", fontWeight: 600 }}
                />
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela de Registro Rápido de Perdas */}
      <div
        className="p-6 border"
        style={{
          backgroundColor: colors.chassi,
          borderColor: colors.borda,
        }}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b" style={{ borderColor: colors.borda }}>
          <div className="text-[12px] font-mono font-bold uppercase tracking-wider">
            LOG DE INCIDENTES & PERDAS // RECENTES
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5" style={{ backgroundColor: colors.borda, color: colors.sub }}>
            ULTIMAS ENTRADAS
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[12px]">
            <thead>
              <tr className="text-[10px] text-[var(--sub)] border-b" style={{ borderColor: colors.borda, color: colors.faint }}>
                <th className="py-2 px-3">TIMESTAMP</th>
                <th className="py-2 px-3">ITEM / RECEITA</th>
                <th className="py-2 px-3">QUANTIDADE</th>
                <th className="py-2 px-3 text-right">IMPACTO ESTIMADO</th>
                <th className="py-2 px-3 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {data.perdasRecentes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[var(--sub)]" style={{ color: colors.sub }}>
                    NENHUM INCIDENTE DE PERDA REGISTRADO NO PERÍODO.
                  </td>
                </tr>
              ) : (
                data.perdasRecentes.map((p) => {
                  const rec = data.comPreco.find((c) => c.receita.id === p.receitaId)?.receita;
                  return (
                    <tr
                      key={p.id}
                      className="border-b transition-colors hover:bg-black/5"
                      style={{ borderColor: colors.borda }}
                    >
                      <td className="py-2.5 px-3 text-[11px]" style={{ color: colors.faint }}>
                        {p.criadoEm.slice(0, 10)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">{rec?.nomePrato ?? p.receitaId}</td>
                      <td className="py-2.5 px-3">
                        {p.quantidade} {rec?.unidadeRendimento ?? "un"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold" style={{ color: colors.sangria }}>
                        {formatBRL(54.2)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className="px-2 py-0.5 text-[9.5px] uppercase font-bold tracking-widest"
                          style={{
                            backgroundColor: isDark ? "#3A1717" : "#FFEBEB",
                            color: colors.sangria,
                          }}
                        >
                          BAIXA
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
