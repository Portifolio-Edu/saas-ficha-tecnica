"use client";

// PERFIL (2026-09-27): prontuário de competências de uma pessoa (painel
// lateral). Nível técnico, praças de domínio, pontos fortes, gargalos e
// observação interna são salvos juntos ("Salvar perfil"); as notas de
// assiduidade e postura são salvas na hora, uma a uma. Mostra ao vivo como a
// pessoa entra na busca de extras se faltar (mesmo cruzamento do alerta de
// contingência). Só dono e gestor abrem; a cozinha nunca vê.

import { useEffect, useMemo, useState } from "react";
import { X, Lock, Pencil, Trash2, CalendarClock, UserSearch } from "lucide-react";
import {
  LIMITACOES,
  LIMITES,
  NIVEIS,
  PONTOS_FORTES,
  PRACAS,
  TIPOS_NOTA,
  normalizarPerfil,
  resumoAssiduidade,
  rotuloNivel,
  validarNota,
  validarPerfil,
  type NotaInput,
  type NotaPerfil,
  type PerfilInput,
  type TipoNota,
} from "@/lib/escalas/perfil";
import { extrasCompativeis, type Extra } from "@/lib/escalas/extras";
import type { OcorrenciaRegistro, PessoaEscala } from "@/lib/escalas/cadastro";
import type { DataISO } from "@/lib/escalas/tipos";
import { Gaveta } from "./Gaveta";
import { SeletorTags, Tag, type TomTag } from "./Tags";
import { ROTULO_SETOR, diaMes, tint } from "./visual";
import { resumoRegime } from "./GradeEscala";
import { paraMotor } from "@/lib/escalas/cadastro";

type Resultado = { ok: true } | { ok: false; erro: string };

const TOM_NOTA: Record<TipoNota, TomTag> = { elogio: "forte", pontualidade: "neutro", postura: "neutro", atencao: "limite" };

export function tempoDeCasa(admissao: DataISO | null, hoje: DataISO): string | null {
  if (!admissao || admissao > hoje) return null;
  const [a1, m1, d1] = admissao.split("-").map(Number);
  const [a2, m2, d2] = hoje.split("-").map(Number);
  let meses = (a2 - a1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
  if (meses < 1) {
    const dias = Math.round((Date.parse(`${hoje}T00:00:00Z`) - Date.parse(`${admissao}T00:00:00Z`)) / 86_400_000);
    return dias <= 1 ? "entrou agora" : `${dias} dias de casa`;
  }
  const anos = Math.floor(meses / 12);
  meses %= 12;
  const partes = [anos ? `${anos} ${anos === 1 ? "ano" : "anos"}` : "", meses ? `${meses} ${meses === 1 ? "mês" : "meses"}` : ""].filter(Boolean);
  return `${partes.join(" e ")} de casa`;
}

export function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

function Secao({ titulo, ajuda, children }: { titulo: string; ajuda?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--tinta-faint)]">{titulo}</h3>
        {ajuda && <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5">{ajuda}</p>}
      </div>
      {children}
    </section>
  );
}

