"use client";

// POLIMENTO visao-geral (2026-09-22) -- resumo do que mudou neste arquivo.
// Versão anterior no commit e5e84b8 (reverter só este arquivo:
// `git checkout e5e84b8 -- src/components/instrumentos/MostradorNivel.tsx`
// e devolver a prop `estacaoNumero` nas chamadas em VisaoGeralClient.tsx).
//  1. Saiu o chip "EST · 0X" (prop estacaoNumero): numeração sem informação.
//  2. Status não quebra mais em duas linhas (whitespace-nowrap).
//  3. Segmentos sem glow; antes "0 0 6px rgba(255,255,255,0.3)" (branco no tema claro).
//  4. Escala "100% (Capacidade Máxima)" virou "100%"; "Nível de carga" virou "Carga".
//  5. Tints seguem o tema (color-mix) em vez de rgba fixo.
//  6. Barra ganhou role="meter" pra leitor de tela ler "3 de 10".

export interface MostradorNivelProps {
  rotulo: string;
  totalLotes: number;
  capacidadeMax: number;
  statusTexto?: string;
  emRisco?: boolean;
}

const tint = (cor: string, pct: number) => `color-mix(in srgb, ${cor} ${pct}%, transparent)`;

export function MostradorNivel({
  rotulo,
  totalLotes,
  capacidadeMax,
  statusTexto = "OPERANDO",
  emRisco = false,
}: MostradorNivelProps) {
  const percentual = Math.min(100, Math.round((totalLotes / capacidadeMax) * 100));
  const totalSegmentos = 10;
  const segmentosAtivos = Math.round((percentual / 100) * totalSegmentos);

  const corStatus = emRisco ? "var(--sinal)" : "var(--sucesso)";
  const corAtiva = emRisco ? "var(--sinal)" : "var(--tinta)";

  return (
    <div
      className="p-5 rounded-2xl border flex flex-col font-sans transition-all duration-200 hover:border-[var(--linha-forte)]"
      style={{ borderColor: "var(--linha)", backgroundColor: "var(--panel)", boxShadow: "var(--shadow-card)" }}
    >
      {/* Cabeçalho da estação */}
      <div className="flex items-center justify-between gap-3 pb-3.5 mb-3.5 border-b" style={{ borderColor: "var(--linha)" }}>
        <span className="text-[15px] font-bold tracking-tight text-[var(--tinta)]">{rotulo}</span>

        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide whitespace-nowrap shrink-0"
          style={{ backgroundColor: tint(corStatus, 14), color: corStatus, border: `1px solid ${tint(corStatus, 35)}` }}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: corStatus }} />
          {statusTexto}
        </span>
      </div>

      {/* Visor de carga */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3 text-[13px]">
          <span className="font-semibold uppercase tracking-wider text-[var(--tinta-sub)]">Carga</span>
          <span className="text-[16px] font-black whitespace-nowrap" style={{ color: corAtiva }}>
            {totalLotes} / {capacidadeMax} lotes · {percentual}%
          </span>
        </div>

        <div
          className="grid grid-cols-10 gap-2 h-4 p-1 rounded-xl bg-[var(--panel-elevated)] border border-[var(--linha-forte)]"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={capacidadeMax}
          aria-valuenow={totalLotes}
          aria-label={`Carga de ${rotulo}`}
        >
          {Array.from({ length: totalSegmentos }).map((_, i) => {
            const preenchido = i < segmentosAtivos;
            return (
              <div
                key={i}
                className="h-full rounded-sm transition-all duration-300"
                style={{
                  backgroundColor: preenchido ? corAtiva : "transparent",
                  opacity: preenchido ? 1 : 0.12,
                  border: `1px solid ${preenchido ? corAtiva : "var(--linha)"}`,
                }}
              />
            );
          })}
        </div>

        <div className="flex justify-between text-[11px] font-semibold text-[var(--tinta-sub)] pt-0.5">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}
