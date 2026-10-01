"use client";

// ESCALAS (2026-09-26): grade do mês (gestão). Uma linha por pessoa,
// agrupada por equipe (setor + cargo); uma coluna por dia. Sexta e sábado
// marcados como pico; hoje com destaque; embaixo de cada equipe, quantos
// trabalham no dia (vermelho quando fica abaixo do mínimo). Tocar num dia
// abre o detalhe (motivo do ajuste, alertas, ações).
// Largura: no desktop (≥1280px) o mês inteiro cabe sem rolar; em tela menor
// a grade rola de lado e já abre com o dia de hoje à vista.

import { Fragment, useEffect, useRef } from "react";
import { rotuloData } from "@/lib/escalas/datas";
import { chaveEquipe } from "@/lib/escalas/motor";
import type { DataISO, DiaEscala, FuncionarioEscala } from "@/lib/escalas/tipos";
import { ESTILO, SIGLA_DIA, diaSemanaDe, ehPico, rotuloEquipe, tint } from "./visual";

const NOMES_FOLGA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function resumoRegime(f: FuncionarioEscala): string {
  const e = f.escala;
  if (e.tipo === "12x36" || e.tipo === "24x48") return e.tipo;
  const folgas = e.folgasPreferidas?.length ? ` · folga ${e.folgasPreferidas.map((d) => NOMES_FOLGA[d]).join(" e ")}` : "";
  return `${e.tipo}${folgas}`;
}