export function ProntuarioPessoa({
  pessoa,
  ocorrencias,
  notas,
  extras,
  hoje,
  aoSalvarPerfil,
  aoCriarNota,
  aoRemoverNota,
  aoEditarEscala,
  aoFechar,
}: {
  pessoa: PessoaEscala;
  ocorrencias: OcorrenciaRegistro[];
  notas: NotaPerfil[];
  extras: Extra[];
  hoje: DataISO;
  aoSalvarPerfil: (funcionarioId: string, p: PerfilInput) => Promise<Resultado>;
  aoCriarNota: (n: NotaInput) => Promise<Resultado>;
  aoRemoverNota: (id: string) => Promise<Resultado>;
  aoEditarEscala: () => void;
  aoFechar: () => void;
}) {
  const inicial: PerfilInput = useMemo(
    () => ({ nivel: pessoa.perfil.nivel, pracas: pessoa.perfil.pracas, pontosFortes: pessoa.perfil.pontosFortes, limitacoes: pessoa.perfil.limitacoes, observacoes: pessoa.perfil.observacoes }),
    [pessoa.perfil],
  );
  const [p, setP] = useState<PerfilInput>(inicial);
  const [base, setBase] = useState(() => JSON.stringify(normalizarPerfil(inicial)));
  const [estado, setEstado] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const alterado = JSON.stringify(normalizarPerfil(p)) !== base;
  const atualizar = (parcial: Partial<PerfilInput>) => {
    setEstado(null);
    setP((a) => ({ ...a, ...parcial }));
  };

  const fechar = () => {
    if (alterado && !window.confirm("O perfil tem mudanças que não foram salvas. Fechar mesmo assim?")) return;
    aoFechar();
  };
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  });

  const salvar = async () => {
    const perfil = normalizarPerfil(p);
    const problema = validarPerfil(perfil);
    if (problema) return setEstado({ tipo: "erro", texto: problema });
    setSalvando(true);
    const r = await aoSalvarPerfil(pessoa.id, perfil);
    setSalvando(false);
    if (!r.ok) return setEstado({ tipo: "erro", texto: r.erro });
    setP(perfil);
    setBase(JSON.stringify(perfil));
    setEstado({ tipo: "ok", texto: "Perfil salvo." });
  };

  const setor = pessoa.setor ?? "cozinha";
  const motor = pessoa.setor && pessoa.cargo && pessoa.admissao && pessoa.escala ? paraMotor([pessoa])[0] : null;
  const vaga = { setor, cargo: pessoa.cargo ?? "", nivel: p.nivel ?? undefined, habilidades: normalizarPerfil(p).pracas };
  const compativeis = pessoa.cargo ? extrasCompativeis(vaga, extras) : [];
  const completos = compativeis.filter((c) => c.completo).length;
  const assiduidade = resumoAssiduidade(ocorrencias, pessoa.id, hoje);
  const minhasNotas = notas.filter((n) => n.funcionarioId === pessoa.id);
  const atencoes90 = minhasNotas.filter((n) => n.tipo === "atencao" && n.data >= assiduidade.desde).length;
  const casa = tempoDeCasa(pessoa.admissao, hoje);

  return (
    <Gaveta rotulo={`Prontuário de ${pessoa.nome}`} largura={640} aoFechar={fechar}>
      <header className="sticky top-0 z-10 px-5 py-4 flex items-center gap-3 border-b" style={{ background: "var(--panel)", borderColor: "var(--linha)" }}>
        <span className="w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-semibold shrink-0" style={{ background: tint("var(--etapa-estoque)", 16), color: "var(--etapa-estoque-texto)" }} aria-hidden>
          {iniciais(pessoa.nome)}
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-[17px] font-semibold leading-tight truncate">Prontuário de {pessoa.nome}</h2>
          <p className="text-[13px] text-[var(--tinta-sub)] truncate">
            {[pessoa.setor && ROTULO_SETOR[pessoa.setor], pessoa.cargo, motor && resumoRegime(motor), casa].filter(Boolean).join(" · ") || "Cadastro de escala incompleto"}
          </p>
        </div>
        <button onClick={fechar} aria-label="Fechar" className="w-10 h-10 -mr-2 rounded-lg flex items-center justify-center text-[var(--tinta-faint)] hover:bg-[var(--panel-hover)]">
          <X size={20} />
        </button>
      </header>

      <div className="px-5 py-5 space-y-7 flex-1">
        <p className="flex items-center gap-2 text-[12px] text-[var(--tinta-faint)]">
          <Lock size={13} /> Só dono e gestor veem. Aqui vai desempenho no trabalho, nunca saúde ou diagnóstico.
        </p>

        <Secao titulo="Nível técnico">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" role="radiogroup" aria-label="Nível técnico">
            {NIVEIS.map((n) => {
              const ativo = p.nivel === n.id;
              return (
                <button
                  key={n.id}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => atualizar({ nivel: ativo ? null : n.id })}
                  className="min-h-[64px] px-3 py-2 rounded-lg border text-left transition-colors"
                  style={ativo ? { background: tint("var(--etapa-estoque)", 14), borderColor: "var(--etapa-estoque)" } : { borderColor: "var(--linha-forte)" }}
                >
                  <span className="block text-[14px] font-semibold" style={{ color: ativo ? "var(--etapa-estoque-texto)" : "var(--tinta)" }}>
                    {n.rotulo}
                  </span>
                  <span className="block text-[12px] text-[var(--tinta-sub)] leading-snug">{n.descricao}</span>
                </button>
              );
            })}
          </div>
        </Secao>

        <Secao titulo="Praças de domínio" ajuda="O que a pessoa segura sozinha. É isso que a busca de extra cruza quando ela falta.">
          <SeletorTags rotulo="Praças de domínio" tom="praca" sugestoes={PRACAS[setor]} valor={p.pracas} onChange={(pracas) => atualizar({ pracas })} placeholder="Outra praça…" />
          <div className="rounded-lg border px-3 py-2.5 flex gap-2.5 text-[13px]" style={{ borderColor: "var(--linha)", background: "var(--panel-elevated)" }}>
            <UserSearch size={16} className="shrink-0 mt-0.5 text-[var(--tinta-faint)]" />
            <p className="text-[var(--tinta-sub)]">
              {pessoa.cargo ? (
                <>
                  Se {pessoa.nome.split(" ")[0]} faltar, a busca procura <strong className="text-[var(--tinta)]">{pessoa.cargo}</strong>
                  {p.nivel ? <>, nível <strong className="text-[var(--tinta)]">{rotuloNivel(p.nivel)}</strong> ou acima</> : null}
                  {vaga.habilidades.length ? <>, com {vaga.habilidades.join(", ")}</> : null}.{" "}
                  <span className="text-[var(--tinta)] font-medium">
                    {compativeis.length === 0 ? "Nenhum extra compatível no banco hoje." : `${compativeis.length} ${compativeis.length === 1 ? "extra compatível" : "extras compatíveis"} no banco${completos ? ` (${completos} ${completos === 1 ? "cobre" : "cobrem"} todas as praças)` : ""}.`}
                  </span>
                </>
              ) : (
                "Complete o cargo na escala pra entrar na busca de extras."
              )}
            </p>
          </div>
        </Secao>

        <Secao titulo="Pontos fortes">
          <SeletorTags rotulo="Pontos fortes" tom="forte" sugestoes={PONTOS_FORTES} valor={p.pontosFortes} onChange={(pontosFortes) => atualizar({ pontosFortes })} placeholder="Outro ponto forte…" />
        </Secao>

        <Secao titulo="Gargalos e limitações" ajuda="Pra decidir escala e treinamento. Ninguém além da gestão vê.">
          <SeletorTags rotulo="Gargalos e limitações" tom="limite" sugestoes={LIMITACOES} valor={p.limitacoes} onChange={(limitacoes) => atualizar({ limitacoes })} placeholder="Outra limitação…" />
          <label className="block">
            <span className="block text-[13px] font-medium mb-1.5">Observação interna</span>
            <textarea
              value={p.observacoes ?? ""}
              onChange={(e) => atualizar({ observacoes: e.target.value || null })}
              rows={3}
              maxLength={LIMITES.observacoes}
              placeholder="Ex.: rende muito no almoço; no jantar de sábado ainda precisa de alguém do lado na chapa."
              className="w-full px-3 py-2.5 rounded-lg border bg-[var(--panel)] text-[14px] outline-none focus:ring-2 focus:ring-[var(--marca-suave)]"
              style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }}
            />
          </label>
        </Secao>

        <Notas
          pessoa={pessoa}
          notas={minhasNotas}
          hoje={hoje}
          faltas={assiduidade.faltas}
          atestados={assiduidade.atestados}
          atencoes={atencoes90}
          aoCriar={aoCriarNota}
          aoRemover={aoRemoverNota}
        />
      </div>

      <footer className="sticky bottom-0 px-5 py-4 border-t space-y-3" style={{ background: "var(--panel)", borderColor: "var(--linha)" }}>
        {estado && (
          <p role={estado.tipo === "erro" ? "alert" : "status"} className="text-[14px] rounded-lg px-3 py-2" style={{ background: tint(estado.tipo === "erro" ? "var(--etapa-perda)" : "var(--etapa-produzido)", 10), color: estado.tipo === "erro" ? "var(--etapa-perda-texto)" : "var(--etapa-produzido-texto)" }}>
            {estado.texto}
          </p>
        )}
        <div className="flex gap-2">
          <button onClick={aoEditarEscala} className="min-h-11 px-4 rounded-lg border text-[14px] font-medium inline-flex items-center gap-2" style={{ borderColor: "var(--linha-forte)" }}>
            <Pencil size={14} /> Escala
          </button>
          <button onClick={salvar} disabled={salvando || !alterado} className="flex-1 min-h-11 px-4 rounded-lg text-[14px] font-semibold disabled:opacity-50" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
            {salvando ? "Salvando..." : alterado ? "Salvar perfil" : "Perfil salvo"}
          </button>
        </div>
      </footer>
    </Gaveta>
  );
}

