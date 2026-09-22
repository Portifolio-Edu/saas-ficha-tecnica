"use client";

import { useState } from "react";
import { inputStyle } from "@/components/ficha/tema";
import { ErroBanner } from "@/components/ficha/ErroBanner";
import { Input } from "@/components/ficha/Input";
import { useAcaoFormulario } from "@/hooks/useAcaoFormulario";
import type { Insumo } from "@/lib/dominio/insumo";
import { acaoRastrearInsumo } from "@/app/estoque/actions";

export function NovoEstoqueForm({ insumosDisponiveis, onCancel, onSaved }: { insumosDisponiveis: Insumo[]; onCancel: () => void; onSaved: () => void }) {
  const [insumoId, setInsumoId] = useState(insumosDisponiveis[0]?.id ?? "");
  const [atual, setAtual] = useState("");
  const [minimo, setMinimo] = useState("");
  const { salvando, erro, executar } = useAcaoFormulario(onSaved);

  if (insumosDisponiveis.length === 0) {
    return (
      <div className="px-5 py-4">
        <p className="text-[12.5px] mb-3" style={{ color: "var(--sub)" }}>Todos os insumos cadastrados já têm estoque rastreado. Cadastre um insumo novo na aba Insumos primeiro.</p>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${"var(--border-strong)"}` }}>Fechar</button>
      </div>
    );
  }

  const unidade = insumosDisponiveis.find((i) => i.id === insumoId)?.unidadeMedida ?? "";

  const salvar = () => {
    if (!insumoId || atual === "" || minimo === "") return;
    executar(() => acaoRastrearInsumo(insumoId, parseFloat(atual), parseFloat(minimo)));
  };

  return (
    <div className="px-5 py-4">
      <div className="grid grid-cols-4 gap-2 mb-3">
        <select value={insumoId} onChange={(e) => setInsumoId(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle}>
          {insumosDisponiveis.map((i) => (
            <option key={i.id} value={i.id}>{i.nome}</option>
          ))}
        </select>
        <Input placeholder={`Saldo atual (${unidade})`} type="number" value={atual} onChange={(e) => setAtual(e.target.value)} className="text-[12.5px] px-2.5 py-1.5" />
        <Input placeholder={`Estoque mínimo (${unidade})`} type="number" value={minimo} onChange={(e) => setMinimo(e.target.value)} className="text-[12.5px] px-2.5 py-1.5" />
      </div>
      <ErroBanner erro={erro} />
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: "var(--accent)", color: "var(--accent-contrast, #fff)", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : "Adicionar ao estoque"}
        </button>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${"var(--border-strong)"}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
