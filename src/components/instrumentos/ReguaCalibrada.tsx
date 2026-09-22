"use client";

import { useId } from "react";

export interface ReguaCalibradaProps {
  rotulo: string;
  codigo?: string;
  valor: number;
  meta: number;
  min?: number;
  max?: number;
  unidade?: string;
  toleranciaMin?: number;
  toleranciaMax?: number;
  emRisco?: boolean;
  inverso?: boolean; // Se true (ex: CMV ou Perda), valor alto é risco
  formatoValor?: (val: number) => string;
  formatoMeta?: (val: number) => string;
  ticks?: number[];
  mostrarReguaSecundaria?: boolean;
  className?: string;
}

export function ReguaCalibrada({
  rotulo,
  codigo,
  valor,
  meta,
  min = 0,
  max = 100,
  unidade = "%",
  toleranciaMin,
  toleranciaMax,
  emRisco,
  inverso = false,
  formatoValor,
  formatoMeta,
  ticks = [0, 25, 50, 75, 100],
  className = "",
}: ReguaCalibradaProps) {
  const id = useId();

  // Garante que o valor fique dentro dos limites visuais da régua
  const clampedValor = Math.max(min, Math.min(max, valor));
  const clampedMeta = Math.max(min, Math.min(max, meta));

  const pctValor = ((clampedValor - min) / (max - min)) * 100;
  const pctMeta = ((clampedMeta - min) / (max - min)) * 100;

  // Faixa de tolerância (desenhada no trilho)
  const tolMinPct =
    toleranciaMin !== undefined ? Math.max(0, ((toleranciaMin - min) / (max - min)) * 100) : inverso ? 0 : pctMeta;
  const tolMaxPct =
    toleranciaMax !== undefined ? Math.min(100, ((toleranciaMax - min) / (max - min)) * 100) : inverso ? pctMeta : 100;

  const larguraTolPct = Math.max(0, tolMaxPct - tolMinPct);

  // Risco real no dado:
  const sobRisco =
    emRisco !== undefined
      ? emRisco
      : inverso
      ? valor > (toleranciaMax ?? meta)
      : valor < (toleranciaMin ?? meta);

  const valorFormatado = formatoValor ? formatoValor(valor) : `${valor.toFixed(1)}${unidade}`;
  const metaFormatada = formatoMeta ? formatoMeta(meta) : `${meta.toFixed(1)}${unidade}`;

  const delta = valor - meta;
  const deltaFormatado = `${delta > 0 ? "+" : ""}${delta.toFixed(1)}${unidade}`;

  return (
    <div className={`flex flex-col select-none font-sans group ${className}`} role="group" aria-labelledby={`${id}-lbl`}>
      {/* Top Header: Rótulo & Badges com Alta Legibilidade */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {codigo && (
            <span
              className="text-[12px] font-bold px-2 py-0.5 rounded-md tracking-wider uppercase shrink-0"
              style={{
                backgroundColor: sobRisco ? "rgba(255, 59, 48, 0.15)" : "var(--panel-elevated)",
                color: sobRisco ? "var(--sinal)" : "var(--tinta-sub)",
                border: `1px solid ${sobRisco ? "rgba(255, 59, 48, 0.35)" : "var(--linha-forte)"}`,
              }}
            >
              {codigo}
            </span>
          )}
          <span
            id={`${id}-lbl`}
            className="text-[14px] md:text-[15px] font-bold tracking-tight text-[var(--tinta)] truncate"
          >
            {rotulo}
          </span>
        </div>

        {/* Dynamic Status Pill - Grande e Legível */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] md:text-[12px] font-extrabold tracking-wide uppercase shadow-sm"
            style={{
              backgroundColor: sobRisco ? "rgba(255, 59, 48, 0.15)" : "rgba(16, 185, 129, 0.15)",
              color: sobRisco ? "var(--sinal)" : "var(--sucesso)",
              border: `1px solid ${sobRisco ? "rgba(255, 59, 48, 0.4)" : "rgba(16, 185, 129, 0.4)"}`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: sobRisco ? "var(--sinal)" : "var(--sucesso)",
                boxShadow: sobRisco ? "0 0 8px var(--sinal)" : "0 0 8px var(--sucesso)",
              }}
            />
            {sobRisco ? "EM RISCO" : "CALIBRADO"}
          </span>
        </div>
      </div>

      {/* Primary Value Display & Target Comparison - Números Grandes e Claros */}
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <div className="flex items-baseline gap-2.5">
          <span
            className="text-[32px] md:text-[36px] font-black tracking-tight leading-none"
            style={{ color: sobRisco ? "var(--sinal)" : "var(--tinta)" }}
          >
            {valorFormatado}
          </span>
          <span
            className="text-[13px] md:text-[14px] font-bold"
            style={{
              color: sobRisco ? "var(--sinal)" : "var(--tinta-sub)",
            }}
          >
            ({deltaFormatado} vs meta)
          </span>
        </div>

        <div className="text-right">
          <span className="text-[12px] md:text-[13px] font-medium text-[var(--tinta-sub)]">
            Alvo: <strong className="text-[13px] md:text-[14px] font-extrabold text-[var(--tinta)]">{metaFormatada}</strong>
          </span>
        </div>
      </div>

      {/* Modern Precision Capsule Track - Barra Mais Espessa e Visível à Distância */}
      <div className="relative pt-1 pb-1">
        {/* The Track Container (14px de altura para alta visibilidade) */}
        <div
          className="w-full h-3.5 rounded-full relative overflow-visible shadow-inner"
          style={{
            backgroundColor: "var(--panel-elevated)",
            border: "1px solid var(--linha-forte)",
          }}
        >
          {/* Shaded Calibrated Tolerance Range */}
          <div
            className="absolute top-0 bottom-0 rounded-full pointer-events-none transition-all duration-300"
            style={{
              left: `${tolMinPct}%`,
              width: `${larguraTolPct}%`,
              backgroundColor: sobRisco ? "rgba(255, 59, 48, 0.2)" : "rgba(16, 185, 129, 0.2)",
              borderLeft: `2px solid ${sobRisco ? "var(--sinal)" : "var(--sucesso)"}`,
              borderRight: `2px solid ${sobRisco ? "var(--sinal)" : "var(--sucesso)"}`,
            }}
            title={`Zona Calibrada: ${toleranciaMin ?? meta}${unidade} a ${toleranciaMax ?? max}${unidade}`}
          />

          {/* Active Fill Gradient Capsule */}
          <div
            className="h-full rounded-full transition-all duration-500 ease-out relative"
            style={{
              width: `${pctValor}%`,
              background: sobRisco
                ? "linear-gradient(90deg, rgba(255, 59, 48, 0.7) 0%, #FF3B30 100%)"
                : "linear-gradient(90deg, #64748B 0%, var(--tinta) 100%)",
              boxShadow: sobRisco ? "0 0 12px rgba(255, 59, 48, 0.5)" : "none",
            }}
          />

          {/* Calibrated Target Needle (Pino Fixo) */}
          <div
            className="absolute top-[-5px] -translate-x-1/2 flex flex-col items-center pointer-events-none z-10"
            style={{ left: `${pctMeta}%` }}
            title={`Alvo Calibrado: ${metaFormatada}`}
          >
            <div
              className="w-2 h-2 rounded-full border shadow-sm"
              style={{
                backgroundColor: "var(--tinta-sub)",
                borderColor: "var(--panel)",
              }}
            />
            <div
              className="w-[2px] h-5"
              style={{
                backgroundColor: "var(--tinta-sub)",
              }}
            />
          </div>

          {/* Active Cursor Needle Bead (Esfera Luminous Móvel) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-500 ease-out"
            style={{ left: `${pctValor}%` }}
          >
            <div
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center shadow-lg"
              style={{
                backgroundColor: sobRisco ? "var(--sinal)" : "var(--tinta)",
                borderColor: "var(--panel)",
                boxShadow: sobRisco
                  ? "0 0 12px var(--sinal), 0 2px 5px rgba(0,0,0,0.4)"
                  : "0 0 8px rgba(0,0,0,0.25), 0 2px 5px rgba(0,0,0,0.3)",
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--panel)]" />
            </div>
          </div>
        </div>

        {/* Clean Numerical Scale - Números de 11px em Negrito Legíveis */}
        <div className="relative w-full h-5 mt-2">
          {ticks.map((t) => {
            const pct = ((t - min) / (max - min)) * 100;
            return (
              <span
                key={t}
                className="absolute text-[11px] md:text-[12px] font-bold -translate-x-1/2 text-[var(--tinta-sub)]"
                style={{ left: `${pct}%` }}
              >
                {t}
                {t === max && unidade ? unidade : ""}
              </span>
            );
          })}
        </div>
      </div>

      {/* Footer Info - Texto Claro de 12px */}
      <div
        className="flex items-center justify-between pt-2.5 mt-1 text-[12px] font-medium"
        style={{ borderTop: "1px solid var(--linha)", color: "var(--tinta-sub)" }}
      >
        <span className="flex items-center gap-1.5 font-semibold">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: sobRisco ? "var(--sinal)" : "var(--sucesso)" }}
          />
          <span>TOLERÂNCIA: ±{unidade === "%" ? "2.5%" : "0.0"}</span>
        </span>

        <span
          className="font-bold uppercase tracking-wide"
          style={{ color: sobRisco ? "var(--sinal)" : "var(--tinta-sub)" }}
        >
          {sobRisco ? "ATENÇÃO OPERACIONAL" : "PARÂMETRO SEGURO"}
        </span>
      </div>
    </div>
  );
}
