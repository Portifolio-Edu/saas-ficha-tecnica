"use client";

import { useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { Camera, Sparkles, Check, Mic } from "lucide-react";
import { nums } from "@/components/ficha/tema";
// SISTEMA premium (2026-09-22): barra do agente (demo) no acento --marca e botões neutros;
// antes roxo fixo (purple-600) e emoji. Versão anterior: `git show 4f29ec6:src/components/nutricional/InsumoNutricaoForm.tsx`.
import { ErroBanner } from "@/components/ficha/ErroBanner";
import { Input } from "@/components/ficha/Input";
import { useAcaoFormulario } from "@/hooks/useAcaoFormulario";
import type { Insumo } from "@/lib/dominio/insumo";
import type { ValoresNutricionaisInsumo } from "@/lib/dominio/nutricional";
import { CAMPOS_NUTRICIONAIS, type CampoNutricional, type ValoresNutricionais } from "@/lib/calculo/nutricional";
import { LABEL_CAMPO } from "./labels";
import { acaoSalvarValoresInsumo } from "@/app/nutricional/actions";
import { abrirAgenteIaComFoco } from "@/components/ia/BotaoAgenteIa";

export function InsumoNutricaoForm({
  insumo,
  dados,
  onCancel,
  onSaved,
}: {
  insumo: Insumo;
  dados?: ValoresNutricionaisInsumo;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [baseGramas, setBaseGramas] = useState(dados ? String(dados.baseGramas) : "100");
  const [valores, setValores] = useState<Record<CampoNutricional, string>>(
    Object.fromEntries(CAMPOS_NUTRICIONAIS.map((c) => [c, dados?.valores[c] != null ? String(dados.valores[c]) : ""])) as Record<CampoNutricional, string>,
  );
  const [lendoIa, setLendoIa] = useState(false);
  const [sucessoIa, setSucessoIa] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { salvando, erro, executar } = useAcaoFormulario(onSaved);
  // A leitura de rótulo por foto é simulada (devolve valores fixos, não lê a
  // imagem). Só aparece na demo: em produção esses números iriam parar num
  // rótulo nutricional de verdade.
  const emModoDemo = usePathname()?.startsWith("/preview") ?? false;

  const salvar = () => {
    const input = {
      baseGramas: parseFloat(baseGramas) || 100,
      valores: Object.fromEntries(CAMPOS_NUTRICIONAIS.map((c) => [c, valores[c] === "" ? null : parseFloat(valores[c])])) as Partial<ValoresNutricionais>,
    };
    if (emModoDemo) {
      executar(async () => {
        try {
          const salvos: ValoresNutricionaisInsumo[] = JSON.parse(localStorage.getItem("demo_valores_nutricionais") ?? "[]");
          const outros = Array.isArray(salvos) ? salvos.filter((v) => v.insumoId !== insumo.id) : [];
          localStorage.setItem("demo_valores_nutricionais", JSON.stringify([...outros, { insumoId: insumo.id, ...input }]));
        } catch {}
        return { ok: true };
      });
      return;
    }
    executar(() => acaoSalvarValoresInsumo(insumo.id, input));
  };

  const simularLeituraRotulo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLendoIa(true);
    setSucessoIa(false);

    setTimeout(() => {
      // Simulação de extração de rótulo para o insumo
      let novosValores: Partial<Record<CampoNutricional, string>> = {
        caloriasKcal: "392",
        carboidratosG: "40",
        acucaresTotaisG: "1.5",
        acucaresAdicionadosG: "0",
        proteinasG: "45",
        gordurasTotaisG: "5.5",
        gordurasSaturadasG: "1.2",
        gordurasTransG: "0",
        fibraAlimentarG: "22",
        sodioMg: "60",
      };

      if (insumo.nome.toLowerCase().includes("farinha")) {
        novosValores = {
          caloriasKcal: "360",
          carboidratosG: "75",
          acucaresTotaisG: "0.3",
          acucaresAdicionadosG: "0",
          proteinasG: "10",
          gordurasTotaisG: "1.5",
          gordurasSaturadasG: "0.3",
          gordurasTransG: "0",
          fibraAlimentarG: "3",
          sodioMg: "2",
        };
      }

      setValores((prev) => ({
        ...prev,
        ...novosValores,
      }));
      setLendoIa(false);
      setSucessoIa(true);
    }, 1000);
  };

  return (
    <div className="px-4 py-3.5 rounded-xl border shadow-sm" style={{ background: "var(--panel-elevated)", borderColor: "var(--linha-forte)" }}>
      {emModoDemo && (
      <>
      {/* Barra de Inteligência Artificial para Leitura de Rótulo -- simulada, só na demo */}
      <div className="p-2.5 rounded-lg mb-3 flex flex-wrap items-center justify-between gap-2 border" style={{ backgroundColor: "var(--marca-suave)", borderColor: "color-mix(in srgb, var(--marca) 25%, transparent)" }}>
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="shrink-0" style={{ color: "var(--marca)" }} />
          <span className="text-[12px] font-bold text-[var(--tinta)]">
            Preenchimento automático por imagem ou áudio
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--panel)", color: "var(--tinta-sub)", border: "1px solid var(--linha)" }}>
            Demonstração
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={simularLeituraRotulo}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={lendoIa}
            className="px-3 min-h-9 rounded-md text-[13px] font-medium flex items-center gap-1.5 border bg-[var(--panel)] border-[var(--linha)] text-[var(--tinta)] hover:bg-[var(--panel-hover)]"
          >
            <Camera size={13} />
            <span>{lendoIa ? "Lendo rótulo..." : "Foto do rótulo"}</span>
          </button>

          <button
            type="button"
            onClick={() => abrirAgenteIaComFoco(insumo.id, insumo.nome)}
            className="px-3 min-h-9 rounded-md text-[13px] font-medium flex items-center gap-1.5 border bg-[var(--panel)] border-[var(--linha)] text-[var(--tinta)] hover:bg-[var(--panel-hover)]"
          >
            <Mic size={13} />
            <span>Abrir agente IA</span>
          </button>
        </div>
      </div>

      {sucessoIa && (
        <div className="mb-3 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-[11.5px] font-bold flex items-center gap-1.5 animate-fade-in">
          <Check size={14} />
          <span>Valores de exemplo preenchidos (simulação). Confira antes de salvar.</span>
        </div>
      )}
      </>
      )}

      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[13px] font-black text-[var(--tinta)] flex-1">{insumo.nome}</span>
        <span className="text-[11.5px] font-medium" style={{ color: "var(--tinta-sub)" }}>Valores por</span>
        <Input type="number" value={baseGramas} onChange={(e) => setBaseGramas(e.target.value)} className="text-[12px] px-2 py-1 w-16 text-right font-bold" style={nums} />
        <span className="text-[11.5px] font-bold" style={{ color: "var(--tinta-sub)" }}>g/mL</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {CAMPOS_NUTRICIONAIS.map((c) => (
          <div key={c} className="flex items-center justify-between gap-2 p-1.5 rounded-lg border bg-[var(--panel)]" style={{ borderColor: "var(--linha)" }}>
            <span className="text-[12px] font-medium text-[var(--tinta-sub)]">{LABEL_CAMPO[c]}</span>
            <Input
              type="number"
              value={valores[c]}
              onChange={(e) => setValores({ ...valores, [c]: e.target.value })}
              className="text-[12.5px] px-2 py-1 w-20 text-right font-extrabold"
              style={nums}
            />
          </div>
        ))}
      </div>

      <ErroBanner erro={erro} className="mb-2" />
      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando} className="text-[12px] font-extrabold px-4 py-2 rounded-lg" style={{ background: "var(--accent)", color: "var(--accent-contrast, #fff)", opacity: salvando ? 0.6 : 1 }}>
          {salvando ? "Salvando..." : "Salvar no Insumo"}
        </button>
        <button onClick={onCancel} className="text-[12px] font-bold px-4 py-2 rounded-lg border" style={{ borderColor: "var(--linha-forte)" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
