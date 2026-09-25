"use client";

// ESCALAS (2026-09-26): tela Escalas (dono e gestor). Abas:
//  - Escala do mês: alertas + grade + detalhe do dia;
//  - Equipe: quem está na escala, regime, folgas; adicionar/editar;
//  - Prontuário: faltas, atestados, férias, afastamentos, restrições;
//  - Regras: travas fixas + rodízio de domingo + mínimo por equipe.
// O cálculo roda no navegador (src/lib/escalas, puro) em cima dos dados do
// banco; salvar passa pelas server actions (ou pela demo), que validam de
// novo, e o banco trava de novo. Se o motor detectar folga em sexta/sábado
// num setor protegido, a grade não aparece (mostra o erro) — nunca publica
// escala inválida.

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Pencil, AlertOctagon, CalendarPlus } from "lucide-react";
import { chaveEquipe, gerarEscala } from "@/lib/escalas/motor";
import { cadastroCompleto, paraMotor, type OcorrenciaRegistro, type PessoaEscala } from "@/lib/escalas/cadastro";
import { NIVEIS, type CadastroEscalaInput, type OcorrenciaInput } from "@/lib/escalas/validacao";
import type { Alerta, DataISO, RegrasEscala } from "@/lib/escalas/tipos";
import { GradeEscala, LegendaEscala, resumoRegime } from "./GradeEscala";
import { LinhaAlerta, PainelAlertas } from "./PainelAlertas";
import { FormPessoa } from "./FormPessoa";
import { ProntuarioView, type PreenchimentoOcorrencia } from "./ProntuarioView";
import { RegrasView } from "./RegrasView";
import { ESTILO, NOME_DIA_CURTO, ROTULO_SETOR, diaMes, diaSemanaDe, diasEntre, limitesDoMes, rotuloMes, somarMeses, tint } from "./visual";

type Resultado = { ok: true } | { ok: false; erro: string };

export interface AcoesEscalas {
  salvarPessoa: (id: string | null, c: CadastroEscalaInput) => Promise<Resultado>;
  salvarRegras: (r: RegrasEscala) => Promise<Resultado>;
  criarOcorrencia: (o: OcorrenciaInput) => Promise<Resultado>;
  removerOcorrencia: (id: string) => Promise<Resultado>;
}

type Aba = "escala" | "equipe" | "prontuario" | "regras";
const ABAS: { id: Aba; rotulo: string; curto?: string }[] = [
  { id: "escala", rotulo: "Escala do mês", curto: "Escala" },
  { id: "equipe", rotulo: "Equipe" },
  { id: "prontuario", rotulo: "Prontuário" },
  { id: "regras", rotulo: "Regras" },
];

