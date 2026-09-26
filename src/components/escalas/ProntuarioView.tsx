"use client";

// ESCALAS (2026-09-26): prontuário de ocorrências. Falta e atestado em dia de
// trabalho viram alerta de contingência; férias e afastamento tiram a pessoa
// da escala; restrição temporária muda o que ela pode fazer. Só dono/gestor
// veem esta aba; a cozinha vê apenas "ausente" no tablet.
// LGPD: aqui vai o efeito na escala, nunca diagnóstico ou CID.

import { useMemo, useState } from "react";
import { Trash2, ShieldCheck } from "lucide-react";
import { RESTRICOES, TIPOS_OCORRENCIA, validarOcorrencia, type OcorrenciaInput } from "@/lib/escalas/validacao";
import type { OcorrenciaRegistro, PessoaEscala } from "@/lib/escalas/cadastro";
import type { DataISO, Restricao } from "@/lib/escalas/tipos";
import { ESTILO, diaMes, tint } from "./visual";

type Resultado = { ok: true } | { ok: false; erro: string };

const campo = "w-full min-h-11 px-3 rounded-lg border bg-[var(--panel)] text-[15px] outline-none focus:ring-2 focus:ring-[var(--marca-suave)]";
const estiloCampo = { borderColor: "var(--linha-forte)", color: "var(--tinta)" } as const;

const ESTILO_TIPO: Record<OcorrenciaInput["tipo"], { fundo: string; texto: string }> = {
  falta: { fundo: ESTILO.falta.fundo, texto: ESTILO.falta.texto },
  atestado: { fundo: ESTILO.atestado.fundo, texto: ESTILO.atestado.texto },
  afastamento: { fundo: ESTILO.afastado.fundo, texto: ESTILO.afastado.texto },
  ferias: { fundo: ESTILO.ferias.fundo, texto: ESTILO.ferias.texto },
  restricao: { fundo: tint("var(--etapa-estoque)", 14), texto: "var(--etapa-estoque-texto)" },
};

export interface PreenchimentoOcorrencia {
  funcionarioId: string;
  data: DataISO;
}

