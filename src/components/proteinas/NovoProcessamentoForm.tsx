"use client";

import { useState } from "react";
import { inputStyle, nums } from "@/components/ficha/tema";
import { ErroBanner } from "@/components/ficha/ErroBanner";
import { Input } from "@/components/ficha/Input";
import { useAcaoFormulario } from "@/hooks/useAcaoFormulario";
import type { Insumo } from "@/lib/dominio/insumo";
import type { ProcessamentoInput } from "@/lib/dominio/processamento";
import { acaoCriarProcessamento } from "@/app/proteinas/actions";

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NovoProcessamentoForm({
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
  const { salvando, erro, executar } = useAcaoFormulario(() => onSaved(insumoId));

  const bruto = parseFloat(pesoBrutoRecebido) || 0;
  const liquido = parseFloat(pesoLiquidoResultante) || 0;
  const aparas = parseFloat(pesoAparasReaproveitaveis) || 0;
  const descartePuro = bruto && liquido ? bruto - liquido - aparas : null;
  const fcPreview = bruto && liquido ? bruto / liquido : null;
  const reconciliacaoInvalida = descartePuro !== null && descartePuro < 0;

  const salvar = () => {
    if (!insumoId || !responsavel.trim() || !pesoBrutoRecebido || !valorPagoKg || !pesoLiquidoResultante || reconciliacaoInvalida) return;
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
    executar(() => acaoCriarProcessamento(input));
  };

  return (
    <div className="px-5 py-4">
      <div className="grid grid-cols-6 gap-2 mb-2">
        <select value={insumoId} onChange={(e) => setInsumoId(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle}>
          {proteinas.map((i) => (
            <option key={i.id} value={i.id}>{i.nome}</option>
          ))}
        </select>
        <Input type="date" value={processadoEm} onChange={(e) => setProcessadoEm(e.target.value)} className="text-[12.5px] px-2.5 py-1.5" />
        <Input placeholder="Responsável pelo corte" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 col-span-3" />
      </div>
      <div className="grid grid-cols-4 gap-2 mb-2">
        <Input placeholder="Peso bruto recebido (kg)" type="number" value={pesoBrutoRecebido} onChange={(e) => setPesoBrutoRecebido(e.target.value)} className="text-[12.5px] px-2.5 py-1.5" />
        <Input placeholder="Valor pago/kg (R$)" type="number" value={valorPagoKg} onChange={(e) => setValorPagoKg(e.target.value)} className="text-[12.5px] px-2.5 py-1.5" />
        <Input placeholder="Peso líquido usável (kg)" type="number" value={pesoLiquidoResultante} onChange={(e) => setPesoLiquidoResultante(e.target.value)} className="text-[12.5px] px-2.5 py-1.5" />
        <Input placeholder="Aparas reaproveitáveis (kg)" type="number" value={pesoAparasReaproveitaveis} onChange={(e) => setPesoAparasReaproveitaveis(e.target.value)} className="text-[12.5px] px-2.5 py-1.5" />
      </div>
      <div className="flex items-center gap-3 mb-2">
        <Input placeholder="Fornecedor (opcional)" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 flex-1" />
        {fcPreview && (
          <div className="text-[12.5px]" style={{ color: "var(--sub)" }}>
            FC do lote: <b style={{ ...nums, color: "var(--text)" }}>{fcPreview.toFixed(3)}</b>
          </div>
        )}
        {descartePuro !== null && (
          <div className="text-[12.5px]" style={{ color: reconciliacaoInvalida ? "var(--danger)" : "var(--sub)" }}>
            Descarte puro: <b style={{ ...nums, color: reconciliacaoInvalida ? "var(--danger)" : "var(--text)" }}>{descartePuro.toFixed(2)}kg</b>
          </div>
        )}
      </div>
      {reconciliacaoInvalida && (
        <div className="text-[12px] mb-2" style={{ color: "var(--danger)" }}>Peso líquido + aparas passa do peso bruto recebido, confere os números antes de salvar.</div>
      )}
      <Input
        placeholder="Observação (ex: peixe chegou machucado, corte impreciso, produto vencendo)"
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        className="text-[12.5px] px-2.5 py-1.5 w-full mb-3"
      />
      <ErroBanner erro={erro} />
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: "var(--text)", color: "#fff", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : "Salvar lote"}
        </button>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${"var(--border-strong)"}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
