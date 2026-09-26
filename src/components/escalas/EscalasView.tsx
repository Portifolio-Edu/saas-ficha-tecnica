"use client";

// ESCALAS (2026-09-26): tela Escalas (dono e gestor). Abas:
//  - Escala do mês: alertas + grade + detalhe do dia;
//  - Equipe: PERFIL (2026-09-27) cartões com o perfil de cada pessoa; abre o
//    Prontuário de competências (nível, praças, pontos fortes, limitações,
//    notas) e o cadastro da escala;
//  - Extras: banco de extras (matchmaking com quem faltou);
//  - Ocorrências: faltas, atestados, férias, afastamentos, restrições
//    (antes a aba se chamava "Prontuário");
//  - Regras: travas fixas + rodízio de domingo + mínimo por equipe.
// O cálculo roda no navegador (src/lib/escalas, puro) em cima dos dados do
// banco; salvar passa pelas server actions (ou pela demo), que validam de
// novo, e o banco trava de novo. Se o motor detectar folga em sexta/sábado
// num setor protegido, a grade não aparece (mostra o erro) — nunca publica
// escala inválida.

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Pencil, AlertOctagon, CalendarPlus, ClipboardList } from "lucide-react";
import { chaveEquipe, gerarEscala } from "@/lib/escalas/motor";
import { cadastroCompleto, paraMotor, type OcorrenciaRegistro, type PessoaEscala } from "@/lib/escalas/cadastro";
import type { CadastroEscalaInput, OcorrenciaInput } from "@/lib/escalas/validacao";
import type { NotaInput, NotaPerfil, PerfilInput } from "@/lib/escalas/perfil";
import type { Extra, ExtraInput } from "@/lib/escalas/extras";
import type { Alerta, DataISO, RegrasEscala } from "@/lib/escalas/tipos";
import { GradeEscala, LegendaEscala, resumoRegime } from "./GradeEscala";
import { AgendaDiaEscala } from "./AgendaDiaEscala";
import { ContextoExtras, LinhaAlerta, PainelAlertas } from "./PainelAlertas";
import { EquipePerfis } from "./EquipePerfis";
import { ProntuarioPessoa } from "./ProntuarioPessoa";
import { ExtrasView } from "./ExtrasView";
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
  /** PERFIL (2026-09-27) */
  salvarPerfil: (funcionarioId: string, p: PerfilInput) => Promise<Resultado>;
  criarNota: (n: NotaInput) => Promise<Resultado>;
  removerNota: (id: string) => Promise<Resultado>;
  salvarExtra: (id: string | null, e: ExtraInput) => Promise<Resultado>;
  removerExtra: (id: string) => Promise<Resultado>;
}

type Aba = "escala" | "equipe" | "extras" | "ocorrencias" | "regras";
const ABAS: { id: Aba; rotulo: string; curto?: string }[] = [
  { id: "escala", rotulo: "Escala do mês", curto: "Escala" },
  { id: "equipe", rotulo: "Equipe" },
  { id: "extras", rotulo: "Extras" },
  { id: "ocorrencias", rotulo: "Ocorrências", curto: "Ocorr." },
  { id: "regras", rotulo: "Regras" },
];

