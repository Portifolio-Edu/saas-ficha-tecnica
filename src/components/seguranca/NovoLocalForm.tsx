"use client";

import { useState } from "react";
import { C } from "@/components/ficha/tema";
import { ErroBanner } from "@/components/ficha/ErroBanner";
import { Input } from "@/components/ficha/Input";
import { useAcaoFormulario } from "@/hooks/useAcaoFormulario";
import type { LocalArmazenamento, LocalArmazenamentoInput } from "@/lib/dominio/temperatura";
import { acaoCriarLocal, acaoAtualizarLocal } from "@/app/seguranca/actions";

export function NovoLocalForm({ local, onCancel, onSaved }: { local?: LocalArmazenamento; onCancel: () => void; onSaved: () => void }) {
  const [nome, setNome] = useState(local?.nome ?? "");
  const [min, setMin] = useState(local?.temperaturaMinC != null ? String(local.temperaturaMinC) : "");
  const [max, setMax] = useState(local?.temperaturaMaxC != null ? String(local.temperaturaMaxC) : "");
  const { salvando, erro, executar } = useAcaoFormulario(onSaved);

  const salvar = () => {
    if (!nome.trim()) return;
    const input: LocalArmazenamentoInput = {
      nome: nome.trim(),
      temperaturaMinC: min ? parseFloat(min) : null,
      temperaturaMaxC: max ? parseFloat(max) : null,
    };
    executar(() => (local ? acaoAtualizarLocal(local.id, input) : acaoCriarLocal(input)));
  };

  return (
    <div className="px-5 py-4">
      <div className="grid grid-cols-4 gap-2 mb-3">
        <Input placeholder="Nome do local (ex: Freezer 1)" value={nome} onChange={(e) => setNome(e.target.value)} className="text-[12.5px] px-2.5 py-1.5 col-span-2" />
        <Input placeholder="Temp. mínima (°C)" type="number" value={min} onChange={(e) => setMin(e.target.value)} className="text-[12.5px] px-2.5 py-1.5" />
        <Input placeholder="Temp. máxima (°C)" type="number" value={max} onChange={(e) => setMax(e.target.value)} className="text-[12.5px] px-2.5 py-1.5" />
      </div>
      <ErroBanner erro={erro} />
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: C.text, color: "#fff", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : local ? "Salvar alterações" : "Salvar local"}
        </button>
        <button onClick={onCancel} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ border: `1px solid ${C.borderStrong}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
