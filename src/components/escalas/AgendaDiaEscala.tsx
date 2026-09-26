"use client";

// CELULAR (2026-09-26): a grade do mês (pessoa × dia) no celular vira
// quadradinhos de 30px ilegíveis. Aqui: escolhe o dia numa fita e vê, por
// equipe, quem trabalha (com o turno), quem folga e quem está fora — e se a
// equipe fica abaixo do mínimo. Tocar na pessoa abre o mesmo detalhe da grade.
// A grade continua no computador (EscalasView mostra um ou outro).

import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { chaveEquipe } from "@/lib/escalas/motor";
import type { DataISO, DiaEscala, FuncionarioEscala } from "@/lib/escalas/tipos";
import { ESTILO, NOME_DIA_CURTO, diaSemanaDe, ehPico, rotuloEquipe, tint } from "./visual";

const NOME_DIA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function turnoTexto(f: FuncionarioEscala): string | null {
  const t = f.escala.turno;
  if (!t?.inicio || !t?.fim) return null;
  const h = (x: string) => {
    const [hh, mm] = x.split(":");
    return mm === "00" ? `${Number(hh)}h` : `${Number(hh)}h${mm}`;
  };
  return `${h(t.inicio)}–${h(t.fim)}`;
}

export function AgendaDiaEscala({
  funcionarios,
  porFuncionario,
  dias,
  hoje,
  coberturaMinima,
  selecionado = null,
  detalhe = null,
  onSelecionar,
}: {
  funcionarios: FuncionarioEscala[];
  porFuncionario: Record<string, DiaEscala[]>;
  dias: DataISO[];
  hoje: DataISO;
  coberturaMinima: Record<string, number>;
  /** Pessoa/dia tocado: o `detalhe` (ações do dia) abre logo abaixo dela. */
  selecionado?: { pessoaId: string; data: DataISO } | null;
  detalhe?: React.ReactNode;
  onSelecionar: (s: { pessoaId: string; data: DataISO }) => void;
}) {
  const inicial = dias.includes(hoje) ? hoje : dias[0];
  const [dia, setDia] = useState<DataISO>(inicial);
  const fita = useRef<HTMLDivElement>(null);

  // Trocou o mês: volta pra hoje (se estiver nele) ou pro dia 1.
  useEffect(() => setDia(dias.includes(hoje) ? hoje : dias[0]), [dias, hoje]);
  useEffect(() => {
    fita.current?.querySelector<HTMLElement>(`[data-dia="${dia}"]`)?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [dia]);

  const i = dias.indexOf(dia);
  const equipes = new Map<string, FuncionarioEscala[]>();
  for (const f of [...funcionarios].sort((a, b) => a.setor.localeCompare(b.setor) || a.cargo.localeCompare(b.cargo) || a.nome.localeCompare(b.nome))) {
    const k = chaveEquipe(f);
    equipes.set(k, [...(equipes.get(k) ?? []), f]);
  }
  const w = diaSemanaDe(dia);
  const [, mes, d] = dia.split("-");

  return (
    <div className="space-y-3">
      <div ref={fita} role="tablist" aria-label="Dia" className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1 snap-x">
        {dias.map((x) => {
          const ativo = x === dia;
          const pico = ehPico(x);
          const eHoje = x === hoje;
          return (
            <button
              key={x}
              role="tab"
              data-dia={x}
              aria-selected={ativo}
              aria-label={`${NOME_DIA[diaSemanaDe(x)]}, ${Number(x.slice(8, 10))}${eHoje ? " (hoje)" : ""}`}
              onClick={() => setDia(x)}
              className="snap-center shrink-0 w-12 min-h-14 rounded-xl border flex flex-col items-center justify-center"
              style={{
                borderColor: ativo ? "var(--tinta)" : eHoje ? "var(--marca)" : "var(--linha)",
                background: ativo ? "var(--tinta)" : pico ? tint("var(--etapa-producao)", 8) : "var(--panel)",
                color: ativo ? "var(--panel)" : "var(--tinta)",
              }}
            >
              <span className="text-[11.5px]" style={{ color: ativo ? "var(--panel)" : pico ? "var(--etapa-producao-texto)" : "var(--tinta-faint)" }}>
                {NOME_DIA_CURTO[diaSemanaDe(x)]}
              </span>
              <span className="text-[16px] font-semibold tabular-nums">{Number(x.slice(8, 10))}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[17px] font-semibold text-[var(--tinta)]">
          {dia === hoje ? `Hoje, ${NOME_DIA[w]}` : NOME_DIA[w][0].toUpperCase() + NOME_DIA[w].slice(1)} {d}/{mes}
        </h3>
        {ehPico(dia) && <span className="text-[12.5px] font-medium" style={{ color: "var(--etapa-producao-texto)" }}>dia de pico</span>}
      </div>

      {[...equipes.entries()].map(([equipe, membros]) => {
        const doDia = membros
          .map((f) => ({ f, d: porFuncionario[f.id]?.[i] }))
          .filter((x): x is { f: FuncionarioEscala; d: DiaEscala } => !!x.d && x.d.situacao !== "fora_do_contrato");
        if (doDia.length === 0) return null;
        const trabalhando = doDia.filter((x) => x.d.situacao === "trabalho");
        const minimo = coberturaMinima[equipe] ?? 0;
        const abaixo = minimo > 0 && trabalhando.length < minimo;
        const ordenados = [...trabalhando, ...doDia.filter((x) => x.d.situacao !== "trabalho")];
        return (
          <section key={equipe} aria-label={rotuloEquipe(equipe)} className="rounded-xl border overflow-hidden" style={{ borderColor: abaixo ? tint("var(--etapa-perda)", 45) : "var(--linha)", background: "var(--panel)" }}>
            <div className="px-4 py-2.5 flex items-center justify-between gap-2 border-b" style={{ borderColor: "var(--linha)", background: abaixo ? tint("var(--etapa-perda)", 8) : undefined }}>
              <span className="min-w-0 text-[13px] font-semibold uppercase tracking-wide text-[var(--tinta-sub)]">{rotuloEquipe(equipe)}</span>
              <span className="shrink-0 whitespace-nowrap text-[13px] font-medium tabular-nums" style={{ color: abaixo ? "var(--etapa-perda-texto)" : "var(--tinta-sub)" }}>
                {trabalhando.length} trabalhando{minimo > 0 ? ` · mín. ${minimo}` : ""}
              </span>
            </div>
            <ul>
              {ordenados.map(({ f, d: dd }) => {
                const e = ESTILO[dd.situacao];
                const turno = dd.situacao === "trabalho" ? turnoTexto(f) : null;
                const aberto = selecionado?.pessoaId === f.id && selecionado.data === dia;
                return (
                  <li key={f.id} className="border-t first:border-t-0" style={{ borderColor: "var(--linha)" }}>
                    <button
                      type="button"
                      aria-expanded={aberto}
                      onClick={() => onSelecionar({ pessoaId: f.id, data: dia })}
                      className="w-full px-4 py-3 min-h-14 flex items-center gap-3 text-left active:bg-[var(--panel-hover)]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-medium text-[var(--tinta)] truncate">{f.nome}</div>
                        {dd.ajuste && <div className="text-[12.5px] text-[var(--tinta-sub)] truncate">{dd.ajuste}</div>}
                      </div>
                      <span className="shrink-0 text-[13px] font-semibold px-2.5 py-1 rounded-md" style={{ background: e.fundo, color: e.texto }}>
                        {turno ?? e.rotulo}
                      </span>
                      <ChevronRight size={16} className={`shrink-0 text-[var(--tinta-faint)] transition-transform ${aberto ? "rotate-90" : ""}`} aria-hidden />
                    </button>
                    {aberto && detalhe && <div className="px-3 pb-3">{detalhe}</div>}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
