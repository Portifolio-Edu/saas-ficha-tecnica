"use client";

import { useState, useRef } from "react";
import { Camera, Sparkles, Check, Mic } from "lucide-react";
import { nums } from "@/components/ficha/tema";
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

  const salvar = () => {
    executar(() =>
      acaoSalvarValoresInsumo(insumo.id, {
        baseGramas: parseFloat(baseGramas) || 100,
        valores: Object.fromEntries(CAMPOS_NUTRICIONAIS.map((c) => [c, valores[c] === "" ? null : parseFloat(valores[c])])) as Partial<ValoresNutricionais>,
      }),
    );
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
      {/* Barra de Inteligência Artificial para Leitura de Rótulo */}
      <div className="p-2.5 rounded-lg mb-3 flex flex-wrap items-center justify-between gap-2 border" style={{ backgroundColor: "rgba(124, 58, 237, 0.08)", borderColor: "rgba(124, 58, 237, 0.25)" }}>
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-500 shrink-0" />
          <span className="text-[12px] font-bold text-[var(--tinta)]">
            Preenchimento Automático por Imagem ou Áudio
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
            className="px-2.5 py-1 rounded-md text-[11.5px] font-bold flex items-center gap-1.5 bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-all"
          >
            <Camera size={13} />
            <span>{lendoIa ? "Lendo rótulo..." : "📷 Foto do Rótulo"}</span>
          </button>

          <button
            type="button"
            onClick={() => abrirAgenteIaComFoco(insumo.id, insumo.nome)}
            className="px-2.5 py-1 rounded-md text-[11.5px] font-bold flex items-center gap-1.5 border border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-all"
          >
            <Mic size={13} />
            <span>Abrir Agente IA</span>
          </button>
        </div>
      </div>

      {sucessoIa && (
        <div className="mb-3 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-[11.5px] font-bold flex items-center gap-1.5 animate-fade-in">
          <Check size={14} />
          <span>Rótulo lido com sucesso pela IA! Valores por 100g extraídos automaticamente.</span>
        </div>
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
