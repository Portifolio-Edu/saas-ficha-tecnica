"use client";

// ESCALAS (2026-09-26): cadastro de pessoa + regime, num painel lateral.
// As travas aparecem na própria tela: sexta e sábado nunca podem ser folga
// (chips travados), domingo só pelo rodízio, e 12x36/24x48 ficam
// indisponíveis pra cozinha, salão e bar. Antes de salvar, mostra como fica
// a escala da pessoa nas próximas 2 semanas, já com o rodízio da equipe.

import { useEffect, useMemo, useState } from "react";
import { X, Lock, Check } from "lucide-react";
import { gerarEscala, regimesPermitidos, setorProtegido } from "@/lib/escalas/motor";
import { aplicarCadastro, cadastroInicial, paraMotor, type OcorrenciaRegistro, type PessoaEscala } from "@/lib/escalas/cadastro";
import { NIVEIS, REGIMES, SETORES, normalizarHabilidades, validarCadastro, type CadastroEscalaInput } from "@/lib/escalas/validacao";
import type { DataISO, DiaSemana, RegrasEscala, Setor, TipoEscala } from "@/lib/escalas/tipos";
import { ESTILO, NOME_DIA_CURTO, SIGLA_DIA, diaSemanaDe, ehPico, segundaDaSemana, somarDias, tint } from "./visual";

type Resultado = { ok: true } | { ok: false; erro: string };

const campo = "w-full min-h-11 px-3 rounded-lg border bg-[var(--panel)] text-[15px] outline-none focus:ring-2 focus:ring-[var(--marca-suave)]";
const estiloCampo = { borderColor: "var(--linha-forte)", color: "var(--tinta)" } as const;

function Rotulo({ children, ajuda }: { children: React.ReactNode; ajuda?: string }) {
  return (
    <span className="block mb-1.5">
      <span className="text-[13px] font-medium text-[var(--tinta)]">{children}</span>
      {ajuda && <span className="block text-[12px] text-[var(--tinta-faint)] mt-0.5">{ajuda}</span>}
    </span>
  );
}

