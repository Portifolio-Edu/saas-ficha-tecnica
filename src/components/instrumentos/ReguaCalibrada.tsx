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
      {/* Linha 1: Badges de Topo (Código à esquerda, Status à direita - Sem sobreposição!) */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        {codigo ? (
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0"
            style={{
              backgroundColor: sobRisco ? "rgba(255, 59, 48, 0.12)" : "var(--panel-elevated)",
              color: sobRisco ? "var(--sinal)" : "var(--tinta-sub)",
              border: `1px solid ${sobRisco ? "rgba(255, 59, 48, 0.3)" : "var(--linha-forte)"}`,
            }}
          >
            {codigo}
          </span>
        ) : <span />}

        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide uppercase shadow-sm shrink-0"
          style={{
            backgroundColor: sobRisco ? "rgba(255, 59, 48, 0.12)" : "rgba(16, 185, 129, 0.12)",
            color: sobRisco ? "var(--sinal)" : "var(--sucesso)",
            border: `1px solid ${sobRisco ? "rgba(255, 59, 48, 0.35)" : "rgba(16, 185, 129, 0.35)"}`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              backgroundColor: sobRisco ? "var(--sinal)" : "var(--sucesso)",
              boxShadow: sobRisco ? "0 0 6px var(--sinal)" : "0 0 6px var(--sucesso)",
            }}
          />
          {sobRisco ? "EM RISCO" : "CALIBRADO"}
        </span>
      </div>

      {/* Linha 2: Nome da Métrica (Linha inteira dedicada, clara e sem colisão) */}
      <h4
        id={`${id}-lbl`}
        className="text-[13px] font-bold text-[var(--tinta)] truncate mb-1"
        title={rotulo}
      >
        {rotulo}
      </h4>

      {/* Linha 3: Valor Principal Gigante e Limpo (Totalmente isolado, NUNCA sobrepõe!) */}
      <div className="my-1">
        <span
          className="text-[28px] font-black tracking-tight leading-none whitespace-nowrap"
          style={{ color: sobRisco ? "var(--sinal)" : "var(--tinta)" }}
        >
          {valorFormatado}
        </span>
      </div>

      {/* Linha 4: Comparação de Alvo & Delta com Espaçamento Garantido (Zero Sobreposição) */}
      <div className="flex items-center justify-between gap-1 text-[11px] mb-2.5">
        <span className="text-[var(--tinta-sub)] font-medium whitespace-nowrap">
          Alvo: <strong className="font-bold text-[var(--tinta)]">{metaFormatada}</strong>
        </span>

        <span
          className="font-extrabold px-1.5 py-0.5 rounded whitespace-nowrap"
          style={{
            backgroundColor: sobRisco ? "rgba(255, 59, 48, 0.12)" : "rgba(16, 185, 129, 0.12)",
            color: sobRisco ? "var(--sinal)" : "var(--sucesso)",
          }}
        >
          {deltaFormatado} vs meta
        </span>
      </div>

      {/* Linha 4: Dispositivo Gráfico Central (Trilho Cápsula com Margem de Segurança) */}
      <div className="relative pt-1 pb-1">
        {/* The Track Container */}
        <div
          className="w-full h-3 rounded-full relative overflow-visible shadow-inner"
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
              boxShadow: sobRisco ? "0 0 10px rgba(255, 59, 48, 0.4)" : "none",
            }}
          />

          {/* Calibrated Target Needle (Pino Fixo) */}
          <div
            className="absolute top-[-4px] -translate-x-1/2 flex flex-col items-center pointer-events-none z-10"
            style={{ left: `${pctMeta}%` }}
            title={`Alvo Calibrado: ${metaFormatada}`}
          >
            <div
              className="w-1.5 h-1.5 rounded-full border shadow-sm"
              style={{
                backgroundColor: "var(--tinta-sub)",
                borderColor: "var(--panel)",
              }}
            />
            <div
              className="w-[1.5px] h-4"
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
              className="w-4 h-4 rounded-full border-2 flex items-center justify-center shadow-md"
              style={{
                backgroundColor: sobRisco ? "var(--sinal)" : "var(--tinta)",
                borderColor: "var(--panel)",
                boxShadow: sobRisco
                  ? "0 0 10px var(--sinal), 0 2px 4px rgba(0,0,0,0.3)"
                  : "0 0 6px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.25)",
              }}
            >
              <div className="w-1 h-1 rounded-full bg-[var(--panel)]" />
            </div>
          </div>
        </div>

        {/* Linha 5: Escala Numérica com Números Claros */}
        <div className="relative w-full h-4 mt-2">
          {ticks.map((t) => {
            const pct = ((t - min) / (max - min)) * 100;
            return (
              <span
                key={t}
                className="absolute text-[11px] font-bold -translate-x-1/2 text-[var(--tinta-sub)]"
                style={{ left: `${pct}%` }}
              >
                {t}
                {t === max && unidade ? unidade : ""}
              </span>
            );
          })}
        </div>
      </div>

      {/* Linha 6: Rodapé Informativo Compacto (Zero Quebra de Linhas) */}
      <div
        className="flex items-center justify-between pt-2 mt-1 text-[11px]"
        style={{ borderTop: "1px solid var(--linha)", color: "var(--tinta-sub)" }}
      >
        <span className="flex items-center gap-1.5 font-medium whitespace-nowrap text-[10.5px]">
          <span
            className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
            style={{ backgroundColor: sobRisco ? "var(--sinal)" : "var(--sucesso)" }}
          />
          <span>Tol: ±{unidade === "%" ? "2.5%" : "0.0"}</span>
        </span>

        <span
          className="font-extrabold uppercase tracking-wide whitespace-nowrap text-[10px]"
          style={{ color: sobRisco ? "var(--sinal)" : "var(--sucesso)" }}
        >
          {sobRisco ? "DESVIO DE ALVO" : "CALIBRAÇÃO OK"}
        </span>
      </div>
    </div>
  );
}
