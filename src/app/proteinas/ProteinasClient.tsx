"use client";

import { Fragment, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ficha/Card";
import { Kpi } from "@/components/ficha/Kpi";
import { nums } from "@/components/ficha/tema";
import { NovoProcessamentoForm } from "@/components/proteinas/NovoProcessamentoForm";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { ChartTooltipCard } from "@/components/charts/ChartTooltipCard";
import { CHART_ANIMATION_DURATION, CHART_ANIMATION_EASING, CHART_MARGIN, axisLineStyle, axisTickStyle, chartGridProps } from "@/components/charts/theme";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Processamento } from "@/lib/dominio/processamento";

function formatarData(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function ProteinasClient({ proteinas, processamentos }: { proteinas: Insumo[]; processamentos: Processamento[] }) {
  const [proteinaSelecionada, setProteinaSelecionada] = useState(proteinas[0]?.id ?? "");
  const [showNovoProcessamento, setShowNovoProcessamento] = useState(false);

  if (proteinas.length === 0) {
    return (
      <div className="max-w-5xl">
        <Card className="p-6 text-center">
          <p className="text-[13px]" style={{ color: "var(--sub)" }}>Nenhum insumo da categoria proteína cadastrado ainda. Cadastre um em Insumos primeiro.</p>
        </Card>
      </div>
    );
  }

  const insumo = proteinas.find((i) => i.id === proteinaSelecionada) ?? proteinas[0];
  const lotes = processamentos.filter((p) => p.insumoId === insumo.id);
  const fcObservadoMedio = lotes.length > 0 ? lotes.reduce((s, l) => s + l.fcObservado, 0) / lotes.length : null;
  const diferenca = fcObservadoMedio ? ((fcObservadoMedio - insumo.fatorCorrecao) / insumo.fatorCorrecao) * 100 : 0;

  return (
    <div className="max-w-5xl">
      <p className="text-[13px] mb-5" style={{ color: "var(--sub)" }}>
        Cada lote de proteína processada (peixe, gado, frango) entra aqui com peso bruto recebido, valor pago, peso limpo, quanto virou apara reaproveitável e quanto foi descarte puro. O FC observado é medido, não estimado, e a média dos lotes substitui o FC cadastrado no cálculo de CMV em todo o sistema sempre que existir histórico. Isso também é registro de auditoria: dá pra ver quem processou cada lote e comparar rendimento entre pessoas.
      </p>

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {proteinas.map((i) => (
          <button
            key={i.id}
            onClick={() => setProteinaSelecionada(i.id)}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: i.id === insumo.id ? "var(--text)" : "var(--panel)", color: i.id === insumo.id ? "#fff" : "var(--text)", border: `1px solid ${i.id === insumo.id ? "var(--text)" : "var(--border-strong)"}` }}
          >
            {i.nome}
          </button>
        ))}
        <button
          onClick={() => setShowNovoProcessamento(!showNovoProcessamento)}
          className="ml-auto text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
          style={{ background: showNovoProcessamento ? "var(--bg)" : "var(--accent)", color: showNovoProcessamento ? "var(--text)" : "#fff", border: `1px solid ${showNovoProcessamento ? "var(--border-strong)" : "var(--accent)"}` }}
        >
          {showNovoProcessamento ? "Fechar" : "+ Registrar lote"}
        </button>
      </div>

      {showNovoProcessamento && (
        <Card className="mb-5">
          <NovoProcessamentoForm
            proteinas={proteinas}
            insumoInicial={insumo.id}
            onSaved={(insumoId) => {
              setShowNovoProcessamento(false);
              setProteinaSelecionada(insumoId);
            }}
            onCancel={() => setShowNovoProcessamento(false)}
          />
        </Card>
      )}

      {lotes.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-[13px]" style={{ color: "var(--sub)" }}>
            Nenhum lote de {insumo.nome} registrado ainda. O FC usado no cálculo de CMV continua sendo o cadastrado ({insumo.fatorCorrecao.toFixed(2)}) até o primeiro lote entrar.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <Kpi label="FC cadastrado (referência)" value={insumo.fatorCorrecao.toFixed(2)} />
            <Kpi
              label="FC observado (média dos lotes)"
              value={fcObservadoMedio!.toFixed(3)}
              alerta={Math.abs(diferenca) > 2}
              sub={`${diferenca >= 0 ? "+" : ""}${diferenca.toFixed(1)}% vs. cadastrado`}
            />
            <Kpi label="Lotes registrados" value={lotes.length} sub="insumo usado no cálculo de CMV agora" />
          </div>

          <Card className="p-6 mb-5">
            <h2 className="text-[14px] font-semibold mb-1">FC observado por lote</h2>
            <p className="text-[12px] mb-4" style={{ color: "var(--sub)" }}>Linha tracejada é o FC cadastrado. Quanto mais alto acima dela, pior o rendimento real do lote.</p>
            <ChartFrame
              vazio={false}
              tituloVazio="Nenhum lote registrado ainda."
              dicaVazio="Registre um lote de processamento pra esse gráfico aparecer aqui."
            >
              <LineChart data={lotes.map((l) => ({ ...l, dataLabel: formatarData(l.processadoEm) }))} margin={CHART_MARGIN}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="dataLabel" tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} />
                <YAxis domain={["dataMin - 0.03", "dataMax + 0.03"]} tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} width={40} tickFormatter={(v: number) => v.toFixed(2)} />
                <ReferenceLine y={insumo.fatorCorrecao} stroke={"var(--border-strong)"} strokeDasharray="4 4" label={{ value: "FC cadastrado", position: "insideTopRight", fontSize: 10, fill: "var(--sub)" }} />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload || !payload.length) return null;
                    const p = payload[0].payload as Processamento & { dataLabel: string };
                    return (
                      <ChartTooltipCard
                        titulo={`${p.dataLabel} · ${p.responsavel}`}
                        linhas={[
                          { rotulo: "FC do lote", valor: p.fcObservado.toFixed(3) },
                          { rotulo: "Bruto → líquido", valor: `${p.pesoBrutoRecebido}kg → ${p.pesoLiquidoResultante}kg` },
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
          </Card>

          <Card>
            <div className="px-5 py-3.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
              <h2 className="text-[13px] font-semibold">Histórico de lotes (auditoria)</h2>
            </div>
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ color: "var(--faint)" }} className="text-left text-[10px] uppercase tracking-wide">
                  <th className="py-2.5 px-5 font-medium">Data</th>
                  <th className="py-2.5 px-2 font-medium">Responsável</th>
                  <th className="py-2.5 px-2 font-medium">Fornecedor</th>
                  <th className="py-2.5 px-2 font-medium text-right">Bruto</th>
                  <th className="py-2.5 px-2 font-medium text-right">Valor/kg</th>
                  <th className="py-2.5 px-2 font-medium text-right">Líquido</th>
                  <th className="py-2.5 px-2 font-medium text-right">Aparas reaproveitadas</th>
                  <th className="py-2.5 px-2 font-medium text-right">Descarte puro</th>
                  <th className="py-2.5 px-5 font-medium text-right">FC</th>
                </tr>
              </thead>
              <tbody>
                {lotes.map((l) => {
                  const descarteAlto = l.pesoDescartePuro / l.pesoBrutoRecebido > 0.08;
                  return (
                    <Fragment key={l.id}>
                      <tr style={{ borderTop: `1px solid ${"var(--border)"}` }}>
                        <td className="py-2 px-5">{formatarData(l.processadoEm)}</td>
                        <td className="py-2 px-2 font-medium">{l.responsavel}</td>
                        <td className="py-2 px-2" style={{ color: "var(--sub)" }}>{l.fornecedor ?? "—"}</td>
                        <td className="py-2 px-2 text-right" style={nums}>{l.pesoBrutoRecebido.toFixed(2)}kg</td>
                        <td className="py-2 px-2 text-right" style={nums}>R$ {l.valorPagoKg.toFixed(2)}</td>
                        <td className="py-2 px-2 text-right" style={nums}>{l.pesoLiquidoResultante.toFixed(2)}kg</td>
                        <td className="py-2 px-2 text-right" style={{ ...nums, color: "var(--sub)" }}>{l.pesoAparasReaproveitaveis.toFixed(2)}kg</td>
                        <td className="py-2 px-2 text-right" style={{ ...nums, color: descarteAlto ? "var(--danger)" : "var(--text)" }}>{l.pesoDescartePuro.toFixed(2)}kg</td>
                        <td className="py-2 px-5 text-right font-medium" style={nums}>{l.fcObservado.toFixed(3)}</td>
                      </tr>
                      {l.observacao && (
                        <tr key={`${l.id}-obs`}>
                          <td colSpan={9} className="pb-2 px-5 text-[11.5px]" style={{ color: "var(--sub)" }}>Obs: {l.observacao}</td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
