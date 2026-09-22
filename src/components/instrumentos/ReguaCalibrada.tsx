"use client";

import { useId } from "react";

// POLIMENTO visao-geral (2026-09-22) -- resumo do que mudou neste arquivo.
// Busque "POLIMENTO visao-geral" pra achar cada ponto; a versão anterior
// inteira está no commit e5e84b8 (reverter só este arquivo:
// `git checkout e5e84b8 -- src/components/instrumentos/ReguaCalibrada.tsx`
// e devolver a prop `codigo` nas chamadas em VisaoGeralClient.tsx).
//  1. Saiu o chip de código ("CAL · 01"): não carregava informação.
//  2. Números em pt-BR (vírgula decimal) e delta de % em pontos percentuais.
//  3. Rodapé mostrava "Tol: ±2.5%" fixo, que não batia com a faixa real;
//     agora mostra a faixa de tolerância passada por props.
//  4. Saíram os brilhos coloridos (glow) do cursor, da barra e dos pontos.
//  5. Tints de risco/sucesso seguem o tema (color-mix sobre --sinal/--sucesso)
//     em vez de rgba fixo do vermelho do tema escuro.
//  6. Primeiro e último número da escala não vazam mais pra fora do card.

export interface ReguaCalibradaProps {
  rotulo: string;
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
  // POLIMENTO visao-geral: novo. Antes o delta era sempre `${delta.toFixed(1)}${unidade}`,
  // o que dava "+201.0 vs meta" (sem R$) e "+1.0 un" pra contagem.
  formatoDelta?: (delta: number) => string;
  ticks?: number[];
  className?: string;
}

// POLIMENTO visao-geral: formatação pt-BR. Antes: toFixed(1) (ponto decimal).
function numero(v: number, casas = 1): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

// POLIMENTO visao-geral: tints derivados do tema. Antes: rgba(255, 59, 48, …) e
// rgba(16, 185, 129, …) fixos, que no tema claro não eram o --sinal (#E11D48).
const tint = (cor: string, pct: number) => `color-mix(in srgb, ${cor} ${pct}%, transparent)`;

