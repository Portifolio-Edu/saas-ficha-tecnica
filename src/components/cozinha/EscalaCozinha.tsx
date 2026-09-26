"use client";

// ESCALAS (2026-09-26): aba Escala do modo cozinha. SÓ LEITURA: não há
// nenhum botão que altere a escala (o banco também não deixa). Mostra quem
// trabalha hoje, quem folga, e a semana de cada um. Ausências aparecem como
// "Ausente", sem motivo (falta, atestado e afastamento são da gestão).

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import type { EscalaPublica, PessoaPublica, SituacaoPublica } from "@/lib/escalas/publica";
import type { DataISO } from "@/lib/escalas/tipos";
import { paraDia } from "@/lib/escalas/datas";
import { ESTILO, NOME_DIA_CURTO, ROTULO_SETOR, diaMes, diaSemanaDe, ehPico, rotuloEquipe, segundaDaSemana, somarDias, tint } from "@/components/escalas/visual";

const VISUAL: Record<SituacaoPublica, { rotulo: string; fundo: string; texto: string }> = {
  trabalho: { rotulo: "Trabalha", fundo: ESTILO.trabalho.fundo, texto: ESTILO.trabalho.texto },
  folga: { rotulo: "Folga", fundo: ESTILO.folga.fundo, texto: ESTILO.folga.texto },
  ferias: { rotulo: "Férias", fundo: ESTILO.ferias.fundo, texto: ESTILO.ferias.texto },
  ausente: { rotulo: "Ausente", fundo: ESTILO.ausente.fundo, texto: ESTILO.ausente.texto },
};

export function EscalaCozinha({ escala, hoje }: { escala: EscalaPublica | null; hoje: DataISO }) {
  if (!escala) {
    return (
      <section className="max-w-xl">
        <h1 className="text-[24px] font-semibold tracking-tight">Escala</h1>
        <p className="text-[16px] text-[var(--tinta-sub)] mt-2">A escala está em revisão pelo gestor. Confira com ele os seus horários.</p>
      </section>
    );
  }
  return <Grade escala={escala} hoje={hoje} />;
}

