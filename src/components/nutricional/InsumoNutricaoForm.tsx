"use client";

import { useState } from "react";
import { C, nums } from "@/components/ficha/tema";
import { ErroBanner } from "@/components/ficha/ErroBanner";
import { Input } from "@/components/ficha/Input";
import { useAcaoFormulario } from "@/hooks/useAcaoFormulario";
import type { Insumo } from "@/lib/dominio/insumo";
import type { ValoresNutricionaisInsumo } from "@/lib/dominio/nutricional";
import { CAMPOS_NUTRICIONAIS, type CampoNutricional, type ValoresNutricionais } from "@/lib/calculo/nutricional";
import { LABEL_CAMPO } from "./labels";
import { acaoSalvarValoresInsumo } from "@/app/nutricional/actions";

export function InsumoNutricaoForm({ insumo, dados, onCancel, onSaved }: { insumo: Insumo; dados?: ValoresNutricionaisInsumo; onCancel: () => void; onSaved: () => void }) {
  const [baseGramas, setBaseGramas] = useState(dados ? String(dados.baseGramas) : "100");
  const [valores, setValores] = useState<Record<CampoNutricional, string>>(
    Object.fromEntries(CAMPOS_NUTRICIONAIS.map((c) => [c, dados?.valores[c] != null ? String(dados.valores[c]) : ""])) as Record<CampoNutricional, string>,
  );
  const { salvando, erro, executar } = useAcaoFormulario(onSaved);

  const salvar = () => {
    executar(() =>
      acaoSalvarValoresInsumo(insumo.id, {
        baseGramas: parseFloat(baseGramas) || 100,
        valores: Object.fromEntries(CAMPOS_NUTRICIONAIS.map((c) => [c, valores[c] === "" ? null : parseFloat(valores[c])])) as Partial<ValoresNutricionais>,
      }),
    );
  };

  return (
    <div className="px-4 py-3 rounded-lg" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[12px] font-medium flex-1">{insumo.nome}</span>
        <span className="text-[11px]" style={{ color: C.faint }}>valores por</span>
        <Input type="number" value={baseGramas} onChange={(e) => setBaseGramas(e.target.value)} className="text-[12px] px-2 py-1 w-16 text-right" style={nums} />
        <span className="text-[11px]" style={{ color: C.faint }}>g/mL</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {CAMPOS_NUTRICIONAIS.map((c) => (
          <div key={c} className="flex items-center gap-2">
            <span className="text-[11.5px] flex-1" style={{ color: C.sub }}>{LABEL_CAMPO[c]}</span>
            <Input
              type="number"
              value={valores[c]}
              onChange={(e) => setValores({ ...valores, [c]: e.target.value })}
              className="text-[12px] px-2 py-1 w-20 text-right"
              style={nums}
            />
          </div>
        ))}
      </div>
      <ErroBanner erro={erro} className="mb-2" />
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12px] font-medium px-3 py-1.5 rounded-lg" style={{ background: C.text, color: "#fff", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : "Salvar"}
        </button>
        <button onClick={onCancel} className="text-[12px] font-medium px-3 py-1.5 rounded-lg" style={{ border: `1px solid ${C.borderStrong}` }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