function Notas({
  pessoa,
  notas,
  hoje,
  faltas,
  atestados,
  atencoes,
  aoCriar,
  aoRemover,
}: {
  pessoa: PessoaEscala;
  notas: NotaPerfil[];
  hoje: DataISO;
  faltas: number;
  atestados: number;
  atencoes: number;
  aoCriar: (n: NotaInput) => Promise<Resultado>;
  aoRemover: (id: string) => Promise<Resultado>;
}) {
  const [tipo, setTipo] = useState<TipoNota>("elogio");
  const [data, setData] = useState(hoje);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [verTodas, setVerTodas] = useState(false);

  const registrar = async () => {
    const n = { funcionarioId: pessoa.id, tipo, data, texto };
    const problema = validarNota(n, hoje);
    if (problema) return setErro(problema);
    setSalvando(true);
    const r = await aoCriar({ ...n, texto: texto.trim() });
    setSalvando(false);
    if (!r.ok) return setErro(r.erro);
    setTexto("");
    setErro(null);
  };
  const remover = async (n: NotaPerfil) => {
    if (!window.confirm(`Apagar a nota de ${diaMes(n.data)}?`)) return;
    const r = await aoRemover(n.id);
    if (!r.ok) setErro(r.erro);
  };
  const visiveis = verTodas ? notas : notas.slice(0, 5);

  return (
    <Secao titulo="Assiduidade e comportamento" ajuda="Faltas e atestados vêm do prontuário de ocorrências. As notas são salvas na hora.">
      <div className="grid grid-cols-3 gap-2">
        {[
          { rotulo: "Faltas", valor: faltas, alerta: faltas >= 2 },
          { rotulo: "Dias de atestado", valor: atestados, alerta: false },
          { rotulo: "Pontos de atenção", valor: atencoes, alerta: atencoes >= 2 },
        ].map((k) => (
          <div key={k.rotulo} className="rounded-lg border px-3 py-2.5" style={{ borderColor: k.alerta ? tint("var(--etapa-perda)", 40) : "var(--linha)", background: k.alerta ? tint("var(--etapa-perda)", 7) : "var(--panel-elevated)" }}>
            <div className="text-[22px] font-semibold tabular-nums leading-none" style={{ color: k.alerta ? "var(--etapa-perda-texto)" : "var(--tinta)" }}>
              {k.valor}
            </div>
            <div className="text-[12px] text-[var(--tinta-sub)] mt-1">{k.rotulo}</div>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-[var(--tinta-faint)] -mt-1">Últimos 90 dias.</p>

      <div className="rounded-lg border p-3 space-y-2.5" style={{ borderColor: "var(--linha)" }}>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo da nota">
          {TIPOS_NOTA.map((t) => {
            const ativo = tipo === t.id;
            return (
              <button key={t.id} type="button" role="radio" aria-checked={ativo} onClick={() => setTipo(t.id)} className="min-h-9 px-2.5 rounded-lg border text-[13px] font-medium" style={ativo ? { background: "var(--tinta)", color: "var(--panel)", borderColor: "var(--tinta)" } : { borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}>
                {t.rotulo}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input type="date" value={data} max={hoje} onChange={(e) => setData(e.target.value)} aria-label="Data da nota" className="min-h-10 px-2.5 rounded-lg border bg-[var(--panel)] text-[14px] w-[150px] shrink-0" style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }} />
          <input
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value.slice(0, LIMITES.nota));
              setErro(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && registrar()}
            placeholder={tipo === "elogio" ? "Ex.: segurou a grelha sozinho no sábado" : tipo === "pontualidade" ? "Ex.: chegou 40 min atrasado" : tipo === "postura" ? "Ex.: ótimo com o cliente da mesa 12" : "Ex.: esqueceu de etiquetar os molhos"}
            aria-label="Texto da nota"
            className="flex-1 min-w-0 min-h-10 px-3 rounded-lg border bg-[var(--panel)] text-[14px] outline-none focus:ring-2 focus:ring-[var(--marca-suave)]"
            style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }}
          />
        </div>
        {erro && (
          <p role="alert" className="text-[13px]" style={{ color: "var(--etapa-perda-texto)" }}>
            {erro}
          </p>
        )}
        <button onClick={registrar} disabled={salvando || !texto.trim()} className="w-full min-h-10 rounded-lg border text-[14px] font-semibold disabled:opacity-40" style={{ borderColor: "var(--linha-forte)" }}>
          {salvando ? "Registrando..." : "Registrar nota"}
        </button>
      </div>

      {notas.length === 0 ? (
        <p className="text-[13px] text-[var(--tinta-faint)] flex items-center gap-2">
          <CalendarClock size={15} /> Nenhuma nota ainda.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border" style={{ borderColor: "var(--linha)" }} aria-label="Notas">
          {visiveis.map((n) => (
            <li key={n.id} className="px-3 py-2.5 flex items-start gap-3" style={{ borderColor: "var(--linha)" }}>
              <span className="text-[12px] tabular-nums text-[var(--tinta-faint)] w-11 shrink-0 pt-0.5">{diaMes(n.data)}</span>
              <div className="flex-1 min-w-0">
                <Tag tom={TOM_NOTA[n.tipo]}>{TIPOS_NOTA.find((t) => t.id === n.tipo)?.rotulo}</Tag>
                <p className="text-[14px] mt-1">{n.texto}</p>
                {n.autor && <p className="text-[12px] text-[var(--tinta-faint)] mt-0.5">por {n.autor}</p>}
              </div>
              <button onClick={() => remover(n)} aria-label="Apagar nota" className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--tinta-faint)] hover:text-[var(--etapa-perda-texto)] hover:bg-[var(--panel-hover)]">
                <Trash2 size={15} />
              </button>
            </li>
          ))}
          {notas.length > 5 && (
            <li>
              <button onClick={() => setVerTodas((v) => !v)} className="w-full min-h-10 px-3 text-[13px] font-medium text-left text-[var(--tinta-sub)] hover:bg-[var(--panel-hover)]">
                {verTodas ? "Mostrar menos" : `Ver todas as ${notas.length} notas`}
              </button>
            </li>
          )}
        </ul>
      )}
    </Secao>
  );
}