export function FormPessoa({
  pessoa,
  pessoas,
  ocorrencias,
  regras,
  hoje,
  aoSalvar,
  aoFechar,
}: {
  pessoa: PessoaEscala | null;
  pessoas: PessoaEscala[];
  ocorrencias: OcorrenciaRegistro[];
  regras: RegrasEscala;
  hoje: DataISO;
  aoSalvar: (id: string | null, c: CadastroEscalaInput) => Promise<Resultado>;
  aoFechar: () => void;
}) {
  const [c, setC] = useState<CadastroEscalaInput>(() => cadastroInicial(pessoa, hoje));
  const [habilidadesTexto, setHabilidadesTexto] = useState(() => (pessoa?.habilidades ?? []).join(", "));
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const atualizar = (parcial: Partial<CadastroEscalaInput>) => {
    setErro(null);
    setC((atual) => ({ ...atual, ...parcial }));
  };

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aoFechar]);

  const mudarSetor = (setor: Setor) => {
    const permitidos = regimesPermitidos(setor);
    if (!permitidos.includes(c.tipo)) {
      setAviso(`${SETORES.find((s) => s.id === setor)?.rotulo} só trabalha em 5x2 ou 6x1: regime trocado para 6x1.`);
      atualizar({ setor, tipo: "6x1", folgasPreferidas: [] });
    } else {
      setAviso(null);
      atualizar({ setor });
    }
  };

  const mudarRegime = (tipo: TipoEscala) => {
    const n = tipo === "5x2" ? 2 : tipo === "6x1" ? 1 : 0;
    atualizar({ tipo, folgasPreferidas: c.folgasPreferidas.slice(0, n) });
  };

  const alternarFolga = (d: DiaSemana) => {
    const n = c.tipo === "5x2" ? 2 : 1;
    const tem = c.folgasPreferidas.includes(d);
    let novas = tem ? c.folgasPreferidas.filter((x) => x !== d) : [...c.folgasPreferidas, d];
    if (novas.length > n) novas = novas.slice(novas.length - n);
    atualizar({ folgasPreferidas: novas.sort() as DiaSemana[] });
  };

  const cargos = useMemo(
    () => Array.from(new Set(pessoas.filter((p) => p.setor === c.setor && p.cargo).map((p) => p.cargo!))).sort(),
    [pessoas, c.setor],
  );

  // Prévia: 2 semanas a partir desta segunda, com a equipe inteira (rodízio).
  const inicioPrevia = segundaDaSemana(hoje);
  const fimPrevia = somarDias(inicioPrevia, 13);
  const previa = useMemo(() => {
    const entrada = { ...c, habilidades: normalizarHabilidades(habilidadesTexto) };
    if (validarCadastro(entrada)) return null;
    const idPrevia = pessoa?.id ?? "__nova__";
    const editada = aplicarCadastro(idPrevia, entrada);
    const equipe = [...pessoas.filter((p) => p.id !== idPrevia), editada];
    try {
      return gerarEscala({ funcionarios: paraMotor(equipe), ocorrencias, regras, inicio: inicioPrevia, fim: fimPrevia }).porFuncionario[idPrevia] ?? null;
    } catch {
      return null;
    }
  }, [c, habilidadesTexto, pessoa, pessoas, ocorrencias, regras, inicioPrevia, fimPrevia]);

  const salvar = async () => {
    const entrada = { ...c, habilidades: normalizarHabilidades(habilidadesTexto) };
    const problema = validarCadastro(entrada);
    if (problema) return setErro(problema);
    setSalvando(true);
    const r = await aoSalvar(pessoa?.id ?? null, entrada);
    setSalvando(false);
    if (!r.ok) return setErro(r.erro);
    aoFechar();
  };

  const protegido = setorProtegido(c.setor);
  const nFolgas = c.tipo === "5x2" ? 2 : c.tipo === "6x1" ? 1 : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.45)" }} onClick={aoFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={pessoa ? `Escala de ${pessoa.nome}` : "Nova pessoa"}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[560px] h-full overflow-y-auto flex flex-col animate-fade-in"
        style={{ background: "var(--panel)", borderLeft: "1px solid var(--linha)" }}
      >
        <header className="sticky top-0 z-10 px-5 py-4 flex items-center gap-3 border-b" style={{ background: "var(--panel)", borderColor: "var(--linha)" }}>
          <h2 className="text-[17px] font-semibold flex-1">{pessoa ? `Escala de ${pessoa.nome}` : "Nova pessoa"}</h2>
          <button onClick={aoFechar} aria-label="Fechar" className="w-10 h-10 -mr-2 rounded-lg flex items-center justify-center text-[var(--tinta-faint)] hover:bg-[var(--panel-hover)]">
            <X size={20} />
          </button>
        </header>

        <div className="px-5 py-5 space-y-6 flex-1">
          <fieldset className="space-y-4">
            <legend className="text-[12px] font-semibold uppercase tracking-wide text-[var(--tinta-faint)] mb-3">Pessoa</legend>
            <label className="block">
              <Rotulo>Nome</Rotulo>
              <input value={c.nome} onChange={(e) => atualizar({ nome: e.target.value })} className={campo} style={estiloCampo} autoFocus={!pessoa} />
            </label>
            <div>
              <Rotulo>Setor</Rotulo>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" role="radiogroup" aria-label="Setor">
                {SETORES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={c.setor === s.id}
                    onClick={() => mudarSetor(s.id)}
                    className="min-h-11 px-2 rounded-lg border text-[14px] font-medium"
                    style={c.setor === s.id ? { background: "var(--tinta)", color: "var(--panel)", borderColor: "var(--tinta)" } : { borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}
                  >
                    {s.id === "outro" ? "Apoio" : s.rotulo}
                  </button>
                ))}
              </div>
              {c.setor === "outro" && <p className="text-[12px] text-[var(--tinta-faint)] mt-1.5">Segurança, limpeza, manutenção: funções que não atendem o pico.</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <Rotulo>Cargo</Rotulo>
                <input value={c.cargo} onChange={(e) => atualizar({ cargo: e.target.value })} list="cargos-existentes" placeholder="Ex.: Sushiman" className={campo} style={estiloCampo} />
                <datalist id="cargos-existentes">{cargos.map((x) => <option key={x} value={x} />)}</datalist>
              </label>
              <label className="block">
                <Rotulo>Nível</Rotulo>
                <select value={c.nivel ?? ""} onChange={(e) => atualizar({ nivel: (e.target.value || null) as CadastroEscalaInput["nivel"] })} className={campo} style={estiloCampo}>
                  <option value="">Não informado</option>
                  {NIVEIS.map((n) => <option key={n.id} value={n.id}>{n.rotulo}</option>)}
                </select>
              </label>
            </div>
            <label className="block">
              <Rotulo ajuda="Separadas por vírgula. Servem pra achar um extra com o mesmo perfil quando alguém faltar.">Habilidades</Rotulo>
              <input value={habilidadesTexto} onChange={(e) => setHabilidadesTexto(e.target.value)} placeholder="Ex.: sushi, sashimi, maçarico" className={campo} style={estiloCampo} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <Rotulo>Admissão</Rotulo>
                <input type="date" value={c.admissao} onChange={(e) => atualizar({ admissao: e.target.value })} className={campo} style={estiloCampo} />
              </label>
              <label className="block">
                <Rotulo>Desligamento</Rotulo>
                <input type="date" value={c.desligamento ?? ""} onChange={(e) => atualizar({ desligamento: e.target.value || null })} className={campo} style={estiloCampo} />
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-[12px] font-semibold uppercase tracking-wide text-[var(--tinta-faint)] mb-3">Escala</legend>
            <div>
              <Rotulo>Regime</Rotulo>
              <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Regime">
                {REGIMES.map((r) => {
                  const bloqueado = protegido && (r.id === "12x36" || r.id === "24x48");
                  const ativo = c.tipo === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="radio"
                      aria-checked={ativo}
                      aria-disabled={bloqueado}
                      disabled={bloqueado}
                      onClick={() => mudarRegime(r.id)}
                      className="min-h-[60px] px-3 py-2 rounded-lg border text-left disabled:cursor-not-allowed"
                      style={
                        ativo
                          ? { background: tint("var(--tinta)", 6), borderColor: "var(--tinta)" }
                          : { borderColor: "var(--linha-forte)", opacity: bloqueado ? 0.55 : 1 }
                      }
                    >
                      <span className="flex items-center gap-1.5 text-[15px] font-semibold">
                        {bloqueado && <Lock size={13} />} {r.rotulo}
                      </span>
                      <span className="block text-[12px] text-[var(--tinta-sub)] leading-snug">{bloqueado ? "Não pra cozinha, salão e bar: a folga cairia na sexta/sábado" : r.descricao}</span>
                    </button>
                  );
                })}
              </div>
              {aviso && <p className="text-[12px] mt-1.5" style={{ color: "var(--etapa-producao-texto)" }}>{aviso}</p>}
            </div>

            {nFolgas > 0 && (
              <div>
                <Rotulo ajuda={c.folgasPreferidas.length === 0 ? "Automático: o sistema escolhe pela data de início do ciclo. Toque pra fixar." : undefined}>
                  {nFolgas === 2 ? "Dias de folga (2)" : "Dia de folga (1)"}
                </Rotulo>
                <div className="grid grid-cols-7 gap-1">
                  {([1, 2, 3, 4, 5, 6, 0] as DiaSemana[]).map((d) => {
                    const travado = d === 5 || d === 6 || d === 0;
                    const ativo = c.folgasPreferidas.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={travado}
                        onClick={() => alternarFolga(d)}
                        aria-pressed={ativo}
                        title={d === 0 ? "Domingo de folga só pelo rodízio da equipe" : travado ? "Sexta e sábado: dia de pico, sem folga" : undefined}
                        className="min-h-[52px] rounded-lg border flex flex-col items-center justify-center gap-0.5 text-[13px] font-medium disabled:cursor-not-allowed"
                        style={
                          ativo
                            ? { background: ESTILO.folga.fundo, borderColor: ESTILO.folga.cor, color: ESTILO.folga.texto }
                            : travado
                              ? { borderColor: "var(--linha)", color: "var(--tinta-faint)", background: d === 0 ? undefined : tint("var(--etapa-producao)", 7) }
                              : { borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }
                        }
                      >
                        {ativo ? <Check size={14} strokeWidth={3} /> : travado ? <Lock size={12} /> : null}
                        {NOME_DIA_CURTO[d]}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[12px] text-[var(--tinta-faint)] mt-1.5">Sexta e sábado nunca têm folga. Domingo de folga vem pelo rodízio da equipe.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <Rotulo ajuda={nFolgas ? "Usado se as folgas estiverem no automático." : "Primeiro dia de trabalho: define a alternância."}>Início do ciclo</Rotulo>
                <input type="date" value={c.ancora} onChange={(e) => atualizar({ ancora: e.target.value })} className={campo} style={estiloCampo} />
              </label>
              {nFolgas > 0 && (
                <label className="block">
                  <Rotulo ajuda="Padrão do restaurante, ou só pra esta pessoa.">Domingo de folga</Rotulo>
                  <select
                    value={c.intervaloDomingoSemanas ?? ""}
                    onChange={(e) => atualizar({ intervaloDomingoSemanas: e.target.value ? Number(e.target.value) : null })}
                    className={campo}
                    style={estiloCampo}
                  >
                    <option value="">Padrão (a cada {regras.intervaloDomingoSemanas} semanas)</option>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>A cada {n} {n === 1 ? "semana" : "semanas"}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <Rotulo>Entrada</Rotulo>
                <input type="time" value={c.turnoInicio ?? ""} onChange={(e) => atualizar({ turnoInicio: e.target.value || null })} className={campo} style={estiloCampo} />
              </label>
              <label className="block">
                <Rotulo>Saída</Rotulo>
                <input type="time" value={c.turnoFim ?? ""} onChange={(e) => atualizar({ turnoFim: e.target.value || null })} className={campo} style={estiloCampo} />
              </label>
            </div>
          </fieldset>

          <section aria-label="Prévia das próximas 2 semanas">
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--tinta-faint)] mb-2">Prévia: próximas 2 semanas</h3>
            {previa ? (
              <div className="grid grid-cols-7 gap-1">
                {previa.map((d) => (
                  <div key={d.data} className="rounded-md px-1 py-1.5 text-center" style={{ background: ESTILO[d.situacao].fundo, outline: ehPico(d.data) ? `1px solid ${tint("var(--etapa-producao)", 50)}` : undefined }} title={d.ajuste}>
                    <div className="text-[10px]" style={{ color: "var(--tinta-faint)" }}>{SIGLA_DIA[diaSemanaDe(d.data)]} {Number(d.data.slice(8, 10))}</div>
                    <div className="text-[12px] font-semibold" style={{ color: ESTILO[d.situacao].texto }}>{ESTILO[d.situacao].sigla || "–"}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-[var(--tinta-faint)]">Complete os campos pra ver a prévia.</p>
            )}
          </section>
        </div>

        <footer className="sticky bottom-0 px-5 py-4 border-t space-y-3" style={{ background: "var(--panel)", borderColor: "var(--linha)" }}>
          {erro && (
            <p role="alert" className="text-[14px] rounded-lg px-3 py-2" style={{ background: tint("var(--etapa-perda)", 10), color: "var(--etapa-perda-texto)" }}>
              {erro}
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={aoFechar} className="min-h-11 px-4 rounded-lg border text-[14px] font-medium" style={{ borderColor: "var(--linha-forte)" }}>
              Cancelar
            </button>
            <button onClick={salvar} disabled={salvando} className="flex-1 min-h-11 px-4 rounded-lg text-[14px] font-semibold disabled:opacity-60" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
              {salvando ? "Salvando..." : pessoa ? "Salvar escala" : "Adicionar pessoa"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
