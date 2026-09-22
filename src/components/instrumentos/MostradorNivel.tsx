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
// SISTEMA premium (2026-09-22): cantos de 12px, selo em retângulo e caixa normal,
// pesos 500–600, rótulo "Carga" sem caixa alta, sombra de 1px. Versão anterior:
// `git show 32e3e97:src/components/instrumentos/MostradorNivel.tsx`.

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
      className="p-5 rounded-xl border flex flex-col transition-colors duration-150"
      style={{ borderColor: "var(--linha)", backgroundColor: "var(--panel)", boxShadow: "var(--shadow-card)" }}
    >
      {/* Cabeçalho da estação */}
      <div className="flex items-center justify-between gap-3 pb-3.5 mb-3.5 border-b" style={{ borderColor: "var(--linha)" }}>
        <span className="text-[14px] font-medium text-[var(--tinta)]">{rotulo}</span>

        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[12px] font-medium whitespace-nowrap shrink-0"
          style={{ backgroundColor: tint(corStatus, 10), color: corStatus }}
        >
          {statusTexto}
        </span>
      </div>

      {/* Visor de carga */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3 text-[13px]">
          <span className="text-[var(--tinta-sub)]">Carga</span>
          <span className="text-[15px] font-semibold whitespace-nowrap" style={{ color: corAtiva }}>
            {totalLotes} / {capacidadeMax} lotes · {percentual}%
          </span>
        </div>

        <div
          className="grid grid-cols-10 gap-1 h-2"
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
                className="h-full rounded-[2px] transition-colors duration-300"
                style={{ backgroundColor: preenchido ? corAtiva : "var(--panel-elevated)" }}
              />
            );
          })}
        </div>

        <div className="flex justify-between text-[12px] text-[var(--tinta-faint)]">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}
