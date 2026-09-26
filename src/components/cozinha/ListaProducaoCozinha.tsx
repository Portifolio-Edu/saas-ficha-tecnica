"use client";

// LISTA DE PRODUÇÃO (2026-09-26): embaixo do quadro de Produção do tablet, o
// que tem que ser produzido hoje (pedido do dono). Quem monta: o gestor (no
// painel/celular) e a própria cozinha ("Pôr na lista"). Cada item mostra
// quanto falta — soma sozinho o que foi começado/pronto no dia daquela ficha
// (perda não conta) — e "Começar" já abre com a quantidade que falta.
// A cozinha tira só o que o tablet pediu; o que o gestor pediu, só ele tira.

import { useMemo, useState } from "react";
import { Check, CircleDashed, ListChecks, Play, Plus, Search, Trash2, Flame } from "lucide-react";
import { useToast } from "@/components/ficha/Toast";
import { nums } from "@/components/ficha/tema";
import { formatQtd } from "@/components/charts/format";
import { tint, unidadeNoPlural } from "@/components/producoes/formato";
import type { FichaCozinha, ProducaoCozinha } from "@/lib/dominio/cozinha";
import { progressoDoPlano, resumoDoPlano, type ItemPlano, type ProgressoPlano } from "@/lib/dominio/planoProducao";

type Resultado = { ok: true; aviso?: string } | { ok: false; erro: string };

const ESTADO = {
  falta: { rotulo: "Falta", cor: "var(--etapa-estoque)", texto: "var(--etapa-estoque-texto)", Icone: CircleDashed },
  em_producao: { rotulo: "No fogo", cor: "var(--etapa-producao)", texto: "var(--etapa-producao-texto)", Icone: Flame },
  feito: { rotulo: "Feito", cor: "var(--etapa-produzido)", texto: "var(--etapa-produzido-texto)", Icone: Check },
} as const;