function Grade({ escala, hoje }: { escala: EscalaPublica; hoje: DataISO }) {
  const [semana, setSemana] = useState(() => segundaDaSemana(hoje));
  const [setor, setSetor] = useState<string>("todos");
  const i0 = paraDia(escala.inicio);
  const diaNoPeriodo = (d: DataISO, pessoaId: string) => escala.dias[pessoaId]?.[paraDia(d) - i0] ?? null;

  const setores = useMemo(() => Array.from(new Set(escala.pessoas.map((p) => p.setor))), [escala.pessoas]);
  const pessoas = escala.pessoas.filter((p) => setor === "todos" || p.setor === setor);
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(semana, i));
  const podeVoltar = paraDia(semana) > i0;
  const podeAvancar = paraDia(somarDias(semana, 7)) <= paraDia(escala.fim);

  const deHoje = (s: SituacaoPublica) => pessoas.filter((p) => diaNoPeriodo(hoje, p.id)?.situacao === s);
  const trabalhando = deHoje("trabalho");
  const folgando = deHoje("folga");
  const fora = [...deHoje("ferias"), ...deHoje("ausente")];

  const grupos = new Map<string, PessoaPublica[]>();
  for (const p of pessoas) grupos.set(p.equipe, [...(grupos.get(p.equipe) ?? []), p]);

  if (escala.pessoas.length === 0) {
    return (
      <section className="max-w-xl">
        <h1 className="text-[24px] font-semibold tracking-tight">Escala</h1>
        <p className="text-[16px] text-[var(--tinta-sub)] mt-2">A escala ainda não foi montada. O gestor monta em Escalas.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-[24px] font-semibold tracking-tight">Escala da equipe</h1>
        <p className="text-[14px] text-[var(--tinta-sub)] inline-flex items-center gap-1.5">
          <Lock size={14} /> Só o gestor altera a escala.
        </p>
      </div>

      {setores.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mt-4" role="radiogroup" aria-label="Setor">
          {["todos", ...setores].map((s) => (
            <button
              key={s}
              role="radio"
              aria-checked={setor === s}
              onClick={() => setSetor(s)}
              className="min-h-11 px-4 rounded-full border text-[15px] font-medium"
              style={setor === s ? { background: "var(--tinta)", color: "var(--panel)", borderColor: "var(--tinta)" } : { borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}
            >
              {s === "todos" ? "Todos" : ROTULO_SETOR[s]}
            </button>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-3 mt-4">
        <Resumo titulo={`Trabalham hoje (${trabalhando.length})`} cor="var(--etapa-estoque)" pessoas={trabalhando} turno />
        <Resumo titulo={`De folga hoje (${folgando.length})`} cor="var(--etapa-produzido)" pessoas={folgando} />
        <Resumo titulo={`Não vêm hoje (${fora.length})`} cor="var(--etapa-perda)" pessoas={fora} rotulo={(p) => VISUAL[diaNoPeriodo(hoje, p.id)!.situacao].rotulo} />
      </div>

      <div className="flex items-center gap-2 mt-6 mb-3">
        <h2 className="text-[18px] font-semibold flex-1">Semana</h2>
        <button onClick={() => setSemana(somarDias(semana, -7))} disabled={!podeVoltar} aria-label="Semana anterior" className="w-12 h-12 rounded-xl border flex items-center justify-center disabled:opacity-35" style={{ borderColor: "var(--linha-forte)" }}>
          <ChevronLeft size={22} />
        </button>
        <span className="min-w-[130px] text-center text-[15px] font-semibold tabular-nums" aria-live="polite">
          {diaMes(dias[0])} – {diaMes(dias[6])}
        </span>
        <button onClick={() => setSemana(somarDias(semana, 7))} disabled={!podeAvancar} aria-label="Próxima semana" className="w-12 h-12 rounded-xl border flex items-center justify-center disabled:opacity-35" style={{ borderColor: "var(--linha-forte)" }}>
          <ChevronRight size={22} />
        </button>
      </div>

      <div tabIndex={0} role="region" aria-label="Escala da equipe" className="rounded-xl border overflow-x-auto" style={{ borderColor: "var(--linha)", background: "var(--panel)" }}>
        <table className="w-full border-separate" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 text-left px-4 py-2.5 text-[13px] font-medium text-[var(--tinta-faint)] min-w-[150px] border-b" style={{ background: "var(--panel)", borderColor: "var(--linha)" }}>
                Pessoa
              </th>
              {dias.map((d) => (
                <th key={d} className="px-1 py-2 border-b text-center min-w-[92px]" style={{ borderColor: ehPico(d) ? tint("var(--etapa-producao)", 55) : "var(--linha)", background: d === hoje ? tint("var(--tinta)", 6) : ehPico(d) ? tint("var(--etapa-producao)", 7) : undefined }}>
                  <div className="text-[13px] font-semibold capitalize" style={{ color: ehPico(d) ? "var(--etapa-producao-texto)" : "var(--tinta)" }}>
                    {d === hoje ? "Hoje" : NOME_DIA_CURTO[diaSemanaDe(d)]}
                  </div>
                  <div className="text-[12px] text-[var(--tinta-faint)] tabular-nums">{diaMes(d)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...grupos.entries()].map(([equipe, membros]) => [
              <tr key={equipe}>
                <th colSpan={8} className="text-left px-4 pt-3 pb-1 text-[12px] font-semibold uppercase tracking-wide text-[var(--tinta-sub)]">
                  {rotuloEquipe(equipe)}
                </th>
              </tr>,
              ...membros.map((p) => (
                <tr key={p.id}>
                  <th scope="row" className="sticky left-0 z-10 text-left px-4 py-1.5 font-normal" style={{ background: "var(--panel)" }}>
                    <div className="text-[15px] font-medium">{p.nome}</div>
                    {p.turno && <div className="text-[12px] text-[var(--tinta-faint)] tabular-nums">{p.turno.inicio}–{p.turno.fim}</div>}
                  </th>
                  {dias.map((d) => {
                    const dia = diaNoPeriodo(d, p.id);
                    const v = dia ? VISUAL[dia.situacao] : null;
                    return (
                      <td key={d} className="p-1" style={{ background: d === hoje ? tint("var(--tinta)", 4) : undefined }}>
                        <div className="min-h-12 rounded-lg flex items-center justify-center text-[14px] font-semibold" style={v ? { background: v.fundo, color: v.texto } : { color: "var(--tinta-faint)" }}>
                          {v ? v.rotulo : "–"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Resumo({ titulo, cor, pessoas, turno, rotulo }: { titulo: string; cor: string; pessoas: PessoaPublica[]; turno?: boolean; rotulo?: (p: PessoaPublica) => string }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: tint(cor, 40), background: tint(cor, 6) }}>
      <h2 className="text-[15px] font-semibold mb-2">{titulo}</h2>
      {pessoas.length === 0 ? (
        <p className="text-[14px] text-[var(--tinta-faint)]">Ninguém.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {pessoas.map((p) => (
            <li key={p.id} className="text-[14px] px-2.5 py-1 rounded-lg" style={{ background: "var(--panel)", border: "1px solid var(--linha)" }}>
              {p.nome}
              {turno && p.turno && <span className="text-[var(--tinta-faint)] tabular-nums"> · {p.turno.inicio}</span>}
              {rotulo && <span className="text-[var(--tinta-faint)]"> · {rotulo(p)}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
