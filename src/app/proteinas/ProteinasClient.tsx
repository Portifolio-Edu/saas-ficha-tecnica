"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ficha/Card";
import { Kpi } from "@/components/ficha/Kpi";
import { C, inputStyle, nums } from "@/components/ficha/tema";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Processamento, ProcessamentoInput } from "@/lib/dominio/processamento";
import { acaoCriarProcessamento } from "./actions";

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatarData(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function NovoProcessamentoForm({
  proteinas,
  insumoInicial,
  onCancel,
  onSaved,
}: {
  proteinas: Insumo[];
  insumoInicial: string;
  onCancel: () => void;
  onSaved: (insumoId: string) => void;
}) {
  const [insumoId, setInsumoId] = useState(proteinas.some((i) => i.id === insumoInicial) ? insumoInicial : (proteinas[0]?.id ?? ""));
  const [processadoEm, setProcessadoEm] = useState(hoje());
  const [responsavel, setResponsavel] = useState("");
  const [pesoBrutoRecebido, setPesoBrutoRecebido] = useState("");
  const [valorPagoKg, setValorPagoKg] = useState("");
  const [pesoLiquidoResultante, setPesoLiquidoResultante] = useState("");
  const [pesoAparasReaproveitaveis, setPesoAparasReaproveitaveis] = useState("0");
  const [fornecedor, setFornecedor] = useState("");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const bruto = parseFloat(pesoBrutoRecebido) || 0;
  const liquido = parseFloat(pesoLiquidoResultante) || 0;
  const aparas = parseFloat(pesoAparasReaproveitaveis) || 0;
  const descartePuro = bruto && liquido ? bruto - liquido - aparas : null;
  const fcPreview = bruto && liquido ? bruto / liquido : null;
  const reconciliacaoInvalida = descartePuro !== null && descartePuro < 0;

  const salvar = async () => {
    if (!insumoId || !responsavel.trim() || !pesoBrutoRecebido || !valorPagoKg || !pesoLiquidoResultante || reconciliacaoInvalida) return;
    setSalvando(true);
    setErro(null);
    const input: ProcessamentoInput = {
      insumoId,
      responsavel: responsavel.trim(),
      pesoBrutoRecebido: bruto,
      valorPagoKg: parseFloat(valorPagoKg),
      pesoLiquidoResultante: liquido,
      pesoAparasReaproveitaveis: aparas,
      fornecedor: fornecedor.trim() || null,
      observacao: observacao.trim() || null,
      processadoEm,
    };
    const resultado = await acaoCriarProcessamento(input);
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }
    onSaved(insumoId);
  };

  return (
    <div className="px-5 py-4">
      <div className="grid grid-cols-6 gap-2 mb-2">
        <select value={insumoId} onChange={(e) => setInsumoId(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle}>
          {proteinas.map((i) => (
            <option key={i.id} value={i.id}>{i.nome}</option>
          ))}
        </select>
        <input type="date" value={processadoEm} onChange={(e) => setProcessadoEm(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
        <input placeholder="Responsável pelo corte" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-3" style={inputStyle} />
      </div>
      <div className="grid grid-cols-4 gap-2 mb-2">
        <input placeholder="Peso bruto recebido (kg)" type="number" value={pesoBrutoRecebido} onChange={(e) => setPesoBrutoRecebido(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
        <input placeholder="Valor pago/kg (R$)" type="number" value={valorPagoKg} onChange={(e) => setValorPagoKg(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
        <input placeholder="Peso líquido usável (kg)" type="number" value={pesoLiquidoResultante} onChange={(e) => setPesoLiquidoResultante(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
        <input placeholder="Aparas reaproveitáveis (kg)" type="number" value={pesoAparasReaproveitaveis} onChange={(e) => setPesoAparasReaproveitaveis(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md" style={inputStyle} />
      </div>
      <div className="flex items-center gap-3 mb-2">
        <input placeholder="Fornecedor (opcional)" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md flex-1" style={inputStyle} />
        {fcPreview && (
          <div className="text-[12.5px]" style={{ color: C.sub }}>
            FC do lote: <b style={{ ...nums, color: C.text }}>{fcPreview.toFixed(3)}</b>
          </div>
        )}
        {descartePuro !== null && (
          <div className="text-[12.5px]" style={{ color: reconciliacaoInvalida ? C.danger : C.sub }}>
            Descarte puro: <b style={{ ...nums, color: reconciliacaoInvalida ? C.danger : C.text }}>{descartePuro.toFixed(2)}kg</b>
          </div>
        )}
      </div>
      {reconciliacaoInvalida && (
        <div className="text-[12px] mb-2" style={{ color: C.danger }}>Peso líquido + aparas passa do peso bruto recebido, confere os números antes de salvar.</div>
      )}
      <input
        placeholder="Observação (ex: peixe chegou machucado, corte impreciso, produto vencendo)"
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        className="text-[12.5px] px-2.5 py-1.5 rounded-md w-full mb-3"
        style={inputStyle}
      />
      {erro && (
        <div className="text-[12px] mb-3 rounded-md px-2.5 py-2" style={{ background: C.dangerSoft, color: C.danger }}>
          {erro}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: C.text, color: "#fff", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : "Salvar lote"}
        </button>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${C.borderStrong}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function ProteinasClient({ proteinas, processamentos }: { proteinas: Insumo[]; processamentos: Processamento[] }) {
  const [proteinaSelecionada, setProteinaSelecionada] = useState(proteinas[0]?.id ?? "");
  const [showNovoProcessamento, setShowNovoProcessamento] = useState(false);

  if (proteinas.length === 0) {
    return (
      <div className="max-w-5xl">
        <Card className="p-6 text-center">
          <p className="text-[13px]" style={{ color: C.sub }}>Nenhum insumo da categoria proteína cadastrado ainda. Cadastre um em Insumos primeiro.</p>
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
      <p className="text-[13px] mb-5" style={{ color: C.sub }}>
        Cada lote de proteína processada (peixe, gado, frango) entra aqui com peso bruto recebido, valor pago, peso limpo, quanto virou apara reaproveitável e quanto foi descarte puro. O FC observado é medido, não estimado, e a média dos lotes substitui o FC cadastrado no cálculo de CMV em todo o sistema sempre que existir histórico. Isso também é registro de auditoria: dá pra ver quem processou cada lote e comparar rendimento entre pessoas.
      </p>

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {proteinas.map((i) => (
          <button
            key={i.id}
            onClick={() => setProteinaSelecionada(i.id)}
            className="text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
            style={{ background: i.id === insumo.id ? C.text : C.panel, color: i.id === insumo.id ? "#fff" : C.text, border: `1px solid ${i.id === insumo.id ? C.text : C.borderStrong}` }}
          >
            {i.nome}
          </button>
        ))}
        <button
          onClick={() => setShowNovoProcessamento(!showNovoProcessamento)}
          className="ml-auto text-[12.5px] font-medium px-3 py-1.5 rounded-lg"
          style={{ background: showNovoProcessamento ? C.bg : C.text, color: showNovoProcessamento ? C.text : "#fff", border: `1px solid ${showNovoProcessamento ? C.borderStrong : C.text}` }}
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
          <p className="text-[13px]" style={{ color: C.sub }}>
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
            <p className="text-[12px] mb-4" style={{ color: C.sub }}>Linha tracejada é o FC cadastrado. Quanto mais alto acima dela, pior o rendimento real do lote.</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lotes.map((l) => ({ ...l, dataLabel: formatarData(l.processadoEm) }))} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={C.border} vertical={false} />
                <XAxis dataKey="dataLabel" tick={{ fontSize: 11, fill: C.faint }} tickLine={false} axisLine={{ stroke: C.border }} />
                <YAxis domain={["dataMin - 0.03", "dataMax + 0.03"]} tick={{ fontSize: 11, fill: C.faint }} tickLine={false} axisLine={{ stroke: C.border }} width={40} />
                <ReferenceLine y={insumo.fatorCorrecao} stroke={C.borderStrong} strokeDasharray="4 4" label={{ value: "FC cadastrado", position: "right", fontSize: 10, fill: C.sub }} />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload || !payload.length) return null;
                    const p = payload[0].payload as Processamento & { dataLabel: string };
                    return (
                      <div className="text-xs p-2.5 rounded-lg" style={{ background: C.text, color: "#fff" }}>
                        <div className="font-semibold">{p.dataLabel} · {p.responsavel}</div>
                        <div style={nums}>FC do lote: {p.fcObservado.toFixed(3)}</div>
                        <div style={nums}>{p.pesoBrutoRecebido}kg bruto → {p.pesoLiquidoResultante}kg líquido</div>
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="fcObservado" stroke={C.text} strokeWidth={2} dot={{ r: 4, fill: C.text }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <div className="px-5 py-3.5" style={{ borderBottom: `1px solid ${C.border}` }}>
              <h2 className="text-[13px] font-semibold">Histórico de lotes (auditoria)</h2>
            </div>
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ color: C.faint }} className="text-left text-[10px] uppercase tracking-wide">
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
                    <>
                      <tr key={l.id} style={{ borderTop: `1px solid ${C.border}` }}>
                        <td className="py-2 px-5">{formatarData(l.processadoEm)}</td>
                        <td className="py-2 px-2 font-medium">{l.responsavel}</td>
                        <td className="py-2 px-2" style={{ color: C.sub }}>{l.fornecedor ?? "—"}</td>
                        <td className="py-2 px-2 text-right" style={nums}>{l.pesoBrutoRecebido.toFixed(2)}kg</td>
                        <td className="py-2 px-2 text-right" style={nums}>R$ {l.valorPagoKg.toFixed(2)}</td>
                        <td className="py-2 px-2 text-right" style={nums}>{l.pesoLiquidoResultante.toFixed(2)}kg</td>
                        <td className="py-2 px-2 text-right" style={{ ...nums, color: C.sub }}>{l.pesoAparasReaproveitaveis.toFixed(2)}kg</td>
                        <td className="py-2 px-2 text-right" style={{ ...nums, color: descarteAlto ? C.danger : C.text }}>{l.pesoDescartePuro.toFixed(2)}kg</td>
                        <td className="py-2 px-5 text-right font-medium" style={nums}>{l.fcObservado.toFixed(3)}</td>
                      </tr>
                      {l.observacao && (
                        <tr key={`${l.id}-obs`}>
                          <td colSpan={9} className="pb-2 px-5 text-[11.5px]" style={{ color: C.sub }}>Obs: {l.observacao}</td>
                        </tr>
                      )}
                    </>
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