export function ReguaCalibrada({
  rotulo,
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
  formatoDelta,
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

  const cor = sobRisco ? "var(--sinal)" : "var(--sucesso)";

  const valorFormatado = formatoValor ? formatoValor(valor) : `${numero(valor)}${unidade}`;
  const metaFormatada = formatoMeta ? formatoMeta(meta) : `${numero(meta)}${unidade}`;

  const delta = valor - meta;
  // POLIMENTO visao-geral: diferença entre duas porcentagens é ponto percentual
  // (23% vs 32% = -9 p.p.), não "%". Antes: "-9.0% vs meta".
  const deltaFormatado = formatoDelta
    ? formatoDelta(delta)
    : unidade === "%"
    ? `${delta > 0 ? "+" : ""}${numero(delta)} p.p.`
    : `${delta > 0 ? "+" : ""}${numero(delta)}${unidade}`;

  // POLIMENTO visao-geral: faixa real de tolerância. Antes: texto fixo
  // "Tol: ±2.5%" (ou "±0.0"), que não correspondia à faixa desenhada.
  const temFaixa = toleranciaMin !== undefined && toleranciaMax !== undefined && toleranciaMax > toleranciaMin;

  return (
    <div className={`flex flex-col font-sans group ${className}`} role="group" aria-labelledby={`${id}-lbl`}>
      {/* Linha 1: nome da métrica, linha inteira.
          POLIMENTO visao-geral: saiu o chip "CAL · 0X" que ocupava esta linha. */}
      <h4 id={`${id}-lbl`} className="text-[13px] font-bold text-[var(--tinta)] leading-snug mb-2" title={rotulo}>
        {rotulo}
      </h4>

      {/* Linha 2: valor à esquerda, status à direita.
          POLIMENTO visao-geral: o status desceu pra linha do valor (antes ficava no topo,
          ao lado do código) e "CALIBRADO"/"EM RISCO" virou "No alvo"/"Em risco". */}
      <div className="flex flex-wrap items-center justify-between gap-2 my-1">
        <span
          className="text-[28px] font-black tracking-tight leading-none whitespace-nowrap"
          style={{ color: sobRisco ? "var(--sinal)" : "var(--tinta)" }}
        >
          {valorFormatado}
        </span>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide uppercase shrink-0 whitespace-nowrap"
          style={{ backgroundColor: tint(cor, 12), color: cor, border: `1px solid ${tint(cor, 35)}` }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cor }} />
          {sobRisco ? "Em risco" : "No alvo"}
        </span>
      </div>

      {/* Linha 3: alvo e delta */}
      <div className="flex items-center justify-between gap-1 text-[11px] mt-1.5 mb-2.5">
        <span className="text-[var(--tinta-sub)] font-medium whitespace-nowrap">
          Alvo: <strong className="font-bold text-[var(--tinta)]">{metaFormatada}</strong>
        </span>

        <span className="font-extrabold px-1.5 py-0.5 rounded whitespace-nowrap" style={{ backgroundColor: tint(cor, 12), color: cor }}>
          {deltaFormatado} vs alvo
        </span>
      </div>

      {/* Linha 4: trilho */}
      <div className="relative pt-1 pb-1">
        <div
          className="w-full h-3 rounded-full relative overflow-visible shadow-inner"
          style={{ backgroundColor: "var(--panel-elevated)", border: "1px solid var(--linha-forte)" }}
        >
          {/* Faixa de tolerância */}
          <div
            className="absolute top-0 bottom-0 rounded-full pointer-events-none transition-all duration-300"
            style={{
              left: `${tolMinPct}%`,
              width: `${larguraTolPct}%`,
              backgroundColor: tint(cor, 20),
              borderLeft: `2px solid ${cor}`,
              borderRight: `2px solid ${cor}`,
            }}
          />

          {/* Preenchimento. POLIMENTO visao-geral: sem glow; antes boxShadow "0 0 10px rgba(255,59,48,0.4)". */}
          <div
            className="h-full rounded-full transition-all duration-500 ease-out relative"
            style={{
              width: `${pctValor}%`,
              background: sobRisco
                ? "linear-gradient(90deg, color-mix(in srgb, var(--sinal) 70%, transparent) 0%, var(--sinal) 100%)"
                : "linear-gradient(90deg, #64748B 0%, var(--tinta) 100%)",
            }}
          />

          {/* Pino do alvo */}
          <div
            className="absolute top-[-4px] -translate-x-1/2 flex flex-col items-center pointer-events-none z-10"
            style={{ left: `${pctMeta}%` }}
            title={`Alvo: ${metaFormatada}`}
          >
            <div className="w-1.5 h-1.5 rounded-full border" style={{ backgroundColor: "var(--tinta-sub)", borderColor: "var(--panel)" }} />
            <div className="w-[1.5px] h-4" style={{ backgroundColor: "var(--tinta-sub)" }} />
          </div>

          {/* Cursor do valor. POLIMENTO visao-geral: só sombra de profundidade; antes tinha halo vermelho "0 0 10px var(--sinal)". */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-500 ease-out"
            style={{ left: `${pctValor}%` }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
              style={{
                backgroundColor: sobRisco ? "var(--sinal)" : "var(--tinta)",
                borderColor: "var(--panel)",
                boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
              }}
            >
              <div className="w-1 h-1 rounded-full bg-[var(--panel)]" />
            </div>
          </div>
        </div>

        {/* Linha 5: escala.
            POLIMENTO visao-geral: primeiro número alinha à esquerda e o último à
            direita (antes todos centralizados, e "50%" vazava do card); a unidade
            só vai no último número quando é "%" (antes " un" quebrava linha). */}
        <div className="relative w-full h-4 mt-2">
          {ticks.map((t, i) => {
            const pct = ((t - min) / (max - min)) * 100;
            const ancora = i === 0 ? "" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2";
            return (
              <span key={t} className={`absolute text-[11px] font-bold text-[var(--tinta-sub)] ${ancora}`} style={{ left: `${pct}%` }}>
                {t.toLocaleString("pt-BR")}
                {t === max && unidade === "%" ? "%" : ""}
              </span>
            );
          })}
        </div>
      </div>

      {/* Linha 6: faixa aceitável.
          POLIMENTO visao-geral: antes "Tol: ±2.5%" fixo + "CALIBRAÇÃO OK"/"DESVIO DE ALVO",
          que repetia o status do topo. Sem faixa definida, o rodapé some. */}
      {temFaixa && (
        <div className="pt-2 mt-1 text-[11px] font-medium" style={{ borderTop: "1px solid var(--linha)", color: "var(--tinta-sub)" }}>
          Faixa aceitável: {numero(toleranciaMin!, 0)}–{numero(toleranciaMax!, 0)}
          {unidade}
        </div>
      )}
    </div>
  );
}