export function EscalasView({
  pessoas,
  ocorrencias,
  regras,
  notas,
  extras,
  nomeRestaurante,
  hoje,
  acoes,
}: {
  pessoas: PessoaEscala[];
  ocorrencias: OcorrenciaRegistro[];
  regras: RegrasEscala;
  notas: NotaPerfil[];
  extras: Extra[];
  nomeRestaurante: string;
  hoje: DataISO;
  acoes: AcoesEscalas;
}) {
  const [aba, setAba] = useState<Aba>("escala");
  const [mes, setMes] = useState(hoje.slice(0, 7));
  const [selecionado, setSelecionado] = useState<{ pessoaId: string; data: DataISO } | null>(null);
  const [editando, setEditando] = useState<PessoaEscala | "nova" | null>(null);
  const [preenchimento, setPreenchimento] = useState<PreenchimentoOcorrencia | null>(null);
  const [prontuario, setProntuario] = useState<string | null>(null);
  const pessoaProntuario = prontuario ? pessoas.find((p) => p.id === prontuario) : undefined;
  const contextoExtras = useMemo(() => ({ extras, restaurante: nomeRestaurante, hoje, irParaExtras: () => setAba("extras") }), [extras, nomeRestaurante, hoje]);

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
    setAba("ocorrencias");
  };

  // Detalhe do dia tocado: no computador aparece acima da grade; no celular,
  // logo abaixo da pessoa tocada na agenda (senão abriria fora da vista).
  const detalheSel =
    pessoaSel && diaSel ? (
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
                    <button onClick={() => setProntuario(pessoaSel.id)} className="min-h-10 px-3 rounded-lg border inline-flex items-center gap-2 text-[13px] font-medium" style={{ borderColor: "var(--linha-forte)" }}>
                      <ClipboardList size={14} /> Prontuário
                    </button>
                  </div>
                  {alertasSel.length > 0 && (
                    <ul className="border-t divide-y" style={{ borderColor: "var(--linha)" }}>
                      {alertasSel.map((a, i) => <LinhaAlerta key={i} a={a} />)}
                    </ul>
                  )}
                </section>
    ) : null;

  return (
    <ContextoExtras.Provider value={contextoExtras}>
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid grid-cols-5 sm:inline-flex w-full sm:w-auto p-0.5 rounded-lg border max-w-full overflow-x-auto" style={{ background: "var(--panel-elevated)", borderColor: "var(--linha)" }} role="tablist" aria-label="Seções da escala">
          {ABAS.map((a) => (
            <button
              key={a.id}
              role="tab"
              aria-selected={aba === a.id}
              onClick={() => setAba(a.id)}
              className="px-1 sm:px-3.5 min-h-10 rounded-md text-[13px] sm:text-[14px] font-medium whitespace-nowrap transition-colors"
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
                <span className="ml-1.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full hidden sm:inline" style={{ background: tint("var(--etapa-producao)", 18), color: "var(--etapa-producao-texto)" }}>{incompletas.length}</span>
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
              {detalheSel && <div className="hidden md:block">{detalheSel}</div>}
              {/* CELULAR (2026-09-26): no celular, agenda por dia; a grade do mês fica no computador. */}
              <div className="md:hidden">
                <AgendaDiaEscala
                  funcionarios={funcionarios}
                  porFuncionario={calculo.porFuncionario}
                  dias={dias}
                  hoje={hoje}
                  coberturaMinima={regras.coberturaMinima}
                  selecionado={selecionado}
                  detalhe={detalheSel}
                  onSelecionar={(sel) => setSelecionado(selecionado?.pessoaId === sel.pessoaId && selecionado.data === sel.data ? null : sel)}
                />
              </div>
              <div className="hidden md:block space-y-3">
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
              </div>
            </>
          )}
        </>
      )}

      {aba === "equipe" && (
        <EquipePerfis
          pessoas={pessoas}
          ocorrencias={ocorrencias}
          notas={notas}
          hoje={hoje}
          aoAbrirProntuario={(p) => setProntuario(p.id)}
          aoEditarEscala={(p) => setEditando(p)}
        />
      )}

      {aba === "extras" && <ExtrasView extras={extras} pessoas={pessoas} aoSalvar={acoes.salvarExtra} aoRemover={acoes.removerExtra} />}

      {aba === "ocorrencias" && (
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

      {pessoaProntuario && (
        <ProntuarioPessoa
          key={pessoaProntuario.id}
          pessoa={pessoaProntuario}
          ocorrencias={ocorrencias}
          notas={notas}
          extras={extras}
          hoje={hoje}
          aoSalvarPerfil={acoes.salvarPerfil}
          aoCriarNota={acoes.criarNota}
          aoRemoverNota={acoes.removerNota}
          aoEditarEscala={() => setEditando(pessoaProntuario)}
          aoFechar={() => setProntuario(null)}
        />
      )}

      {/* A escala abre por cima do prontuário, sem fechar (não perde o que foi editado). */}
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
    </ContextoExtras.Provider>
  );
}