export function EscalasView({
  pessoas,
  ocorrencias,
  regras,
  hoje,
  acoes,
}: {
  pessoas: PessoaEscala[];
  ocorrencias: OcorrenciaRegistro[];
  regras: RegrasEscala;
  hoje: DataISO;
  acoes: AcoesEscalas;
}) {
  const [aba, setAba] = useState<Aba>("escala");
  const [mes, setMes] = useState(hoje.slice(0, 7));
  const [selecionado, setSelecionado] = useState<{ pessoaId: string; data: DataISO } | null>(null);
  const [editando, setEditando] = useState<PessoaEscala | "nova" | null>(null);
  const [preenchimento, setPreenchimento] = useState<PreenchimentoOcorrencia | null>(null);

  const funcionarios = useMemo(() => paraMotor(pessoas), [pessoas]);
  const incompletas = pessoas.filter((p) => !cadastroCompleto(p));
  const { inicio, fim } = limitesDoMes(mes);
  const dias = useMemo(() => diasEntre(inicio, fim), [inicio, fim]);

  const calculo = useMemo((): { ok: true; porFuncionario: ReturnType<typeof gerarEscala>["porFuncionario"]; alertas: Alerta[] } | { ok: false; erro: string } => {
    try {
      const r = gerarEscala({ funcionarios, ocorrencias, regras, inicio, fim });
      return { ok: true, ...r };
    } catch (e) {
      return { ok: false, erro: e instanceof Error ? e.message : "Erro no cálculo da escala." };
    }
  }, [funcionarios, ocorrencias, regras, inicio, fim]);

  const equipes = useMemo(() => Array.from(new Set(funcionarios.map(chaveEquipe))).sort(), [funcionarios]);
  const pessoaSel = selecionado ? funcionarios.find((f) => f.id === selecionado.pessoaId) : undefined;
  const diaSel = calculo.ok && selecionado ? calculo.porFuncionario[selecionado.pessoaId]?.find((d) => d.data === selecionado.data) : undefined;
  const alertasSel = calculo.ok && selecionado ? calculo.alertas.filter((a) => a.funcionarioId === selecionado.pessoaId && a.data === selecionado.data) : [];

  const lancarOcorrencia = (funcionarioId: string, data: DataISO) => {
    setPreenchimento({ funcionarioId, data });
    setAba("prontuario");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid grid-cols-4 sm:inline-flex w-full sm:w-auto p-0.5 rounded-lg border max-w-full overflow-x-auto" style={{ background: "var(--panel-elevated)", borderColor: "var(--linha)" }} role="tablist" aria-label="Seções da escala">
          {ABAS.map((a) => (
            <button
              key={a.id}
              role="tab"
              aria-selected={aba === a.id}
              onClick={() => setAba(a.id)}
              className="px-2 sm:px-3.5 min-h-10 rounded-md text-[14px] font-medium whitespace-nowrap transition-colors"
              style={{ background: aba === a.id ? "var(--panel)" : "transparent", color: aba === a.id ? "var(--tinta)" : "var(--tinta-sub)", boxShadow: aba === a.id ? "var(--shadow-sm)" : "none" }}
            >
              {a.curto ? (
                <>
                  <span className="sm:hidden">{a.curto}</span>
                  <span className="hidden sm:inline">{a.rotulo}</span>
                </>
              ) : (
                a.rotulo
              )}
              {a.id === "equipe" && incompletas.length > 0 && (
                <span className="ml-1.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: tint("var(--etapa-producao)", 18), color: "var(--etapa-producao-texto)" }}>{incompletas.length}</span>
              )}
            </button>
          ))}
        </div>
        {aba === "escala" && (
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => setMes((m) => somarMeses(m, -1))} aria-label="Mês anterior" className="w-10 h-10 rounded-lg border flex items-center justify-center" style={{ borderColor: "var(--linha-forte)" }}>
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[170px] text-center text-[15px] font-semibold" aria-live="polite">{rotuloMes(mes)}</span>
            <button onClick={() => setMes((m) => somarMeses(m, 1))} aria-label="Próximo mês" className="w-10 h-10 rounded-lg border flex items-center justify-center" style={{ borderColor: "var(--linha-forte)" }}>
              <ChevronRight size={18} />
            </button>
            {mes !== hoje.slice(0, 7) && (
              <button onClick={() => setMes(hoje.slice(0, 7))} className="ml-1 min-h-10 px-3 rounded-lg border text-[13px] font-medium" style={{ borderColor: "var(--linha-forte)" }}>
                Hoje
              </button>
            )}
          </div>
        )}
        {aba === "equipe" && (
          <button onClick={() => setEditando("nova")} className="ml-auto min-h-10 px-4 rounded-lg inline-flex items-center gap-2 text-[14px] font-semibold" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
            <Plus size={16} /> Adicionar pessoa
          </button>
        )}
      </div>

      {aba === "escala" && (
        <>
          {incompletas.length > 0 && (
            <button onClick={() => (incompletas.length === 1 ? setEditando(incompletas[0]) : setAba("equipe"))} className="w-full text-left rounded-xl border px-4 py-3 text-[14px] hover:bg-[var(--panel-hover)]" style={{ borderColor: tint("var(--etapa-producao)", 45), background: tint("var(--etapa-producao)", 7), color: "var(--etapa-producao-texto)" }}>
              {incompletas.length === 1 ? "1 pessoa ainda sem escala" : `${incompletas.length} pessoas ainda sem escala`} ({incompletas.map((p) => p.nome).join(", ")}). Toque pra configurar.
            </button>
          )}
          {!calculo.ok ? (
            <div role="alert" className="rounded-xl border px-4 py-4 flex gap-3" style={{ borderColor: tint("var(--etapa-perda)", 50), background: tint("var(--etapa-perda)", 8) }}>
              <AlertOctagon size={20} className="shrink-0" style={{ color: "var(--etapa-perda-texto)" }} />
              <div>
                <p className="text-[15px] font-semibold" style={{ color: "var(--etapa-perda-texto)" }}>Escala bloqueada</p>
                <p className="text-[14px] text-[var(--tinta)] mt-0.5">{calculo.erro} Nenhuma escala com folga em sexta ou sábado é mostrada. Corrija o cadastro da pessoa em Equipe.</p>
              </div>
            </div>
          ) : funcionarios.length === 0 ? (
            <div className="rounded-xl border border-dashed px-6 py-12 text-center" style={{ borderColor: "var(--linha-forte)" }}>
              <p className="text-[16px] font-semibold">Nenhuma pessoa na escala ainda</p>
              <p className="text-[14px] text-[var(--tinta-sub)] mt-1">Adicione a equipe com setor, cargo e regime, e a escala do mês aparece aqui.</p>
              <button onClick={() => (setAba("equipe"), setEditando("nova"))} className="mt-4 min-h-11 px-4 rounded-lg inline-flex items-center gap-2 text-[14px] font-semibold" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
                <Plus size={16} /> Adicionar pessoa
              </button>
            </div>
          ) : (
            <>
              <PainelAlertas alertas={calculo.alertas} hoje={hoje} />
              {pessoaSel && diaSel && (
                <section aria-label="Detalhe do dia" className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--linha-forte)", background: "var(--panel)" }}>
                  <div className="px-4 py-3 flex flex-wrap items-center gap-3">
                    <span className="text-[13px] font-semibold px-2.5 py-1 rounded-md" style={{ background: ESTILO[diaSel.situacao].fundo, color: ESTILO[diaSel.situacao].texto }}>
                      {ESTILO[diaSel.situacao].rotulo}
                    </span>
                    <div className="flex-1 min-w-[200px]">
                      <div className="text-[15px] font-semibold">
                        {pessoaSel.nome} · {NOME_DIA_CURTO[diaSemanaDe(diaSel.data)]} {diaMes(diaSel.data)}
                      </div>
                      <div className="text-[13px] text-[var(--tinta-sub)]">
                        {ROTULO_SETOR[pessoaSel.setor]} · {pessoaSel.cargo} · {resumoRegime(pessoaSel)}
                        {pessoaSel.escala.turno ? ` · ${pessoaSel.escala.turno.inicio}–${pessoaSel.escala.turno.fim}` : ""}
                      </div>
                      {diaSel.ajuste && <div className="text-[13px] mt-1" style={{ color: "var(--etapa-producao-texto)" }}>{diaSel.ajuste}</div>}
                    </div>
                    <button onClick={() => lancarOcorrencia(pessoaSel.id, diaSel.data)} className="min-h-10 px-3 rounded-lg border inline-flex items-center gap-2 text-[13px] font-medium" style={{ borderColor: "var(--linha-forte)" }}>
                      <CalendarPlus size={15} /> Lançar ocorrência
                    </button>
                    <button onClick={() => setEditando(pessoas.find((p) => p.id === pessoaSel.id) ?? null)} className="min-h-10 px-3 rounded-lg border inline-flex items-center gap-2 text-[13px] font-medium" style={{ borderColor: "var(--linha-forte)" }}>
                      <Pencil size={14} /> Editar escala
                    </button>
                  </div>
                  {alertasSel.length > 0 && (
                    <ul className="border-t divide-y" style={{ borderColor: "var(--linha)" }}>
                      {alertasSel.map((a, i) => <LinhaAlerta key={i} a={a} />)}
                    </ul>
                  )}
                </section>
              )}
              <GradeEscala
                funcionarios={funcionarios}
                porFuncionario={calculo.porFuncionario}
                dias={dias}
                hoje={hoje}
                coberturaMinima={regras.coberturaMinima}
                selecionado={selecionado}
                onSelecionar={setSelecionado}
              />
              <LegendaEscala />
            </>
          )}
        </>
      )}

      {aba === "equipe" && (
        <section aria-label="Equipe na escala">
          {pessoas.length === 0 ? (
            <p className="text-[14px] text-[var(--tinta-sub)] rounded-xl border border-dashed px-4 py-10 text-center" style={{ borderColor: "var(--linha-forte)" }}>
              Ninguém cadastrado ainda. Toque em Adicionar pessoa.
            </p>
          ) : (
            <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "var(--linha)", background: "var(--panel)" }}>
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="text-left text-[12px] text-[var(--tinta-faint)] border-b" style={{ borderColor: "var(--linha)" }}>
                    <th className="px-4 py-2.5 font-medium">Pessoa</th>
                    <th className="px-3 py-2.5 font-medium">Equipe</th>
                    <th className="px-3 py-2.5 font-medium">Regime</th>
                    <th className="px-3 py-2.5 font-medium hidden md:table-cell">Turno</th>
                    <th className="px-3 py-2.5 font-medium hidden md:table-cell">Admissão</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {[...pessoas].sort((a, b) => Number(cadastroCompleto(a)) - Number(cadastroCompleto(b)) || a.nome.localeCompare(b.nome)).map((p) => {
                    const completo = cadastroCompleto(p);
                    const f = completo ? paraMotor([p])[0] : null;
                    const nivel = p.nivel ? NIVEIS.find((n) => n.id === p.nivel)?.rotulo : null;
                    return (
                      <tr key={p.id} className="border-b last:border-0" style={{ borderColor: "var(--linha)" }}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{p.nome}</div>
                          {(nivel || p.habilidades.length > 0) && <div className="text-[12px] text-[var(--tinta-faint)]">{[nivel, ...p.habilidades].filter(Boolean).join(" · ")}</div>}
                        </td>
                        <td className="px-3 py-3 text-[var(--tinta-sub)]">{p.setor && p.cargo ? `${ROTULO_SETOR[p.setor]} · ${p.cargo}` : "—"}</td>
                        <td className="px-3 py-3">
                          {f ? (
                            resumoRegime(f)
                          ) : (
                            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full" style={{ background: tint("var(--etapa-producao)", 16), color: "var(--etapa-producao-texto)" }}>Sem escala</span>
                          )}
                          {p.desligamento && <div className="text-[12px] text-[var(--tinta-faint)]">desligamento {diaMes(p.desligamento)}/{p.desligamento.slice(0, 4)}</div>}
                        </td>
                        <td className="px-3 py-3 text-[var(--tinta-sub)] tabular-nums hidden md:table-cell">{p.escala?.turno ? `${p.escala.turno.inicio}–${p.escala.turno.fim}` : "—"}</td>
                        <td className="px-3 py-3 text-[var(--tinta-sub)] tabular-nums hidden md:table-cell">{p.admissao ? `${diaMes(p.admissao)}/${p.admissao.slice(0, 4)}` : "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setEditando(p)} className="min-h-10 px-3 rounded-lg border inline-flex items-center gap-2 text-[13px] font-medium" style={{ borderColor: "var(--linha-forte)" }}>
                            <Pencil size={14} /> {completo ? "Editar" : "Configurar"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {aba === "prontuario" && (
        <ProntuarioView
          key={preenchimento ? `${preenchimento.funcionarioId}-${preenchimento.data}` : "vazio"}
          pessoas={pessoas}
          ocorrencias={ocorrencias}
          hoje={hoje}
          preenchimento={preenchimento}
          aoCriar={async (o) => {
            const r = await acoes.criarOcorrencia(o);
            if (r.ok) setPreenchimento(null);
            return r;
          }}
          aoRemover={acoes.removerOcorrencia}
        />
      )}

      {aba === "regras" && <RegrasView regras={regras} equipes={equipes} aoSalvar={acoes.salvarRegras} />}

      {editando && (
        <FormPessoa
          pessoa={editando === "nova" ? null : editando}
          pessoas={pessoas}
          ocorrencias={ocorrencias}
          regras={regras}
          hoje={hoje}
          aoSalvar={acoes.salvarPessoa}
          aoFechar={() => setEditando(null)}
        />
      )}
    </div>
  );
}