export function ListaProducaoCozinha({
  plano,
  producoes,
  fichas,
  responsavel,
  onComecar,
  adicionar,
  tirar,
  Folha,
}: {
  plano: ItemPlano[];
  producoes: ProducaoCozinha[];
  fichas: FichaCozinha[];
  responsavel: string;
  onComecar: (ficha: FichaCozinha, sugestao: number) => void;
  adicionar: (receitaId: string, quantidade: number, observacao: string | null, responsavel: string) => Promise<Resultado>;
  tirar: (id: string) => Promise<Resultado>;
  Folha: (p: { titulo: string; subtitulo?: string; aoFechar: () => void; children: React.ReactNode }) => React.ReactNode;
}) {
  const { mostrarErro, mostrarSucesso, mostrarInfo } = useToast();
  const [adicionando, setAdicionando] = useState(false);
  const porId = useMemo(() => new Map(fichas.map((f) => [f.id, f])), [fichas]);
  const progresso = useMemo(() => progressoDoPlano(plano, producoes), [plano, producoes]);
  const resumo = resumoDoPlano(progresso);

  const remover = async (p: ProgressoPlano) => {
    const nome = porId.get(p.item.receitaId)?.nome ?? "item";
    if (!window.confirm(`Tirar ${nome} da lista de hoje?`)) return;
    const r = await tirar(p.item.id);
    if (!r.ok) return mostrarErro(r.erro);
    mostrarSucesso(`${nome} saiu da lista.`);
  };

  return (
    <section id="lista-producao" aria-labelledby="titulo-lista-producao" className="mt-6 scroll-mt-20">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
        <div>
          <h2 id="titulo-lista-producao" className="text-[20px] font-semibold tracking-tight flex items-center gap-2">
            <ListChecks size={22} aria-hidden /> O que produzir hoje
          </h2>
          <p className="text-[14px] text-[var(--tinta-sub)] mt-0.5" style={nums}>
            {resumo.total === 0
              ? "Nada na lista ainda. O gestor monta pelo painel, ou ponha aqui o que precisa sair hoje."
              : `${resumo.feitos} de ${resumo.total} feitos${resumo.faltam ? ` · ${resumo.faltam} ${resumo.faltam === 1 ? "falta começar" : "faltam começar"}` : ""}`}
          </p>
        </div>
        <button
          onClick={() => setAdicionando(true)}
          className="min-h-14 px-5 rounded-xl text-[16px] font-semibold inline-flex items-center gap-2 border"
          style={{ borderColor: "var(--linha-forte)", background: "var(--panel)" }}
        >
          <Plus size={19} /> Pôr na lista
        </button>
      </div>

      {progresso.length > 0 && (
        <ul className="grid md:grid-cols-2 gap-2.5">
          {progresso.map((p) => {
            const f = porId.get(p.item.receitaId);
            const e = ESTADO[p.estado];
            const un = (n: number) => unidadeNoPlural(n, f?.unidadeRendimento ?? "");
            const pct = Math.min(100, ((p.feito + p.emProducao) / p.item.quantidade) * 100);
            return (
              <li
                key={p.item.id}
                aria-label={`${f?.nome ?? "Ficha removida"}: ${e.rotulo}`}
                className="rounded-xl border bg-[var(--panel)] p-3.5 flex items-start gap-3"
                style={{ borderColor: tint(e.cor, 35), borderLeft: `4px solid ${e.cor}`, opacity: p.estado === "feito" ? 0.75 : 1 }}
              >
                <span className="mt-0.5 w-9 h-9 shrink-0 rounded-full flex items-center justify-center" style={{ background: tint(e.cor, 16), color: e.texto }} aria-hidden>
                  <e.Icone size={19} strokeWidth={2.4} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[17px] font-semibold leading-snug">{f?.nome ?? "Ficha removida"}</div>
                  <div className="text-[14px] mt-0.5" style={{ ...nums, color: e.texto }}>
                    {p.estado === "feito"
                      ? `Feito · ${formatQtd(p.feito)} de ${formatQtd(p.item.quantidade)} ${un(p.item.quantidade)}`
                      : p.estado === "em_producao"
                        ? `No fogo · ${formatQtd(p.emProducao)} ${un(p.emProducao)}${p.feito ? ` + ${formatQtd(p.feito)} pronto` : ""}`
                        : `Falta ${formatQtd(p.falta)} de ${formatQtd(p.item.quantidade)} ${un(p.item.quantidade)}`}
                  </div>
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: tint(e.cor, 14) }} aria-hidden>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: e.cor }} />
                  </div>
                  {p.item.observacao && <p className="text-[14px] mt-2 text-[var(--tinta)]">{p.item.observacao}</p>}
                  {p.item.responsavel && <p className="text-[12.5px] text-[var(--tinta-faint)] mt-1">pedido por {p.item.responsavel}</p>}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {p.falta > 0 && f && (
                    <button
                      onClick={() => onComecar(f, p.falta)}
                      aria-label={`Começar ${f.nome} da lista`}
                      className="min-h-12 px-3.5 rounded-lg inline-flex items-center gap-1.5 text-[15px] font-semibold"
                      style={{ background: "var(--tinta)", color: "var(--panel)" }}
                    >
                      <Play size={15} strokeWidth={2.6} /> Começar
                    </button>
                  )}
                  {p.item.podeMexer && (
                    <button
                      onClick={() => remover(p)}
                      aria-label={`Tirar ${f?.nome ?? "item"} da lista`}
                      className="min-h-12 px-3 rounded-lg inline-flex items-center justify-center text-[var(--tinta-faint)] border"
                      style={{ borderColor: "var(--linha)" }}
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {adicionando && (
        <FolhaAdicionar
          fichas={fichas}
          Folha={Folha}
          aoFechar={() => setAdicionando(false)}
          aoConfirmar={async (receitaId, qtd, obs) => {
            const r = await adicionar(receitaId, qtd, obs, responsavel);
            if (!r.ok) {
              mostrarErro(r.erro);
              return false;
            }
            if (r.aviso) mostrarInfo(r.aviso);
            else mostrarSucesso(`${porId.get(receitaId)?.nome ?? "Item"} na lista de hoje.`);
            setAdicionando(false);
            return true;
          }}
        />
      )}
    </section>
  );
}

function FolhaAdicionar({
  fichas,
  Folha,
  aoFechar,
  aoConfirmar,
}: {
  fichas: FichaCozinha[];
  Folha: (p: { titulo: string; subtitulo?: string; aoFechar: () => void; children: React.ReactNode }) => React.ReactNode;
  aoFechar: () => void;
  aoConfirmar: (receitaId: string, qtd: number, obs: string | null) => Promise<boolean>;
}) {
  const [busca, setBusca] = useState("");
  const [ficha, setFicha] = useState<FichaCozinha | null>(null);
  const [texto, setTexto] = useState("");
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);
  const encontradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (q ? fichas.filter((f) => f.nome.toLowerCase().includes(q)) : fichas).slice(0, 30);
  }, [fichas, busca]);
  const qtd = Number(texto.replace(",", "."));
  const valida = !!ficha && Number.isFinite(qtd) && qtd > 0;

  return (
    <Folha titulo="Pôr na lista de hoje" subtitulo={ficha ? `${ficha.nome} · a receita rende ${formatQtd(ficha.rendimento)} ${unidadeNoPlural(ficha.rendimento, ficha.unidadeRendimento)}` : "Escolha a ficha e quanto precisa sair hoje."} aoFechar={aoFechar}>
      {!ficha ? (
        <>
          <label className="flex items-center gap-2 px-3 min-h-14 rounded-xl border" style={{ borderColor: "var(--linha-forte)" }}>
            <Search size={18} className="text-[var(--tinta-faint)] shrink-0" />
            <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar ficha" aria-label="Procurar ficha pra lista" className="flex-1 min-w-0 bg-transparent outline-none text-[17px]" />
          </label>
          <ul className="mt-3 space-y-2">
            {encontradas.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => {
                    setFicha(f);
                    setTexto(String(f.rendimento).replace(".", ","));
                  }}
                  className="w-full min-h-14 px-4 rounded-xl border text-left flex items-center justify-between gap-3"
                  style={{ borderColor: "var(--linha)" }}
                >
                  <span className="text-[16px] font-medium">{f.nome}</span>
                  <span className="text-[13px] text-[var(--tinta-sub)]">{f.tipo === "preparo_base" ? "preparo" : "prato"}</span>
                </button>
              </li>
            ))}
            {encontradas.length === 0 && <li className="text-[15px] text-[var(--tinta-sub)] py-4 text-center">Nenhuma ficha com esse nome.</li>}
          </ul>
        </>
      ) : (
        <>
          <label className="block text-[14px] font-medium mb-1.5" htmlFor="qtd-lista">
            Quanto precisa sair hoje ({unidadeNoPlural(2, ficha.unidadeRendimento)})
          </label>
          <input
            id="qtd-lista"
            value={texto}
            onChange={(e) => setTexto(e.target.value.replace(/[^\d,.]/g, ""))}
            inputMode="decimal"
            className="w-full h-16 rounded-xl border text-center text-[28px] font-semibold bg-transparent outline-none"
            style={{ ...nums, borderColor: "var(--linha-forte)" }}
          />
          <div className="grid grid-cols-3 gap-2 mt-2.5">
            {[1, 2, 3].map((n) => (
              <button key={n} onClick={() => setTexto(String(ficha.rendimento * n).replace(".", ","))} className="min-h-12 rounded-xl border text-[14px] font-medium" style={{ borderColor: "var(--linha-forte)" }}>
                {n === 1 ? "1 receita" : `${n} receitas`}
              </button>
            ))}
          </div>
          <label className="block text-[14px] font-medium mt-4 mb-1.5" htmlFor="obs-lista">
            Observação (opcional)
          </label>
          <input
            id="obs-lista"
            value={obs}
            maxLength={140}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Ex.: pro almoço, antes das 11h"
            className="w-full min-h-14 px-4 rounded-xl border bg-transparent text-[16px] outline-none"
            style={{ borderColor: "var(--linha-forte)" }}
          />
          <div className="flex gap-2 mt-5">
            <button onClick={() => setFicha(null)} className="min-h-16 px-4 rounded-xl border text-[16px] font-medium" style={{ borderColor: "var(--linha-forte)" }}>
              Trocar ficha
            </button>
            <button
              disabled={!valida || salvando}
              onClick={async () => {
                if (!ficha || !valida) return;
                setSalvando(true);
                const ok = await aoConfirmar(ficha.id, qtd, obs.trim() || null);
                if (!ok) setSalvando(false);
              }}
              className="flex-1 min-h-16 rounded-xl text-[17px] font-semibold disabled:opacity-50"
              style={{ background: "var(--tinta)", color: "var(--panel)" }}
            >
              {salvando ? "Pondo..." : "Pôr na lista"}
            </button>
          </div>
        </>
      )}
    </Folha>
  );
}
