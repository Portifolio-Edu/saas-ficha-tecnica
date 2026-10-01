"use client";

// PERFIL (2026-09-27): aba Equipe em cartões — o perfil de cada pessoa num
// relance: nível, praças de domínio (laranja), pontos fortes (azul),
// limitações (vermelho), assiduidade dos últimos 90 dias e a escala.
// Filtros por setor, nível e praça ("quem segura a grelha?"). Tocar em
// "Prontuário" abre o perfil completo; "Escala" abre o cadastro da escala.

import { useMemo, useState } from "react";
import { Search, Pencil, ClipboardList, AlertTriangle } from "lucide-react";
import { NIVEIS, chaveTag, resumoAssiduidade, rotuloNivel, type NotaPerfil } from "@/lib/escalas/perfil";
import { cadastroCompleto, paraMotor, type OcorrenciaRegistro, type PessoaEscala } from "@/lib/escalas/cadastro";
import type { DataISO, Setor } from "@/lib/escalas/tipos";
import { ListaTags } from "./Tags";
import { resumoRegime } from "./GradeEscala";
import { ROTULO_SETOR, tint } from "./visual";
import { iniciais, tempoDeCasa } from "./ProntuarioPessoa";

const SETORES: (Setor | "todos")[] = ["todos", "cozinha", "salao", "bar", "outro"];

