"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ficha/Card";
import { Badge } from "@/components/ficha/Badge";
import { nums } from "@/components/ficha/tema";
import { NovoLocalForm } from "@/components/seguranca/NovoLocalForm";
import { NovaTemperaturaForm } from "@/components/seguranca/NovaTemperaturaForm";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { ChartTooltipCard } from "@/components/charts/ChartTooltipCard";
import { CHART_ANIMATION_DURATION, CHART_ANIMATION_EASING, CHART_MARGIN, axisLineStyle, axisTickStyle, chartGridProps } from "@/components/charts/theme";
import type { LocalArmazenamento, RegistroTemperatura } from "@/lib/dominio/temperatura";
import type { Insumo } from "@/lib/dominio/insumo";
import { useToast } from "@/components/ficha/Toast";
import { acaoExcluirLocal } from "./actions";

function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function foraDaFaixaDoLocal(local: LocalArmazenamento | null | undefined, temperaturaC: number): boolean {
  return !!local && ((local.temperaturaMinC != null && temperaturaC < local.temperaturaMinC) || (local.temperaturaMaxC != null && temperaturaC > local.temperaturaMaxC));
}

export function SegurancaClient({ locais, registros, insumos }: { locais: LocalArmazenamento[]; registros: RegistroTemperatura[]; insumos: Insumo[] }) {
  const [showNovoLocal, setShowNovoLocal] = useState(false);
  const [localEditando, setLocalEditando] = useState<LocalArmazenamento | null>(null);
  const [showNovaTemperatura, setShowNovaTemperatura] = useState(false);
  const [localSelecionadoId, setLocalSelecionadoId] = useState(locais[0]?.id ?? "");
  const { mostrarErro } = useToast();

  const excluirLocalComConfirmacao = async (local: LocalArmazenamento) => {
    if (!window.confirm(`Excluir "${local.nome}"? Isso também apaga o histórico de leituras desse local.`)) return;
    const resultado = await acaoExcluirLocal(local.id);
    if (!resultado.ok) mostrarErro(resultado.erro);
  };

  const localSelecionado = locais.find((l) => l.id === localSelecionadoId) ?? null;
  const leiturasLocal = registros
    .filter((r) => r.localArmazenamentoId === localSelecionadoId)
    .slice()
    .sort((a, b) => new Date(a.registradoEm).getTime() - new Date(b.registradoEm).getTime())
    .map((r) => ({ ...r, dataLabel: formatarDataHora(r.registradoEm) }));

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[14px] font-semibold">Locais de armazenamento</h2>
          <button
            onClick={() => {
              setLocalEditando(null);
              setShowNovoLocal(!showNovoLocal);
            }}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: showNovoLocal ? "var(--bg)" : "var(--text)", color: showNovoLocal ? "var(--text)" : "#fff", border: `1px solid ${showNovoLocal ? "var(--border-strong)" : "var(--text)"}` }}
          >
            {showNovoLocal ? "Fechar" : "+ Novo local"}
          </button>
        </div>
        <p className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>Faixa ideal de cada local (freezer, câmara fria, estoque seco) -- é contra ela que toda leitura é avaliada.</p>

        {showNovoLocal && (
          <Card className="mb-3">
            <NovoLocalForm onCancel={() => setShowNovoLocal(false)} onSaved={() => setShowNovoLocal(false)} />
          </Card>
        )}

        <div className="grid grid-cols-3 gap-3">
          {locais.map((local) => {
            const ultima = registros.find((r) => r.localArmazenamentoId === local.id);
            const foraDaFaixa = !!ultima && foraDaFaixaDoLocal(local, ultima.temperaturaC);
            const insumosDoLocal = insumos.filter((i) => i.localArmazenamentoId === local.id);
            const editandoEsteAqui = localEditando?.id === local.id;
            return (
              <Card key={local.id} className="p-5">
                {editandoEsteAqui ? (
                  <NovoLocalForm local={local} onCancel={() => setLocalEditando(null)} onSaved={() => setLocalEditando(null)} />
                ) : (
                  <>
                    <div className="text-[13px]" style={{ color: "var(--sub)" }}>{local.nome}</div>
                    <div className="text-[30px] font-bold mt-1.5 leading-none" style={{ ...nums, color: foraDaFaixa ? "var(--danger)" : "var(--text)", letterSpacing: "-0.02em" }}>
                      {ultima ? `${ultima.temperaturaC}°C` : "—"}
                    </div>
                    <div className="text-[12px] mt-2" style={{ color: "var(--faint)" }}>
                      faixa ideal: {local.temperaturaMinC ?? "—"}°C a {local.temperaturaMaxC ?? "—"}°C
                    </div>
                    {insumosDoLocal.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {insumosDoLocal.map((i) => (
                          <Badge key={i.id}>{i.nome}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() => {
                          setShowNovoLocal(false);
                          setLocalEditando(local);
                        }}
                        className="text-[11.5px] font-medium"
                        style={{ color: "var(--text)" }}
                      >
                        editar
                      </button>
                      <button onClick={() => excluirLocalComConfirmacao(local)} className="text-[11.5px] font-medium" style={{ color: "var(--danger)" }}>
                        excluir
                      </button>
                    </div>
                  </>
                )}
              </Card>
            );
          })}
          {locais.length === 0 && (
            <div className="col-span-3 text-[12.5px] py-6 text-center" style={{ color: "var(--faint)" }}>
              Nenhum local de armazenamento cadastrado ainda.
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[14px] font-semibold">Temperatura de armazenamento</h2>
          <button
            onClick={() => setShowNovaTemperatura(!showNovaTemperatura)}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: showNovaTemperatura ? "var(--bg)" : "var(--text)", color: showNovaTemperatura ? "var(--text)" : "#fff", border: `1px solid ${showNovaTemperatura ? "var(--border-strong)" : "var(--text)"}` }}
            disabled={locais.length === 0}
            title={locais.length === 0 ? "Cadastre um local primeiro" : undefined}
          >
            {showNovaTemperatura ? "Fechar" : "+ Registrar leitura"}
          </button>
        </div>
        <p className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>Leitura manual por local de armazenamento, com responsável. Fica fora da faixa quando passa do limite cadastrado pro local.</p>

        {showNovaTemperatura && (
          <Card className="mb-4">
            <NovaTemperaturaForm locais={locais} insumos={insumos} onCancel={() => setShowNovaTemperatura(false)} onSaved={() => setShowNovaTemperatura(false)} />
          </Card>
        )}

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {locais.map((l) => (
            <button
              key={l.id}
              onClick={() => setLocalSelecionadoId(l.id)}
              className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
              style={{
                background: l.id === localSelecionadoId ? "var(--text)" : "var(--panel)",
                color: l.id === localSelecionadoId ? "#fff" : "var(--text)",
                border: `1px solid ${l.id === localSelecionadoId ? "var(--text)" : "var(--border-strong)"}`,
              }}
            >
              {l.nome}
            </button>
          ))}
        </div>

        <Card className="p-6 mb-5">
          <h2 className="text-[14px] font-semibold mb-1">Oscilação de temperatura{localSelecionado ? ` — ${localSelecionado.nome}` : ""}</h2>
          <p className="text-[12px] mb-4" style={{ color: "var(--sub)" }}>
            Linhas tracejadas marcam os limites cadastrados pro local. Ponto maior e vermelho é leitura fora da faixa.
          </p>
          <ChartFrame
            vazio={leiturasLocal.length === 0}
            tituloVazio="Nenhuma leitura registrada para este local ainda."
            dicaVazio="Registre uma leitura pra esse gráfico aparecer aqui."
          >
            <LineChart data={leiturasLocal} margin={CHART_MARGIN}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="dataLabel" tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} width={40} unit="°" />
              {localSelecionado?.temperaturaMinC != null && (
                <ReferenceLine y={localSelecionado.temperaturaMinC} stroke="var(--border-strong)" strokeDasharray="4 4" label={{ value: "mín.", position: "insideBottomRight", fontSize: 10, fill: "var(--sub)" }} />
              )}
              {localSelecionado?.temperaturaMaxC != null && (
                <ReferenceLine y={localSelecionado.temperaturaMaxC} stroke="var(--border-strong)" strokeDasharray="4 4" label={{ value: "máx.", position: "insideTopRight", fontSize: 10, fill: "var(--sub)" }} />
              )}
              <Tooltip
                content={({ payload }) => {
                  if (!payload || !payload.length) return null;
                  const p = payload[0].payload as RegistroTemperatura & { dataLabel: string };
                  const fora = foraDaFaixaDoLocal(localSelecionado, p.temperaturaC);
                  return (
                    <ChartTooltipCard
                      titulo={`${p.dataLabel} · ${p.responsavel}`}
                      linhas={[
                        { rotulo: "Temperatura", valor: `${p.temperaturaC}°C`, destaque: fora },
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
                  const fora = foraDaFaixaDoLocal(localSelecionado, payload.temperaturaC);
                  return <circle key={index} cx={cx} cy={cy} r={fora ? 6 : 3.5} fill={fora ? "var(--danger)" : "var(--text)"} />;
                }}
              />
            </LineChart>
          </ChartFrame>
        </Card>

        <Card>
          <div className="px-5 py-3.5" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
            <h2 className="text-[13px] font-semibold">Histórico de leituras</h2>
          </div>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ color: "var(--faint)" }} className="text-left text-[10.5px] uppercase tracking-wide">
                <th className="py-2.5 px-5 font-medium">Data</th>
                <th className="py-2.5 px-3 font-medium">Local</th>
                <th className="py-2.5 px-3 font-medium">Responsável</th>
                <th className="py-2.5 px-3 font-medium">Insumo</th>
                <th className="py-2.5 px-5 font-medium text-right">Temperatura</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => {
                const local = locais.find((l) => l.id === r.localArmazenamentoId);
                const foraDaFaixa = foraDaFaixaDoLocal(local, r.temperaturaC);
                return (
                  <tr key={r.id} style={{ borderTop: `1px solid ${"var(--border)"}` }}>
                    <td className="py-2.5 px-5">{formatarDataHora(r.registradoEm)}</td>
                    <td className="py-2.5 px-3">{r.nomeLocal}</td>
                    <td className="py-2.5 px-3" style={{ color: "var(--sub)" }}>{r.responsavel}</td>
                    <td className="py-2.5 px-3" style={{ color: "var(--sub)" }}>{r.nomeInsumo ?? "—"}</td>
                    <td className="py-2.5 px-5 text-right font-medium" style={{ ...nums, color: foraDaFaixa ? "var(--danger)" : "var(--text)" }}>
                      {r.temperaturaC}°C{foraDaFaixa && " · fora da faixa"}
                    </td>
                  </tr>
                );
              })}
              {registros.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 px-5 text-center" style={{ color: "var(--faint)" }}>
                    Nenhuma leitura registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
