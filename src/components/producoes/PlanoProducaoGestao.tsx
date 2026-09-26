"use client";

// LISTA DE PRODUÇÃO (2026-09-26): no painel (e no celular), dono e gestor
// montam o que a cozinha tem que produzir hoje ou amanhã. Aparece embaixo do
// quadro de Produção no tablet; a cozinha também pode pôr itens. O progresso
// de hoje sai sozinho do que foi produzido (em produção + pronto; perda não
// conta). Pôr de novo a mesma ficha no mesmo dia muda a quantidade.
// Usado em /producoes (ações do servidor) e /preview/producoes (demo).

import { useMemo, useState } from "react";
import { Check, CircleDashed, Flame, ListChecks, Trash2 } from "lucide-react";
import { Card } from "@/components/ficha/Card";
import { useToast } from "@/components/ficha/Toast";
import { formatQtd } from "@/components/charts/format";
import { unidadeNoPlural } from "./formato";
import { progressoDoPlano, resumoDoPlano, type ItemPlano } from "@/lib/dominio/planoProducao";
import type { StatusProducao } from "@/lib/dominio/producao";

type Resultado = { ok: true; aviso?: string } | { ok: false; erro: string };

export interface ReceitaPlano {
  id: string;
  nome: string;
  tipo: "prato_final" | "preparo_base";
  rendimento: number;
  unidade: string;
}

export interface AcoesPlano {
  adicionar: (data: string, receitaId: string, quantidade: number, observacao: string | null) => Promise<Resultado>;
  tirar: (id: string) => Promise<Resultado>;
}

const ESTADO = {
  falta: { rotulo: "Falta", texto: "var(--etapa-estoque-texto)", Icone: CircleDashed },
  em_producao: { rotulo: "No fogo", texto: "var(--etapa-producao-texto)", Icone: Flame },
  feito: { rotulo: "Feito", texto: "var(--etapa-produzido-texto)", Icone: Check },
} as const;

const campo = "min-h-11 md:min-h-10 px-3 rounded-lg border bg-[var(--panel)] text-[var(--tinta)] text-[14px] outline-none focus:ring-2 focus:ring-[var(--marca-suave)]";