export function EquipePerfis({
  pessoas,
  ocorrencias,
  notas,
  hoje,
  aoAbrirProntuario,
  aoEditarEscala,
}: {
  pessoas: PessoaEscala[];
  ocorrencias: OcorrenciaRegistro[];
  notas: NotaPerfil[];
  hoje: DataISO;
  aoAbrirProntuario: (p: PessoaEscala) => void;
  aoEditarEscala: (p: PessoaEscala) => void;
}) {
  const [busca, setBusca] = useState("");
  const [setor, setSetor] = useState<Setor | "todos">("todos");
  const [nivel, setNivel] = useState("");
  const [praca, setPraca] = useState("");

  const pracas = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of pessoas) for (const t of p.perfil.pracas) if (!m.has(chaveTag(t))) m.set(chaveTag(t), t);
    return [...m.values()].sort((a, b) => a.localeCompare(b));
  }, [pessoas]);
  const setoresPresentes = SETORES.filter((s) => s === "todos" || pessoas.some((p) => p.setor === s));

  const lista = pessoas
    .filter((p) => setor === "todos" || p.setor === setor)
    .filter((p) => !nivel || (nivel === "sem" ? !p.perfil.nivel : p.perfil.nivel === nivel))
    .filter((p) => !praca || p.perfil.pracas.some((t) => chaveTag(t) === chaveTag(praca)))
    .filter((p) => !busca.trim() || chaveTag(p.nome).includes(chaveTag(busca)) || chaveTag(p.cargo ?? "").includes(chaveTag(busca)))
    .sort((a, b) => (a.setor ?? "zz").localeCompare(b.setor ?? "zz") || (a.cargo ?? "").localeCompare(b.cargo ?? "") || a.nome.localeCompare(b.nome));

  const semPerfil = pessoas.filter((p) => !p.perfil.nivel || p.perfil.pracas.length === 0).length;
  const filtrando = setor !== "todos" || nivel || praca || busca.trim();

  if (pessoas.length === 0) {
    return (
      <p className="text-[14px] text-[var(--tinta-sub)] rounded-xl border border-dashed px-4 py-10 text-center" style={{ borderColor: "var(--linha-forte)" }}>
        Ninguém cadastrado ainda. Toque em Adicionar pessoa.
      </p>
    );
  }

  return (
    <section aria-label="Perfil da equipe" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tinta-faint)]" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou cargo" aria-label="Buscar pessoa" className="w-full min-h-10 pl-9 pr-3 rounded-lg border bg-[var(--panel)] text-[14px] outline-none focus:ring-2 focus:ring-[var(--marca-suave)]" style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }} />
        </label>
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Setor">
          {setoresPresentes.map((s) => (
            <button key={s} role="radio" aria-checked={setor === s} onClick={() => setSetor(s)} className="min-h-10 px-3 rounded-lg border text-[13px] font-medium" style={setor === s ? { background: "var(--tinta)", color: "var(--panel)", borderColor: "var(--tinta)" } : { borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}>
              {s === "todos" ? "Todos" : ROTULO_SETOR[s]}
            </button>
          ))}
        </div>
        <select value={nivel} onChange={(e) => setNivel(e.target.value)} aria-label="Nível" className="min-h-10 px-3 rounded-lg border bg-[var(--panel)] text-[13px]" style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }}>
          <option value="">Todos os níveis</option>
          {NIVEIS.map((n) => <option key={n.id} value={n.id}>{n.rotulo}</option>)}
          <option value="sem">Sem nível</option>
        </select>
        {pracas.length > 0 && (
          <select value={praca} onChange={(e) => setPraca(e.target.value)} aria-label="Praça" className="min-h-10 px-3 rounded-lg border bg-[var(--panel)] text-[13px]" style={{ borderColor: "var(--linha-forte)", color: "var(--tinta)" }}>
            <option value="">Todas as praças</option>
            {pracas.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {semPerfil > 0 && !filtrando && (
        <p className="flex items-start gap-2 text-[13px] rounded-lg px-3 py-2.5" style={{ background: tint("var(--etapa-producao)", 9), color: "var(--etapa-producao-texto)" }}>
          <AlertTriangle size={15} className="shrink-0 mt-px" />
          {semPerfil === 1 ? "1 pessoa está" : `${semPerfil} pessoas estão`} sem nível ou sem praças no prontuário. Sem isso, a busca de extra quando alguém falta fica genérica.
        </p>
      )}

      {lista.length === 0 ? (
        <p className="text-[14px] text-[var(--tinta-sub)] rounded-xl border border-dashed px-4 py-8 text-center" style={{ borderColor: "var(--linha-forte)" }}>
          Ninguém com esses filtros.
        </p>
      ) : (
        <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {lista.map((p) => (
            <Cartao key={p.id} pessoa={p} ocorrencias={ocorrencias} notas={notas} hoje={hoje} aoAbrir={() => aoAbrirProntuario(p)} aoEscala={() => aoEditarEscala(p)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Cartao({
  pessoa: p,
  ocorrencias,
  notas,
  hoje,
  aoAbrir,
  aoEscala,
}: {
  pessoa: PessoaEscala;
  ocorrencias: OcorrenciaRegistro[];
  notas: NotaPerfil[];
  hoje: DataISO;
  aoAbrir: () => void;
  aoEscala: () => void;
}) {
  const completo = cadastroCompleto(p);
  const motor = completo ? paraMotor([p])[0] : null;
  const a = resumoAssiduidade(ocorrencias, p.id, hoje);
  const atencoes = notas.filter((n) => n.funcionarioId === p.id && n.tipo === "atencao" && n.data >= a.desde).length;
  const elogios = notas.filter((n) => n.funcionarioId === p.id && n.tipo === "elogio" && n.data >= a.desde).length;
  const casa = tempoDeCasa(p.admissao, hoje);
  const sinais = [
    a.faltas ? `${a.faltas} ${a.faltas === 1 ? "falta" : "faltas"}` : null,
    a.atestados ? `${a.atestados} ${a.atestados === 1 ? "dia" : "dias"} de atestado` : null,
    elogios ? `${elogios} ${elogios === 1 ? "elogio" : "elogios"}` : null,
    atencoes ? `${atencoes} ${atencoes === 1 ? "ponto" : "pontos"} de atenção` : null,
  ].filter(Boolean);

  return (
    <li className="rounded-xl border p-4 flex flex-col gap-3" style={{ borderColor: "var(--linha)", background: "var(--panel)" }}>
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-semibold shrink-0" style={{ background: tint("var(--etapa-estoque)", 14), color: "var(--etapa-estoque-texto)" }} aria-hidden>
          {iniciais(p.nome)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold truncate">{p.nome}</div>
          <div className="text-[13px] text-[var(--tinta-sub)] truncate">{[p.cargo, p.setor && ROTULO_SETOR[p.setor]].filter(Boolean).join(" · ") || "Sem cargo"}</div>
        </div>
        {p.perfil.nivel ? (
          <span className="text-[12px] font-semibold px-2 py-1 rounded-md shrink-0" style={{ background: tint("var(--etapa-estoque)", 16), color: "var(--etapa-estoque-texto)" }}>
            {rotuloNivel(p.perfil.nivel)}
          </span>
        ) : (
          <span className="text-[12px] font-medium px-2 py-1 rounded-md border border-dashed shrink-0 text-[var(--tinta-faint)]" style={{ borderColor: "var(--linha-forte)" }}>
            Sem nível
          </span>
        )}
      </div>

      <div className="space-y-2">
        <ListaTags tags={p.perfil.pracas} tom="praca" max={5} vazio="Sem praças no prontuário" />
        {(p.perfil.pontosFortes.length > 0 || p.perfil.limitacoes.length > 0) && (
          <div className="flex flex-wrap gap-1">
            <ListaTags tags={p.perfil.pontosFortes} tom="forte" max={2} />
            <ListaTags tags={p.perfil.limitacoes} tom="limite" max={2} />
          </div>
        )}
      </div>

      <div className="mt-auto pt-3 border-t text-[12px] text-[var(--tinta-sub)] space-y-0.5" style={{ borderColor: "var(--linha)" }}>
        <div>{motor ? resumoRegime(motor) : <span style={{ color: "var(--etapa-producao-texto)" }}>Sem escala configurada</span>}{casa ? ` · ${casa}` : ""}</div>
        <div>{sinais.length ? `90 dias: ${sinais.join(" · ")}` : "90 dias: nenhuma falta nem nota"}</div>
      </div>

      <div className="flex gap-2">
        <button onClick={aoAbrir} className="flex-1 min-h-10 px-3 rounded-lg border text-[13px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-[var(--panel-hover)]" style={{ background: "var(--panel-elevated)", borderColor: "var(--linha-forte)", color: "var(--tinta)" }}>
          <ClipboardList size={15} /> Prontuário
        </button>
        <button onClick={aoEscala} className="min-h-10 px-3 rounded-lg border text-[13px] font-medium inline-flex items-center gap-2" style={{ borderColor: "var(--linha-forte)" }} aria-label={`${completo ? "Editar" : "Configurar"} escala de ${p.nome}`}>
          <Pencil size={14} /> {completo ? "Escala" : "Configurar"}
        </button>
      </div>
    </li>
  );
}