export function ProntuarioView({
  pessoas,
  ocorrencias,
  hoje,
  preenchimento,
  aoCriar,
  aoRemover,
}: {
  pessoas: PessoaEscala[];
  ocorrencias: OcorrenciaRegistro[];
  hoje: DataISO;
  preenchimento: PreenchimentoOcorrencia | null;
  aoCriar: (o: OcorrenciaInput) => Promise<Resultado>;
  aoRemover: (id: string) => Promise<Resultado>;
}) {
  const vazio = (p: PreenchimentoOcorrencia | null): OcorrenciaInput => ({
    funcionarioId: p?.funcionarioId ?? "",
    tipo: "falta",
    inicio: p?.data ?? hoje,
    fim: p?.data ?? hoje,
    restricoes: [],
    nota: null,
  });
  const [o, setO] = useState<OcorrenciaInput>(() => vazio(preenchimento));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [filtro, setFiltro] = useState("");
  const nome = useMemo(() => new Map(pessoas.map((p) => [p.id, p.nome])), [pessoas]);
  const atualizar = (parcial: Partial<OcorrenciaInput>) => {
    setErro(null);
    setO((a) => ({ ...a, ...parcial }));
  };

  const criar = async () => {
    const problema = validarOcorrencia(o);
    if (problema) return setErro(problema);
    setSalvando(true);
    const r = await aoCriar(o);
    setSalvando(false);
    if (!r.ok) return setErro(r.erro);
    setO({ ...vazio(null), funcionarioId: o.funcionarioId });
  };

  const remover = async (oc: OcorrenciaRegistro) => {
    if (!window.confirm(`Apagar ${TIPOS_OCORRENCIA.find((t) => t.id === oc.tipo)?.rotulo.toLowerCase()} de ${nome.get(oc.funcionarioId) ?? "?"} (${diaMes(oc.inicio)} a ${diaMes(oc.fim)})? A escala volta ao normal nesses dias.`)) return;
    const r = await aoRemover(oc.id);
    if (!r.ok) setErro(r.erro);
  };

  const lista = ocorrencias.filter((x) => !filtro || x.funcionarioId === filtro);

  return (
    <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 items-start">
      <section className="rounded-xl border p-5 space-y-4" style={{ borderColor: "var(--linha)", background: "var(--panel)" }} aria-label="Nova ocorrência">
        <h2 className="text-[16px] font-semibold">Nova ocorrência</h2>
        <label className="block">
          <span className="block text-[13px] font-medium mb-1.5">Pessoa</span>
          <select value={o.funcionarioId} onChange={(e) => atualizar({ funcionarioId: e.target.value })} className={campo} style={estiloCampo}>
            <option value="">Escolha</option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}{p.cargo ? ` · ${p.cargo}` : ""}</option>
            ))}
          </select>
        </label>
        <div>
          <span className="block text-[13px] font-medium mb-1.5">Tipo</span>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo">
            {TIPOS_OCORRENCIA.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={o.tipo === t.id}
                onClick={() => atualizar({ tipo: t.id, restricoes: t.id === "restricao" ? o.restricoes : [] })}
                className="min-h-10 px-3 rounded-lg border text-[14px] font-medium"
                style={o.tipo === t.id ? { background: ESTILO_TIPO[t.id].fundo, color: ESTILO_TIPO[t.id].texto, borderColor: "transparent" } : { borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}
              >
                {t.rotulo}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-[13px] font-medium mb-1.5">De</span>
            <input type="date" value={o.inicio} onChange={(e) => atualizar({ inicio: e.target.value, fim: o.fim < e.target.value ? e.target.value : o.fim })} className={campo} style={estiloCampo} />
          </label>
          <label className="block">
            <span className="block text-[13px] font-medium mb-1.5">Até</span>
            <input type="date" value={o.fim} min={o.inicio} onChange={(e) => atualizar({ fim: e.target.value })} className={campo} style={estiloCampo} />
          </label>
        </div>
        {o.tipo === "restricao" && (
          <fieldset>
            <legend className="text-[13px] font-medium mb-1.5">O que muda</legend>
            <div className="space-y-1.5">
              {RESTRICOES.map((r) => {
                const marcado = o.restricoes.includes(r.id);
                return (
                  <label key={r.id} className="flex items-center gap-2.5 min-h-10 px-3 rounded-lg border cursor-pointer" style={{ borderColor: marcado ? "var(--tinta)" : "var(--linha-forte)" }}>
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => atualizar({ restricoes: marcado ? o.restricoes.filter((x) => x !== r.id) : ([...o.restricoes, r.id] as Restricao[]) })}
                      className="w-4 h-4"
                    />
                    <span className="text-[14px]">{r.rotulo}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
        <label className="block">
          <span className="block text-[13px] font-medium mb-1.5">Observação</span>
          <textarea value={o.nota ?? ""} onChange={(e) => atualizar({ nota: e.target.value || null })} rows={3} maxLength={500} className={`${campo} py-2.5`} style={estiloCampo} placeholder="Ex.: avisou por telefone às 9h" />
          <span className="flex items-start gap-1.5 text-[12px] text-[var(--tinta-faint)] mt-1.5">
            <ShieldCheck size={14} className="shrink-0 mt-px" /> Não escreva diagnóstico nem CID: dado de saúde é sensível (LGPD). Aqui vai só o que muda na escala.
          </span>
        </label>
        {erro && (
          <p role="alert" className="text-[14px] rounded-lg px-3 py-2" style={{ background: tint("var(--etapa-perda)", 10), color: "var(--etapa-perda-texto)" }}>
            {erro}
          </p>
        )}
        <button onClick={criar} disabled={salvando} className="w-full min-h-11 rounded-lg text-[14px] font-semibold disabled:opacity-60" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
          {salvando ? "Registrando..." : "Registrar ocorrência"}
        </button>
      </section>

      <section aria-label="Ocorrências registradas" className="min-w-0">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-[16px] font-semibold flex-1">Histórico</h2>
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="min-h-10 px-3 rounded-lg border bg-[var(--panel)] text-[14px]" style={estiloCampo} aria-label="Filtrar por pessoa">
            <option value="">Todas as pessoas</option>
            {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        {lista.length === 0 ? (
          <p className="text-[14px] text-[var(--tinta-sub)] rounded-xl border border-dashed px-4 py-8 text-center" style={{ borderColor: "var(--linha-forte)" }}>
            Nenhuma ocorrência registrada.
          </p>
        ) : (
          <ul className="rounded-xl border divide-y overflow-hidden" style={{ borderColor: "var(--linha)", background: "var(--panel)" }}>
            {lista.map((oc) => {
              const tipo = oc.tipo as OcorrenciaInput["tipo"];
              return (
                <li key={oc.id} className="px-4 py-3 flex items-start gap-3" style={{ borderColor: "var(--linha)" }}>
                  <span className="text-[12px] font-semibold px-2 py-1 rounded-md shrink-0" style={{ background: ESTILO_TIPO[tipo]?.fundo, color: ESTILO_TIPO[tipo]?.texto }}>
                    {TIPOS_OCORRENCIA.find((t) => t.id === tipo)?.rotulo ?? tipo}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium">{nome.get(oc.funcionarioId) ?? "Pessoa removida"}</div>
                    <div className="text-[13px] text-[var(--tinta-sub)] tabular-nums">
                      {oc.inicio === oc.fim ? diaMes(oc.inicio) : `${diaMes(oc.inicio)} a ${diaMes(oc.fim)}`}
                      {oc.restricoes && oc.restricoes.length > 0 && ` · ${oc.restricoes.map((r) => RESTRICOES.find((x) => x.id === r)?.rotulo).join(", ")}`}
                    </div>
                    {oc.nota && <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5">{oc.nota}</p>}
                  </div>
                  <button onClick={() => remover(oc)} aria-label="Apagar ocorrência" className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--tinta-faint)] hover:text-[var(--etapa-perda-texto)] hover:bg-[var(--panel-hover)]">
                    <Trash2 size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
