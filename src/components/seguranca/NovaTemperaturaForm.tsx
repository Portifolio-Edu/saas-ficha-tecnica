"use client";

import { useState } from "react";
import { inputStyle } from "@/components/ficha/tema";
import { ErroBanner } from "@/components/ficha/ErroBanner";
import { Input } from "@/components/ficha/Input";
import { useAcaoFormulario } from "@/hooks/useAcaoFormulario";
import type { LocalArmazenamento, RegistroTemperaturaInput } from "@/lib/dominio/temperatura";
import type { Insumo } from "@/lib/dominio/insumo";
import { acaoRegistrarTemperatura } from "@/app/seguranca/actions";

export function NovaTemperaturaForm({
  locais,
  insumos,
  onCancel,
  onSaved,
}: {
  locais: LocalArmazenamento[];
  insumos: Insumo[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [localId, setLocalId] = useState(locais[0]?.id ?? "");
  const [insumoId, setInsumoId] = useState("");
  const [temperatura, setTemperatura] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const { salvando, erro, executar } = useAcaoFormulario(onSaved);

  const local = locais.find((l) => l.id === localId);
  const insumosDoLocal = insumos.filter((i) => i.localArmazenamentoId === localId);
  const valor = parseFloat(temperatura);
  const foraDaFaixa = local && temperatura !== "" && ((local.temperaturaMinC != null && valor < local.temperaturaMinC) || (local.temperaturaMaxC != null && valor > local.temperaturaMaxC));

  const trocarLocal = (id: string) => {
    setLocalId(id);
    setInsumoId("");
  };

  const salvar = () => {
    if (!localId || temperatura === "" || !responsavel.trim()) return;
    const input: RegistroTemperaturaInput = { localArmazenamentoId: localId, temperaturaC: valor, responsavel: responsavel.trim(), insumoId: insumoId || null };
    executar(() => acaoRegistrarTemperatura(input));
  };

  return (
    <div className="px-5 py-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <select aria-label="Local" value={localId} onChange={(e) => trocarLocal(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle}>
          {locais.map((l) => (
            <option key={l.id} value={l.id}>{l.nome}</option>
          ))}
        </select>
        <select aria-label="Insumo" value={insumoId} onChange={(e) => setInsumoId(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 rounded-md col-span-2" style={inputStyle}>
          <option value="">Sem insumo específico (ronda geral)</option>
          {insumosDoLocal.map((i) => (
            <option key={i.id} value={i.id}>{i.nome}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <Input aria-label="Temperatura (°C)" placeholder="Temperatura (°C)" type="number" inputMode="decimal" value={temperatura} onChange={(e) => setTemperatura(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 col-span-2" />
        <Input aria-label="Responsável" placeholder="Responsável" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 col-span-2" />
      </div>
      {foraDaFaixa && (
        <div className="text-[12px] mb-2" style={{ color: "var(--danger)" }}>
          Fora da faixa ideal desse local ({local?.temperaturaMinC}°C a {local?.temperaturaMaxC}°C), mas dá pra salvar mesmo assim, o registro é o que importa.
        </div>
      )}
      <ErroBanner erro={erro} />
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: "var(--accent)", color: "var(--accent-contrast, #fff)", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : "Salvar leitura"}
        </button>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${"var(--border-strong)"}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