export function PlanoProducaoGestao({
  receitas,
  plano,
  producoesHoje,
  hoje,
  amanha,
  acoes,
}: {
  receitas: ReceitaPlano[];
  /** Itens de hoje e de amanhã. */
  plano: ItemPlano[];
  producoesHoje: { receitaId: string; quantidade: number; status: StatusProducao }[];
  hoje: string;
  amanha: string;
  acoes: AcoesPlano;
}) {
  const { mostrarErro, mostrarSucesso, mostrarInfo } = useToast();
  const [dia, setDia] = useState<"hoje" | "amanha">("hoje");
  const [receitaId, setReceitaId] = useState("");
  const [qtd, setQtd] = useState("");
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);
  const data = dia === "hoje" ? hoje : amanha;
  const porId = useMemo(() => new Map(receitas.map((r) => [r.id, r])), [receitas]);
  const doDia = plano.filter((i) => i.data === data);
  const progresso = progressoDoPlano(doDia, dia === "hoje" ? producoesHoje : []);
  const resumo = resumoDoPlano(progresso);
  const escolhida = porId.get(receitaId);

  const adicionar = async () => {
    const q = Number(qtd.replace(",", "."));
    if (!receitaId) return mostrarErro("Escolha a ficha.");
    if (!(q > 0)) return mostrarErro("Informe quanto produzir.");
    setSalvando(true);
    const r = await acoes.adicionar(data, receitaId, q, obs.trim() || null);
    setSalvando(false);
    if (!r.ok) return mostrarErro(r.erro);
    if (r.aviso) mostrarInfo(r.aviso);
    else mostrarSucesso(`${escolhida?.nome ?? "Item"} na lista de ${dia === "hoje" ? "hoje" : "amanhã"}.`);
    setReceitaId("");
    setQtd("");
    setObs("");
  };

  const tirar = async (item: ItemPlano) => {
    const r = await acoes.tirar(item.id);
    if (!r.ok) return mostrarErro(r.erro);
    mostrarSucesso(`${porId.get(item.receitaId)?.nome ?? "Item"} saiu da lista.`);
  };

  const preparos = receitas.filter((r) => r.tipo === "preparo_base");
  const pratos = receitas.filter((r) => r.tipo === "prato_final");

  return (
    <Card className="p-0 overflow-hidden mb-5" >
      <section aria-label="Lista de produção">
        <div className="px-4 md:px-5 py-4 flex flex-wrap items-start justify-between gap-3 border-b" style={{ borderColor: "var(--linha)" }}>
          <div className="flex items-start gap-3 min-w-0">
            <ListChecks size={20} className="text-[var(--tinta-faint)] mt-0.5 shrink-0" aria-hidden />
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--tinta)]">Lista de produção</h2>
              <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5">
                O que a cozinha tem que produzir. Aparece embaixo do quadro de Produção no tablet e se marca sozinha quando a cozinha produz.
              </p>
            </div>
          </div>
          <div role="group" aria-label="Dia da lista" className="flex rounded-lg border p-0.5" style={{ borderColor: "var(--linha-forte)" }}>
            {(["hoje", "amanha"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDia(d)}
                aria-pressed={dia === d}
                className="min-h-10 md:min-h-8 px-3.5 rounded-md text-[13px] font-medium"
                style={dia === d ? { background: "var(--tinta)", color: "var(--panel)" } : { color: "var(--tinta-sub)" }}
              >
                {d === "hoje" ? "Hoje" : "Amanhã"}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 md:px-5 py-3 grid grid-cols-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)_auto] gap-2 items-end border-b" style={{ borderColor: "var(--linha)" }}>
          <label className="col-span-2 md:col-span-1 text-[12px] font-medium text-[var(--tinta-sub)]">
            Ficha
            <select value={receitaId} onChange={(e) => { setReceitaId(e.target.value); const r = porId.get(e.target.value); if (r && !qtd) setQtd(String(r.rendimento).replace(".", ",")); }} className={`${campo} w-full mt-1`} style={{ borderColor: "var(--linha-forte)" }}>
              <option value="">Escolha…</option>
              {preparos.length > 0 && <optgroup label="Preparos">{preparos.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}</optgroup>}
              {pratos.length > 0 && <optgroup label="Pratos">{pratos.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}</optgroup>}
            </select>
          </label>
          <label className="text-[12px] font-medium text-[var(--tinta-sub)]">
            Quanto{escolhida ? ` (${unidadeNoPlural(2, escolhida.unidade)})` : ""}
            <input value={qtd} onChange={(e) => setQtd(e.target.value.replace(/[^\d,.]/g, ""))} inputMode="decimal" className={`${campo} w-full mt-1 tabular-nums`} style={{ borderColor: "var(--linha-forte)" }} />
          </label>
          <label className="text-[12px] font-medium text-[var(--tinta-sub)]">
            Observação
            <input value={obs} maxLength={140} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" className={`${campo} w-full mt-1`} style={{ borderColor: "var(--linha-forte)" }} />
          </label>
          <button
            onClick={adicionar}
            disabled={salvando}
            className="col-span-2 md:col-span-1 min-h-11 md:min-h-10 px-4 rounded-lg text-[13px] font-medium disabled:opacity-60"
            style={{ background: "var(--tinta)", color: "var(--panel)" }}
          >
            {salvando ? "Pondo…" : "Pôr na lista"}
          </button>
        </div>

        {progresso.length === 0 ? (
          <p className="px-4 md:px-5 py-5 text-[14px] text-[var(--tinta-sub)]">Nada na lista de {dia === "hoje" ? "hoje" : "amanhã"} ainda.</p>
        ) : (
          <>
            {dia === "hoje" && (
              <p className="px-4 md:px-5 pt-3 text-[13px] text-[var(--tinta-sub)] tabular-nums">
                {resumo.feitos} de {resumo.total} feitos{resumo.faltam ? ` · ${resumo.faltam} sem começar` : ""}
              </p>
            )}
            <ul className="py-1">
              {progresso.map((p) => {
                const r = porId.get(p.item.receitaId);
                const e = ESTADO[p.estado];
                const un = (n: number) => unidadeNoPlural(n, r?.unidade ?? "");
                return (
                  <li key={p.item.id} className="px-4 md:px-5 py-2.5 flex items-center gap-3 border-t first:border-t-0" style={{ borderColor: "var(--linha)" }}>
                    {dia === "hoje" ? <e.Icone size={17} className="shrink-0" style={{ color: e.texto }} aria-label={e.rotulo} /> : <CircleDashed size={17} className="shrink-0 text-[var(--tinta-faint)]" aria-hidden />}
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] md:text-[14px] font-medium text-[var(--tinta)] truncate">{r?.nome ?? "Ficha removida"}</div>
                      <div className="text-[12.5px] text-[var(--tinta-sub)] truncate">
                        {[p.item.observacao, p.item.responsavel ? `por ${p.item.responsavel}` : null].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <div className="text-[14px] font-semibold text-[var(--tinta)]">{formatQtd(p.item.quantidade)} {un(p.item.quantidade)}</div>
                      {dia === "hoje" && (
                        <div className="text-[12px]" style={{ color: e.texto }}>
                          {p.estado === "feito" ? "feito" : p.estado === "em_producao" ? "no fogo" : p.feito + p.emProducao > 0 ? `falta ${formatQtd(p.falta)}` : "sem começar"}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => tirar(p.item)}
                      aria-label={`Tirar ${r?.nome ?? "item"} da lista`}
                      className="shrink-0 w-11 h-11 md:w-9 md:h-9 rounded-lg flex items-center justify-center text-[var(--tinta-faint)] hover:text-[var(--danger)] hover:bg-[var(--panel-hover)]"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </Card>
  );
}
