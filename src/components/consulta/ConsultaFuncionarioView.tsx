"use client";

// CELULAR (2026-09-26): o que a pessoa da cozinha vê no próprio celular pelo
// link só de consulta. Três abas, feitas pra olhar rápido antes de chegar ou
// fora do restaurante:
//  - Escala: hoje em destaque (trabalha / folga / férias), próxima folga e as
//    próximas semanas, só dela;
//  - Fichas: as mesmas fichas do tablet (sem custo), com busca;
//  - Checklists: o que já foi feito hoje e o que falta, sem marcar nada.
// Nada aqui grava: pra registrar, é o tablet da cozinha.
// Usado em /consulta/[codigo] (dados do banco) e /preview/consulta (demo).

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ClipboardList, Lock, RefreshCw, UtensilsCrossed } from "lucide-react";
import { useRouter } from "next/navigation";
import { FichasCozinha } from "@/components/cozinha/FichasCozinha";
import { ESTILO, NOME_DIA_CURTO, diaMes, diaSemanaDe, segundaDaSemana, somarDias } from "@/components/escalas/visual";
import { MOMENTOS, type Checklist } from "@/lib/dominio/checklist";
import { proximaFolga, textoTurno, type ConsultaFuncionario, type DiaMeu } from "@/lib/dominio/consulta";
import type { SituacaoPublica } from "@/lib/escalas/publica";
import type { DataISO } from "@/lib/escalas/tipos";

type Aba = "escala" | "fichas" | "checklists";

const NOME_DIA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const VISUAL: Record<SituacaoPublica, { rotulo: string; fundo: string; texto: string }> = {
  trabalho: { rotulo: "Trabalha", fundo: ESTILO.trabalho.fundo, texto: ESTILO.trabalho.texto },
  folga: { rotulo: "Folga", fundo: ESTILO.folga.fundo, texto: ESTILO.folga.texto },
  ferias: { rotulo: "Férias", fundo: ESTILO.ferias.fundo, texto: ESTILO.ferias.texto },
  ausente: { rotulo: "Fora da escala", fundo: ESTILO.afastado.fundo, texto: ESTILO.afastado.texto },
};