export function GradeEscala({
  funcionarios,
  porFuncionario,
  dias,
  hoje,
  coberturaMinima,
  selecionado,
  onSelecionar,
}: {
  funcionarios: FuncionarioEscala[];
  porFuncionario: Record<string, DiaEscala[]>;
  dias: DataISO[];
  hoje: DataISO;
  coberturaMinima: Record<string, number>;
  selecionado: { pessoaId: string; data: DataISO } | null;
  onSelecionar: (s: { pessoaId: string; data: DataISO }) => void;
}) {
  const equipes = new Map<string, FuncionarioEscala[]>();
  for (const f of [...funcionarios].sort((a, b) => a.setor.localeCompare(b.setor) || a.cargo.localeCompare(b.cargo) || a.nome.localeCompare(b.nome))) {
    const k = chaveEquipe(f);
    equipes.set(k, [...(equipes.get(k) ?? []), f]);
  }

  const rolagem = useRef<HTMLDivElement>(null);
  const primeiroDia = dias[0];
  useEffect(() => {
    const c = rolagem.current;
    const th = c?.querySelector<HTMLElement>("[data-hoje]");
    if (!c || !th || c.scrollWidth <= c.clientWidth) return;
    const colunaNomes = c.querySelector<HTMLElement>("thead th")?.offsetWidth ?? 0;
    c.scrollLeft = Math.max(0, th.offsetLeft - colunaNomes - 3 * th.offsetWidth);
  }, [primeiroDia, hoje]);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "var(--panel)", borderColor: "var(--linha)" }}>
      <div tabIndex={0} role="region" aria-label="Escala da equipe" ref={rolagem} className="overflow-x-auto overscroll-x-contain">
        <table className="w-full border-separate" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-20 text-left px-3 py-2 text-[12px] font-medium text-[var(--tinta-faint)] w-[128px] min-w-[128px] sm:w-[176px] sm:min-w-[176px] border-b"
                style={{ background: "var(--panel)", borderColor: "var(--linha)" }}
              >
                Pessoa
              </th>
              {dias.map((d) => {
                const w = diaSemanaDe(d);
                const pico = ehPico(d);
                const eHoje = d === hoje;
                return (
                  <th
                    key={d}
                    scope="col"
                    data-hoje={eHoje || undefined}
                    className="px-0 py-1.5 border-b text-center min-w-[31px]"
                    style={{ borderColor: pico ? tint("var(--etapa-producao)", 55) : "var(--linha)", background: pico ? tint("var(--etapa-producao)", 7) : undefined }}
                    title={pico ? "Sexta e sábado: dia de pico, ninguém de cozinha, salão e bar folga" : undefined}
                  >
                    <div className="text-[11px] font-medium" style={{ color: pico ? "var(--etapa-producao-texto)" : w === 0 ? "var(--etapa-produzido-texto)" : "var(--tinta-faint)" }}>
                      {SIGLA_DIA[w]}
                    </div>
                    <div
                      className="mx-auto mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold tabular-nums"
                      style={eHoje ? { background: "var(--tinta)", color: "var(--panel)" } : { color: "var(--tinta)" }}
                    >
                      {Number(d.slice(8, 10))}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {[...equipes.entries()].map(([equipe, membros]) => {
              const minimo = coberturaMinima[equipe] ?? 0;
              return (
                <Fragment key={equipe}>
                  <tr>
                    <th scope="rowgroup" colSpan={dias.length + 1} className="text-left pt-3.5 pb-1.5 font-normal">
                      <span className="sticky left-0 inline-block px-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--tinta-sub)] whitespace-nowrap" style={{ background: "var(--panel)" }}>
                        {rotuloEquipe(equipe)}
                        {minimo > 0 && <span className="ml-2 normal-case tracking-normal font-normal text-[var(--tinta-faint)]">mín. {minimo}/dia</span>}
                      </span>
                    </th>
                  </tr>
                  {membros.map((f) => (
                    <tr key={f.id}>
                      <th
                        scope="row"
                        className="sticky left-0 z-10 text-left px-3 py-1 font-normal"
                        style={{ background: "var(--panel)" }}
                      >
                        <div className="text-[14px] font-medium text-[var(--tinta)] truncate max-w-[108px] sm:max-w-[152px]">{f.nome}</div>
                        <div className="text-[12px] text-[var(--tinta-faint)] truncate max-w-[108px] sm:max-w-[152px]">{resumoRegime(f)}</div>
                      </th>
                      {(porFuncionario[f.id] ?? []).map((d) => {
                        const e = ESTILO[d.situacao];
                        const sel = selecionado?.pessoaId === f.id && selecionado.data === d.data;
                        const pico = ehPico(d.data);
                        return (
                          <td key={d.data} className="px-px py-0.5 text-center" style={{ background: pico ? tint("var(--etapa-producao)", 4) : undefined }}>
                            <button
                              type="button"
                              onClick={() => onSelecionar({ pessoaId: f.id, data: d.data })}
                              aria-label={`${f.nome}, ${rotuloData(d.data)}: ${e.rotulo}${d.ajuste ? `. ${d.ajuste}` : ""}`}
                              aria-pressed={sel}
                              className="relative mx-auto w-full min-w-[27px] max-w-[34px] h-[30px] rounded-md text-[11px] font-semibold flex items-center justify-center transition-shadow"
                              style={{
                                background: e.fundo,
                                color: e.texto,
                                border: d.situacao === "fora_do_contrato" ? "1px dashed var(--linha)" : "1px solid transparent",
                                boxShadow: sel ? "0 0 0 2px var(--tinta)" : undefined,
                              }}
                            >
                              {e.sigla}
                              {d.ajuste && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: "var(--etapa-producao)" }} aria-hidden />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className="sticky left-0 z-10 text-left px-3 pt-1 pb-3 text-[12px] font-medium text-[var(--tinta-faint)] border-b" style={{ background: "var(--panel)", borderColor: "var(--linha)" }}>
                      Trabalhando
                    </th>
                    {dias.map((d, i) => {
                      const n = membros.filter((m) => porFuncionario[m.id]?.[i]?.situacao === "trabalho").length;
                      const abaixo = minimo > 0 && n < minimo;
                      return (
                        <td key={d} className="pt-1 pb-3 text-center border-b text-[12px] font-semibold tabular-nums" style={{ borderColor: "var(--linha)", color: abaixo ? "var(--etapa-perda-texto)" : "var(--tinta-sub)", background: abaixo ? tint("var(--etapa-perda)", 10) : undefined }}>
                          {n}
                        </td>
                      );
                    })}
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LegendaEscala({ situacoes = ["trabalho", "folga", "folga_domingo", "folga_compensatoria", "ferias", "falta", "atestado", "afastado"] as const }: { situacoes?: readonly (keyof typeof ESTILO)[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[var(--tinta-sub)]">
      {situacoes.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span className="w-5 h-5 rounded text-[10px] font-semibold flex items-center justify-center" style={{ background: ESTILO[s].fundo, color: ESTILO[s].texto }}>
            {ESTILO[s].sigla}
          </span>
          {ESTILO[s].rotulo}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="relative w-5 h-5 rounded" style={{ background: ESTILO.trabalho.fundo }}>
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: "var(--etapa-producao)" }} />
        </span>
        Ajustado pelo motor
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-5 h-5 rounded" style={{ background: tint("var(--etapa-producao)", 14) }} />
        Sexta e sábado (pico)
      </span>
    </div>
  );
}