export function ConsultaFuncionarioView({
  dados,
  atualizadoAs,
  demo = false,
}: {
  dados: ConsultaFuncionario;
  /** "14:32" — hora em que o servidor montou a página. */
  atualizadoAs: string;
  demo?: boolean;
}) {
  const [aba, setAba] = useState<Aba>("escala");
  const router = useRouter();
  const [atualizando, setAtualizando] = useState(false);
  useEffect(() => setAtualizando(false), [atualizadoAs]);

  const pendentesHoje = dados.checklists.reduce((n, c) => n + c.itens.filter((i) => !i.concluidoHoje).length, 0);
  const primeiro = dados.pessoa.nome.trim().split(/\s+/)[0];

  const ABAS: { id: Aba; rotulo: string; icone: typeof CalendarDays; extra?: string }[] = [
    { id: "escala", rotulo: "Escala", icone: CalendarDays },
    { id: "fichas", rotulo: "Fichas", icone: UtensilsCrossed, extra: String(dados.fichas.length) },
    { id: "checklists", rotulo: "Checklists", icone: ClipboardList, extra: pendentesHoje > 0 ? String(pendentesHoje) : undefined },
  ];

  return (
    <div className="min-h-dvh bg-[var(--fundo)] text-[var(--tinta)]">
      <header className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 max-w-3xl mx-auto">
        <p className="text-[13px] text-[var(--tinta-sub)]">{dados.restaurante}</p>
        <h1 className="text-[24px] font-semibold tracking-tight leading-tight mt-0.5">Olá, {primeiro}</h1>
        <p className="text-[13px] text-[var(--tinta-sub)] mt-1 flex items-center gap-1.5">
          <Lock size={13} aria-hidden /> Só consulta{dados.pessoa.cargo ? ` · ${dados.pessoa.cargo}` : ""}
        </p>
      </header>

      <nav
        role="tablist"
        aria-label="O que ver"
        className="sticky top-0 z-10 px-4 py-2 max-w-3xl mx-auto grid grid-cols-3 gap-1.5 bg-[var(--fundo)]/95 backdrop-blur border-b"
        style={{ borderColor: "var(--linha)" }}
      >
        {ABAS.map((a) => {
          const ativo = aba === a.id;
          const Icone = a.icone;
          return (
            <button
              key={a.id}
              role="tab"
              aria-selected={ativo}
              aria-controls={`painel-${a.id}`}
              id={`aba-${a.id}`}
              onClick={() => {
                setAba(a.id);
                window.scrollTo({ top: 0 });
              }}
              className="min-h-12 rounded-xl flex items-center justify-center gap-1.5 text-[15px] font-medium border"
              style={ativo ? { background: "var(--tinta)", color: "var(--panel)", borderColor: "var(--tinta)" } : { background: "var(--panel)", color: "var(--tinta)", borderColor: "var(--linha)" }}
            >
              <Icone size={16} aria-hidden className="shrink-0 hidden min-[420px]:block" />
              {a.rotulo}
              {a.extra && (
                <span className="text-[12px] font-semibold tabular-nums px-1.5 rounded-full" style={{ background: ativo ? "var(--panel)" : "var(--panel-hover)", color: "var(--tinta)" }}>
                  {a.extra}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <main id="conteudo" className="px-4 py-4 max-w-3xl mx-auto">
        <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`}>
          {aba === "escala" && <MinhaEscalaView dados={dados} />}
          {aba === "fichas" && <FichasCozinha fichas={dados.fichas} />}
          {aba === "checklists" && <ChecklistsDoDia checklists={dados.checklists} />}
        </div>

        <footer className="mt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-[13px] text-[var(--tinta-sub)] space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Atualizado às {atualizadoAs}</span>
            {!demo && (
              <button
                onClick={() => {
                  setAtualizando(true);
                  router.refresh();
                }}
                className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg border font-medium text-[var(--tinta)]"
                style={{ borderColor: "var(--linha-forte)" }}
              >
                <RefreshCw size={14} className={atualizando ? "animate-spin" : ""} aria-hidden /> Atualizar
              </button>
            )}
          </div>
          <p>Pra registrar alguma coisa, use o tablet da cozinha. Este link é só seu: não repasse. Perdeu ou trocou de celular? Peça um novo ao gestor.</p>
        </footer>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Escala

function nomeDoDia(d: DataISO, hoje: DataISO): string {
  if (d === hoje) return "Hoje";
  if (d === somarDias(hoje, 1)) return "Amanhã";
  const n = NOME_DIA[diaSemanaDe(d)];
  return n[0].toUpperCase() + n.slice(1);
}

function MinhaEscalaView({ dados }: { dados: ConsultaFuncionario }) {
  const { escala, hoje } = dados;
  const semanas = useMemo(() => {
    if (!escala) return [];
    const grupos = new Map<DataISO, DiaMeu[]>();
    for (const d of escala.dias) {
      const s = segundaDaSemana(d.data);
      grupos.set(s, [...(grupos.get(s) ?? []), d]);
    }
    return [...grupos.entries()];
  }, [escala]);

  if (!escala) {
    return (
      <section aria-label="Escala" className="rounded-2xl border p-5 bg-[var(--panel)]" style={{ borderColor: "var(--linha)" }}>
        <h2 className="text-[18px] font-semibold">Escala</h2>
        <p className="text-[15px] text-[var(--tinta-sub)] mt-1">Sua escala ainda não está no sistema ou está em revisão pelo gestor. Confira com ele os seus horários.</p>
      </section>
    );
  }

  const deHoje = escala.dias[0];
  const turno = textoTurno(escala.turno);
  const folga = proximaFolga(escala);
  const v = deHoje?.situacao ? VISUAL[deHoje.situacao] : null;
  const frase =
    deHoje?.situacao === "trabalho"
      ? `Você trabalha hoje${turno ? `, das ${turno.replace("–", " às ")}` : ""}.`
      : deHoje?.situacao === "folga"
        ? "Hoje é sua folga."
        : deHoje?.situacao === "ferias"
          ? "Você está de férias."
          : "Hoje você não está na escala.";

  return (
    <div className="space-y-4">
      <section aria-label="Hoje" className="rounded-2xl border p-5" style={{ borderColor: "var(--linha)", background: v ? v.fundo : "var(--panel)" }}>
        <p className="text-[13px] font-medium" style={{ color: v?.texto ?? "var(--tinta-sub)" }}>
          Hoje, {NOME_DIA[diaSemanaDe(hoje)]} {diaMes(hoje)}
        </p>
        <p className="text-[22px] font-semibold leading-snug mt-1">{frase}</p>
        {folga && (
          <p className="text-[15px] mt-2 text-[var(--tinta)]">
            Próxima folga: <strong className="font-semibold">{nomeDoDia(folga.data, hoje).toLowerCase()}{folga.data !== somarDias(hoje, 1) ? `, ${diaMes(folga.data)}` : ""}</strong>
          </p>
        )}
      </section>

      {semanas.map(([segunda, dias], n) => (
        <section key={segunda} aria-label={rotuloSemana(segunda, hoje, n)} className="rounded-2xl border overflow-hidden bg-[var(--panel)]" style={{ borderColor: "var(--linha)" }}>
          <h2 className="px-4 py-2.5 text-[13px] font-semibold uppercase tracking-wide text-[var(--tinta-sub)] border-b" style={{ borderColor: "var(--linha)" }}>
            {rotuloSemana(segunda, hoje, n)}
          </h2>
          <ul>
            {dias.map((d) => {
              const vis = d.situacao ? VISUAL[d.situacao] : null;
              const eHoje = d.data === hoje;
              return (
                <li
                  key={d.data}
                  aria-current={eHoje ? "date" : undefined}
                  className="px-4 min-h-14 flex items-center gap-3 border-t first:border-t-0"
                  style={{ borderColor: "var(--linha)", background: eHoje ? "var(--panel-hover)" : undefined }}
                >
                  <div className="w-12 shrink-0 text-[13px] text-[var(--tinta-sub)] uppercase">{NOME_DIA_CURTO[diaSemanaDe(d.data)]}</div>
                  <div className="flex-1 text-[16px] font-medium tabular-nums">
                    {diaMes(d.data)}
                    {eHoje && <span className="ml-2 text-[12.5px] font-semibold text-[var(--marca)]">hoje</span>}
                  </div>
                  {vis ? (
                    <span className="text-[14px] font-semibold px-2.5 py-1 rounded-md tabular-nums" style={{ background: vis.fundo, color: vis.texto }}>
                      {d.situacao === "trabalho" && turno ? turno : vis.rotulo}
                    </span>
                  ) : (
                    <span className="text-[13px] text-[var(--tinta-faint)]">—</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="text-[13px] text-[var(--tinta-sub)]">A escala pode mudar. Se algo não bater, fale com o gestor.</p>
    </div>
  );
}

function rotuloSemana(segunda: DataISO, hoje: DataISO, n: number): string {
  if (segunda === segundaDaSemana(hoje)) return "Esta semana";
  if (segunda === somarDias(segundaDaSemana(hoje), 7)) return "Semana que vem";
  return n >= 0 ? `Semana de ${diaMes(segunda)} a ${diaMes(somarDias(segunda, 6))}` : "";
}

// ---------------------------------------------------------------------------
// Checklists

function ChecklistsDoDia({ checklists }: { checklists: Checklist[] }) {
  if (checklists.length === 0) {
    return <p className="text-[15px] text-[var(--tinta-sub)] py-8 text-center">Nenhum checklist cadastrado ainda.</p>;
  }
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[20px] font-semibold tracking-tight">Checklists de hoje</h2>
        <p className="text-[14px] text-[var(--tinta-sub)] mt-0.5">O que já foi feito hoje e o que falta. Quem marca é o tablet da cozinha.</p>
      </div>
      {checklists.map((c) => {
        const feitos = c.itens.filter((i) => i.concluidoHoje).length;
        const total = c.itens.length;
        const completo = total > 0 && feitos === total;
        const areas = [...c.areas].sort((a, b) => a.ordem - b.ordem);
        const grupos: { nome: string | null; itens: typeof c.itens }[] = areas.length
          ? [
              ...areas.map((a) => ({ nome: a.nome, itens: c.itens.filter((i) => i.areaId === a.id) })),
              { nome: "Geral", itens: c.itens.filter((i) => !i.areaId || !areas.some((a) => a.id === i.areaId)) },
            ].filter((g) => g.itens.length > 0)
          : [{ nome: null, itens: c.itens }];
        return (
          <section key={c.id} aria-label={c.nome} className="rounded-2xl border overflow-hidden bg-[var(--panel)]" style={{ borderColor: "var(--linha)" }}>
            <div className="px-4 py-3 flex items-start justify-between gap-3 border-b" style={{ borderColor: "var(--linha)" }}>
              <div className="min-w-0">
                <h3 className="text-[16px] font-semibold">{c.nome}</h3>
                <p className="text-[12.5px] text-[var(--tinta-sub)]">{MOMENTOS.find((m) => m.id === c.momento)?.label}</p>
              </div>
              <span
                className="shrink-0 text-[13px] font-semibold tabular-nums px-2.5 py-1 rounded-md"
                style={completo ? { background: ESTILO.folga.fundo, color: ESTILO.folga.texto } : { background: "var(--panel-hover)", color: "var(--tinta-sub)" }}
              >
                {feitos} de {total}
              </span>
            </div>
            {c.fotos.length > 0 && (
              <div className="px-4 pt-3 flex gap-2 overflow-x-auto" role="region" aria-label={`Fotos de referência de ${c.nome}`} tabIndex={0}>
                {[...c.fotos].sort((a, b) => a.ordem - b.ordem).map((f) => (
                  <figure key={f.id} className="shrink-0 w-32">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={f.legenda ?? `Referência de ${c.nome}`} loading="lazy" className="w-32 h-24 object-cover rounded-lg border" style={{ borderColor: "var(--linha)" }} />
                    {f.legenda && <figcaption className="text-[12px] text-[var(--tinta-sub)] mt-1 line-clamp-2">{f.legenda}</figcaption>}
                  </figure>
                ))}
              </div>
            )}
            {grupos.map((g) => (
              <div key={g.nome ?? "todos"} className="pt-1">
                {g.nome && <h4 className="px-4 pt-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--tinta-faint)]">{g.nome}</h4>}
                <ul>
                  {[...g.itens].sort((a, b) => a.ordem - b.ordem).map((i) => (
                    <li key={i.id} className="px-4 py-2.5 flex items-start gap-3">
                      <span
                        className="mt-0.5 w-5 h-5 shrink-0 rounded-full border flex items-center justify-center"
                        style={i.concluidoHoje ? { background: ESTILO.folga.texto, borderColor: ESTILO.folga.texto, color: "var(--panel)" } : { borderColor: "var(--linha-forte)" }}
                        aria-hidden
                      >
                        {i.concluidoHoje && <Check size={13} strokeWidth={3} />}
                      </span>
                      <span className="text-[15px] leading-snug" style={i.concluidoHoje ? { color: "var(--tinta-sub)" } : undefined}>
                        {i.texto}
                        <span className="sr-only">{i.concluidoHoje ? " (feito hoje)" : " (falta)"}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
