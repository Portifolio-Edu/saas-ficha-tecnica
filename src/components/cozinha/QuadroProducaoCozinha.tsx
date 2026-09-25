"use client";

// TOQUE (2026-09-25): aba Produção do modo cozinha com o mesmo quadro (kanban)
// do gestor: A produzir → Em produção → Pronto → Perda, nas cores de etapa do
// sistema (--etapa-*). Pedido do dono: o tablet da cozinha tinha só uma lista.
//
// Feito pro dedo:
//  - Segura o card e arrasta pra outra coluna (useArrastoToque), ou usa os
//    botões grandes do card, que fazem a mesma coisa.
//  - "Começar" abre uma folha com − / + grandes e atalhos de 1, 2 e 3 receitas.
//  - Perda abre uma folha com os motivos mais comuns em botões.
//  - "Pronto" e "Perda" têm Desfazer por alguns segundos (dedo escorrega).
//  - Em produção mostra há quanto tempo o lote começou.
// A primeira coluna é "A produzir" (as fichas da casa, um pouco mais larga pro
// nome caber ao lado do botão), sem "lotes possíveis":
// isso sai do saldo do estoque, que a cozinha não vê (regra de EQUIPE).
// Antes: SecaoProducao em CozinhaApp.tsx (formulário + lista "Hoje").
// Reverter: git revert do commit "Kanban de produção no modo cozinha".

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Play, Check, Trash2, Search, Minus, Plus, X, Undo2, GripVertical } from "lucide-react";
import { useToast } from "@/components/ficha/Toast";
import { nums } from "@/components/ficha/tema";
import { formatQtd } from "@/components/charts/format";
import { tint, unidadeNoPlural } from "@/components/producoes/formato";
import { useArrastoToque } from "@/components/producoes/useArrastoToque";
import type { FichaCozinha, ProducaoCozinha } from "@/lib/dominio/cozinha";
import type { StatusProducao } from "@/lib/dominio/producao";
import type { AcoesCozinha } from "./CozinhaApp";

type ColunaId = "fichas" | "em_producao" | "produzido" | "perda";
type ItemQuadro = { tipo: "ficha"; ficha: FichaCozinha } | { tipo: "lote"; lote: ProducaoCozinha };

export const MOTIVOS_PERDA = ["Queimou", "Caiu no chão", "Passou da validade", "Contaminação", "Erro no preparo", "Sobrou do turno"];

const COLUNAS: { id: ColunaId; titulo: string; desc: string; etapa: "estoque" | "producao" | "produzido" | "perda" }[] = [
  { id: "fichas", titulo: "A produzir", desc: "fichas da casa", etapa: "estoque" },
  { id: "em_producao", titulo: "Em produção", desc: "no fogo agora", etapa: "producao" },
  { id: "produzido", titulo: "Pronto", desc: "pronto pra uso ou venda", etapa: "produzido" },
  { id: "perda", titulo: "Perda", desc: "lote descartado", etapa: "perda" },
];

function podeSoltar(origem: ColunaId, destino: ColunaId): boolean {
  if (origem === "fichas") return destino === "em_producao";
  if (origem === "em_producao") return destino === "produzido" || destino === "perda";
  if (origem === "produzido") return destino === "perda";
  return false;
}

const cor = (etapa: string) => `var(--etapa-${etapa})`;
const corTexto = (etapa: string) => `var(--etapa-${etapa}-texto)`;

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function haQuantoTempo(iso: string, agora: number) {
  const min = Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `há ${h} h ${String(m).padStart(2, "0")}` : `há ${h} h`;
}

/** Passo do − / +: meio em peso e volume, inteiro no resto (discos, porções). */
function passoDa(unidade: string) {
  return /^(kg|l|litro|litros)$/i.test(unidade.trim()) ? 0.5 : 1;
}

interface Desfazer {
  id: number;
  mensagem: string;
  acao: () => void;
}

export function QuadroProducaoCozinha({
  fichas,
  producoes: iniciais,
  responsavel,
  acoes,
}: {
  fichas: FichaCozinha[];
  producoes: ProducaoCozinha[];
  responsavel: string;
  acoes: AcoesCozinha;
}) {
  const { mostrarErro, mostrarInfo } = useToast();
  const [producoes, setProducoes] = useState(iniciais);
  useEffect(() => setProducoes(iniciais), [iniciais]);
  const [busca, setBusca] = useState("");
  const [iniciando, setIniciando] = useState<FichaCozinha | null>(null);
  const [perdendo, setPerdendo] = useState<ProducaoCozinha | null>(null);
  const [desfazer, setDesfazer] = useState<Desfazer | null>(null);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!desfazer) return;
    const t = window.setTimeout(() => setDesfazer((d) => (d?.id === desfazer.id ? null : d)), 6000);
    return () => window.clearTimeout(t);
  }, [desfazer]);

  const fichasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const lista = q ? fichas.filter((f) => f.nome.toLowerCase().includes(q)) : fichas;
    return {
      preparos: lista.filter((f) => f.tipo === "preparo_base"),
      pratos: lista.filter((f) => f.tipo === "prato_final"),
    };
  }, [fichas, busca]);

  /** Muda o status na tela na hora e desfaz se o servidor recusar. */
  const mudarStatus = async (lote: ProducaoCozinha, status: StatusProducao, motivo: string | null, comDesfazer = true) => {
    const antes = { status: lote.status, motivoPerda: lote.motivoPerda };
    setProducoes((atual) => atual.map((p) => (p.id === lote.id ? { ...p, status, motivoPerda: motivo } : p)));
    const r = await acoes.atualizarProducao(lote.id, status, motivo);
    if (!r.ok) {
      setProducoes((atual) => atual.map((p) => (p.id === lote.id ? { ...p, ...antes } : p)));
      mostrarErro(r.erro);
      return;
    }
    if (comDesfazer) {
      setDesfazer({
        id: Date.now(),
        mensagem: status === "produzido" ? `${lote.nomeReceita} está pronto.` : `Perda de ${lote.nomeReceita} registrada.`,
        acao: () => {
          setDesfazer(null);
          void mudarStatus({ ...lote, status, motivoPerda: motivo }, antes.status, antes.motivoPerda, false);
        },
      });
    }
  };

  const { arrasto, iniciar, refQuadro, alvoValido } = useArrastoToque<ItemQuadro, ColunaId>({
    podeSoltar: (origem, destino) => podeSoltar(origem, destino),
    aoSoltar: (item, _origem, destino) => {
      if (item.tipo === "ficha") setIniciando(item.ficha);
      else if (destino === "produzido") void mudarStatus(item.lote, "produzido", null);
      else if (destino === "perda") setPerdendo(item.lote);
    },
  });

  const arrastandoId = arrasto ? (arrasto.item.tipo === "ficha" ? `f-${arrasto.item.ficha.id}` : `l-${arrasto.item.lote.id}`) : null;

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
        <h1 className="text-[22px] font-semibold tracking-tight">Produção de hoje</h1>
        <p className="text-[14px] text-[var(--tinta-sub)]">Segure um card e arraste pra próxima coluna, ou use os botões.</p>
      </div>

      <div
        ref={refQuadro}
        className={`flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 lg:mx-0 lg:px-0 lg:overflow-visible select-none ${arrasto ? "" : "snap-x snap-mandatory"}`}
        style={{ scrollPaddingInline: 16 }}
      >
        {COLUNAS.map((col) => {
          const lotes = col.id === "fichas" ? [] : producoes.filter((p) => p.status === col.id);
          const contagem = col.id === "fichas" ? fichasFiltradas.preparos.length + fichasFiltradas.pratos.length : lotes.length;
          const recebe = !!arrasto && podeSoltar(arrasto.origem, col.id);
          const emCima = arrasto?.alvo === col.id;
          const recusa = emCima && !!arrasto && arrasto.origem !== col.id && !alvoValido;
          return (
            <section
              key={col.id}
              data-coluna={col.id}
              aria-label={`${col.titulo}: ${contagem}`}
              className={`snap-start shrink-0 w-[min(86vw,340px)] lg:w-auto ${col.id === "fichas" ? "lg:flex-[1.35]" : "lg:flex-1"} lg:min-w-0 h-[calc(100dvh-210px)] min-h-[440px] rounded-xl flex flex-col transition-[background-color,box-shadow] duration-150`}
              style={{
                background: emCima && recebe ? tint(cor(col.etapa), 16) : tint(cor(col.etapa), 5),
                border: `1px ${recebe && !emCima ? "dashed" : "solid"} ${recusa ? "var(--sinal)" : tint(cor(col.etapa), recebe ? 60 : 26)}`,
                borderTop: `3px solid ${recusa ? "var(--sinal)" : cor(col.etapa)}`,
                boxShadow: emCima ? `0 0 0 2px ${recusa ? "var(--sinal)" : cor(col.etapa)} inset` : "none",
              }}
            >
              <header className="px-4 pt-3 pb-2.5 border-b" style={{ borderColor: tint(cor(col.etapa), 26) }}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-[17px] font-bold tracking-tight" style={{ color: corTexto(col.etapa) }}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: cor(col.etapa) }} aria-hidden />
                    {col.titulo}
                  </h2>
                  <span className="text-[15px] font-bold min-w-9 text-center px-2.5 py-0.5 rounded-full" style={{ ...nums, background: tint(cor(col.etapa), 14), color: corTexto(col.etapa) }}>
                    {contagem}
                  </span>
                </div>
                <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5">{col.desc}</p>
                {col.id === "fichas" && (
                  <label className="mt-2.5 flex items-center gap-2 px-3 min-h-12 rounded-lg border bg-[var(--panel)]" style={{ borderColor: "var(--linha-forte)" }}>
                    <Search size={17} className="text-[var(--tinta-faint)] shrink-0" />
                    <input
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Procurar ficha"
                      aria-label="Procurar ficha"
                      className="flex-1 min-w-0 bg-transparent outline-none text-[16px]"
                    />
                    {busca && (
                      <button onClick={() => setBusca("")} aria-label="Limpar busca" className="w-9 h-9 -mr-1.5 flex items-center justify-center text-[var(--tinta-faint)]">
                        <X size={17} />
                      </button>
                    )}
                  </label>
                )}
              </header>

              <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto overscroll-contain">
                {col.id === "fichas" ? (
                  <>
                    {contagem === 0 && <Vazio etapa={col.etapa}>{busca ? "Nenhuma ficha com esse nome." : "Nenhuma ficha cadastrada. O gestor cadastra em Receitas e fichas."}</Vazio>}
                    {(
                      [
                        ["Preparos", fichasFiltradas.preparos],
                        ["Pratos", fichasFiltradas.pratos],
                      ] as const
                    ).map(([grupo, lista]) =>
                      lista.length === 0 ? null : (
                        <div key={grupo} className="space-y-2.5">
                          <div className="px-1 pt-1 text-[12px] font-semibold uppercase tracking-wide text-[var(--tinta-faint)]">{grupo}</div>
                          {lista.map((f) => (
                            <CardFicha
                              key={f.id}
                              ficha={f}
                              etapa={col.etapa}
                              levantado={arrastandoId === `f-${f.id}`}
                              onPointerDown={(e) => iniciar(e, { tipo: "ficha", ficha: f }, "fichas")}
                              onComecar={() => setIniciando(f)}
                            />
                          ))}
                        </div>
                      ),
                    )}
                  </>
                ) : (
                  <>
                    {lotes.length === 0 && (
                      <Vazio etapa={col.etapa}>
                        {recebe ? "Solte aqui" : col.id === "em_producao" ? "Nada no fogo. Arraste uma ficha pra cá ou toque em Começar." : col.id === "produzido" ? "Nada pronto ainda hoje." : "Nenhuma perda hoje."}
                      </Vazio>
                    )}
                    {lotes.map((l) => (
                      <CardLote
                        key={l.id}
                        lote={l}
                        etapa={col.etapa}
                        agora={agora}
                        levantado={arrastandoId === `l-${l.id}`}
                        onPointerDown={col.id === "perda" ? undefined : (e) => iniciar(e, { tipo: "lote", lote: l }, col.id)}
                        onPronto={() => void mudarStatus(l, "produzido", null)}
                        onPerda={() => setPerdendo(l)}
                      />
                    ))}
                  </>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Card que segue o dedo */}
      {arrasto && (
        <div
          aria-hidden
          className="fixed z-50 pointer-events-none"
          style={{
            left: arrasto.x - arrasto.dx,
            top: arrasto.y - arrasto.dy,
            width: arrasto.largura,
            transform: "rotate(1.5deg) scale(1.03)",
            filter: "drop-shadow(0 14px 24px rgba(0,0,0,0.22))",
          }}
        >
          {arrasto.item.tipo === "ficha" ? (
            <CardFicha ficha={arrasto.item.ficha} etapa="estoque" fantasma />
          ) : (
            <CardLote lote={arrasto.item.lote} etapa={COLUNAS.find((c) => c.id === arrasto.origem)!.etapa} agora={agora} fantasma />
          )}
        </div>
      )}

      {iniciando && (
        <FolhaIniciar
          ficha={iniciando}
          aoFechar={() => setIniciando(null)}
          aoConfirmar={async (qtd) => {
            const r = await acoes.registrarProducao(iniciando.id, qtd, responsavel);
            if (!r.ok) {
              mostrarErro(r.erro);
              return false;
            }
            if (r.aviso) mostrarInfo(r.aviso);
            setIniciando(null);
            return true;
          }}
        />
      )}

      {perdendo && (
        <FolhaPerda
          lote={perdendo}
          aoFechar={() => setPerdendo(null)}
          aoConfirmar={(motivo) => {
            const lote = perdendo;
            setPerdendo(null);
            void mudarStatus(lote, "perda", motivo);
          }}
        />
      )}

      {desfazer && (
        <div
          role="status"
          className="fixed z-40 left-1/2 -translate-x-1/2 bottom-5 w-[min(460px,calc(100vw-2rem))] rounded-xl pl-4 pr-2 py-2 flex items-center gap-3 animate-slide-up"
          style={{ background: "var(--tinta)", color: "var(--panel)", boxShadow: "var(--shadow-lift)" }}
        >
          <span className="flex-1 text-[15px] font-medium">{desfazer.mensagem}</span>
          <button onClick={desfazer.acao} className="min-h-12 px-4 rounded-lg inline-flex items-center gap-2 text-[15px] font-semibold" style={{ background: tint("var(--panel)", 16) }}>
            <Undo2 size={17} />
            Desfazer
          </button>
        </div>
      )}
    </section>
  );
}

function Vazio({ etapa, children }: { etapa: string; children: ReactNode }) {
  return (
    <div className="text-[14px] font-medium py-8 px-4 text-center rounded-xl border border-dashed" style={{ borderColor: tint(cor(etapa), 40), color: corTexto(etapa) }}>
      {children}
    </div>
  );
}

const estiloCard = (etapa: string, levantado?: boolean) => ({
  borderColor: tint(cor(etapa), 30),
  boxShadow: "var(--shadow-sm)",
  opacity: levantado ? 0.35 : 1,
  WebkitTouchCallout: "none" as const,
});

function CardFicha({
  ficha,
  etapa,
  levantado,
  fantasma,
  onPointerDown,
  onComecar,
}: {
  ficha: FichaCozinha;
  etapa: string;
  levantado?: boolean;
  fantasma?: boolean;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onComecar?: () => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      className={`rounded-xl p-3 bg-[var(--panel)] border flex items-center gap-3 ${fantasma ? "" : "cursor-grab active:cursor-grabbing"}`}
      style={estiloCard(etapa, levantado)}
    >
      {ficha.fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ficha.fotoUrl} alt="" draggable={false} className="w-14 h-14 rounded-lg object-cover shrink-0" onError={(e) => (e.currentTarget.style.display = "none")} />
      ) : (
        <GripVertical size={18} className="text-[var(--tinta-faint)] shrink-0 -mx-1" aria-hidden />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[16px] font-semibold leading-snug">{ficha.nome}</div>
        <div className="text-[13px] text-[var(--tinta-sub)] mt-0.5" style={nums}>
          rende {formatQtd(ficha.rendimento)} {unidadeNoPlural(ficha.rendimento, ficha.unidadeRendimento)}
        </div>
      </div>
      {!fantasma && (
        <button
          onClick={onComecar}
          className="shrink-0 min-h-12 px-3.5 rounded-lg inline-flex items-center gap-1.5 text-[15px] font-semibold"
          style={{ background: tint(cor(etapa), 12), color: corTexto(etapa), border: `1px solid ${tint(cor(etapa), 30)}` }}
          aria-label={`Começar ${ficha.nome}`}
        >
          <Play size={15} strokeWidth={2.6} />
          Começar
        </button>
      )}
    </div>
  );
}

function CardLote({
  lote,
  etapa,
  agora,
  levantado,
  fantasma,
  onPointerDown,
  onPronto,
  onPerda,
}: {
  lote: ProducaoCozinha;
  etapa: string;
  agora: number;
  levantado?: boolean;
  fantasma?: boolean;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPronto?: () => void;
  onPerda?: () => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      className={`rounded-xl p-3.5 bg-[var(--panel)] border ${onPointerDown && !fantasma ? "cursor-grab active:cursor-grabbing" : ""}`}
      style={estiloCard(etapa, levantado)}
    >
      <div className="flex items-center justify-between gap-2 text-[12px] text-[var(--tinta-sub)]">
        <span className="flex items-center gap-1.5" style={nums}>
          <span className="w-2 h-2 rounded-full" style={{ background: cor(etapa) }} aria-hidden />
          {lote.lote}
        </span>
        <span style={nums}>{lote.status === "em_producao" ? haQuantoTempo(lote.criadoEm, agora) : hora(lote.criadoEm)}</span>
      </div>
      <div className="text-[17px] font-semibold leading-snug mt-1">{lote.nomeReceita}</div>
      <div className="text-[14px] text-[var(--tinta-sub)] mt-0.5">
        <strong className="font-semibold text-[var(--tinta)]" style={nums}>
          {formatQtd(lote.quantidade)} {unidadeNoPlural(lote.quantidade, lote.unidade)}
        </strong>
        {" · "}
        {lote.responsavel}
      </div>
      {lote.motivoPerda && (
        <div className="text-[14px] font-medium mt-2.5 p-2.5 rounded-lg" style={{ background: tint(cor("perda"), 10), color: corTexto("perda") }}>
          {lote.motivoPerda}
        </div>
      )}
      {!fantasma && lote.status === "em_producao" && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={onPronto}
            className="flex-1 min-h-14 rounded-xl inline-flex items-center justify-center gap-2 text-[16px] font-semibold"
            style={{ background: tint(cor("produzido"), 14), color: corTexto("produzido"), border: `1px solid ${tint(cor("produzido"), 34)}` }}
          >
            <Check size={19} strokeWidth={2.8} />
            Pronto
          </button>
          <button
            onClick={onPerda}
            className="shrink-0 w-14 min-h-14 rounded-xl inline-flex items-center justify-center border bg-[var(--panel)]"
            style={{ borderColor: tint(cor("perda"), 40), color: corTexto("perda") }}
            aria-label={`Registrar perda de ${lote.nomeReceita}`}
          >
            <Trash2 size={19} />
          </button>
        </div>
      )}
      {!fantasma && lote.status === "produzido" && (
        <button
          onClick={onPerda}
          className="mt-3 w-full min-h-12 rounded-xl inline-flex items-center justify-center gap-2 text-[15px] font-medium border bg-[var(--panel)] text-[var(--tinta-sub)]"
          style={{ borderColor: "var(--linha-forte)" }}
        >
          <Trash2 size={16} />
          Registrar perda
        </button>
      )}
    </div>
  );
}

/** Folha que sobe de baixo no celular/tablet em pé e fica no meio no tablet deitado. */
function Folha({ titulo, subtitulo, aoFechar, children }: { titulo: string; subtitulo?: string; aoFechar: () => void; children: ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aoFechar]);
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-6" style={{ background: "rgba(0,0,0,0.5)" }} onClick={aoFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-2xl md:rounded-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-slide-up"
        style={{ background: "var(--panel)", border: "1px solid var(--linha)", boxShadow: "var(--shadow-lift)" }}
      >
        <div className="md:hidden mx-auto -mt-2 mb-3 w-10 h-1.5 rounded-full" style={{ background: "var(--linha-forte)" }} aria-hidden />
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-[20px] font-semibold tracking-tight leading-snug">{titulo}</h2>
            {subtitulo && <p className="text-[15px] text-[var(--tinta-sub)] mt-0.5">{subtitulo}</p>}
          </div>
          <button onClick={aoFechar} aria-label="Fechar" className="w-11 h-11 -mr-2 -mt-1 rounded-lg flex items-center justify-center text-[var(--tinta-faint)]">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FolhaIniciar({ ficha, aoFechar, aoConfirmar }: { ficha: FichaCozinha; aoFechar: () => void; aoConfirmar: (qtd: number) => Promise<boolean> }) {
  const passo = passoDa(ficha.unidadeRendimento);
  const [texto, setTexto] = useState(String(ficha.rendimento).replace(".", ","));
  const [salvando, setSalvando] = useState(false);
  const refSalvando = useRef(false);
  const qtd = Number(texto.replace(",", "."));
  const valida = Number.isFinite(qtd) && qtd > 0;
  const definir = (n: number) => setTexto(String(Math.max(0, Math.round(n * 100) / 100)).replace(".", ","));
  const unidade = (n: number) => unidadeNoPlural(n, ficha.unidadeRendimento);

  const confirmar = async () => {
    if (!valida || refSalvando.current) return;
    refSalvando.current = true;
    setSalvando(true);
    const ok = await aoConfirmar(qtd);
    refSalvando.current = false;
    if (!ok) setSalvando(false);
  };

  const botaoPasso = "w-16 h-16 shrink-0 rounded-xl border flex items-center justify-center active:scale-95 transition-transform";
  return (
    <Folha titulo={ficha.nome} subtitulo={`Quanto vai produzir? A receita rende ${formatQtd(ficha.rendimento)} ${unidade(ficha.rendimento)}.`} aoFechar={aoFechar}>
      <div className="flex items-center gap-3">
        <button onClick={() => definir((valida ? qtd : 0) - passo)} disabled={!valida || qtd - passo <= 0} className={`${botaoPasso} disabled:opacity-40`} style={{ borderColor: "var(--linha-forte)" }} aria-label="Menos">
          <Minus size={24} />
        </button>
        <label className="flex-1 min-w-0 h-16 rounded-xl border flex items-baseline justify-center gap-2 px-3" style={{ borderColor: "var(--linha-forte)" }}>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value.replace(/[^\d,.]/g, ""))}
            inputMode="decimal"
            aria-label="Quantidade produzida"
            className="w-full min-w-0 bg-transparent outline-none text-center text-[32px] font-semibold self-center"
            style={nums}
          />
          <span className="text-[16px] text-[var(--tinta-sub)] self-center shrink-0">{unidade(valida ? qtd : 2)}</span>
        </label>
        <button onClick={() => definir((valida ? qtd : 0) + passo)} className={botaoPasso} style={{ borderColor: "var(--linha-forte)" }} aria-label="Mais">
          <Plus size={24} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        {[1, 2, 3].map((n) => {
          const valor = ficha.rendimento * n;
          const ativo = valida && Math.abs(qtd - valor) < 1e-9;
          return (
            <button
              key={n}
              onClick={() => definir(valor)}
              className="min-h-14 rounded-xl border px-2 text-[14px] leading-tight"
              style={{ borderColor: ativo ? "var(--tinta)" : "var(--linha-forte)", background: ativo ? tint("var(--tinta)", 6) : "transparent" }}
            >
              <span className="block font-semibold">{n === 1 ? "1 receita" : `${n} receitas`}</span>
              <span className="block text-[var(--tinta-sub)]" style={nums}>
                {formatQtd(valor)} {unidade(valor)}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={confirmar}
        disabled={!valida || salvando}
        className="mt-5 w-full min-h-16 rounded-xl inline-flex items-center justify-center gap-2 text-[17px] font-semibold disabled:opacity-50"
        style={{ background: "var(--tinta)", color: "var(--panel)" }}
      >
        <Play size={18} strokeWidth={2.6} />
        {salvando ? "Registrando..." : valida ? `Começar produção · ${formatQtd(qtd)} ${unidade(qtd)}` : "Digite a quantidade"}
      </button>
      <p className="text-[13px] text-[var(--tinta-faint)] mt-2.5 text-center">Sai com o seu nome e já baixa os ingredientes da ficha no estoque.</p>
    </Folha>
  );
}

function FolhaPerda({ lote, aoFechar, aoConfirmar }: { lote: ProducaoCozinha; aoFechar: () => void; aoConfirmar: (motivo: string) => void }) {
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [outro, setOutro] = useState("");
  const motivo = (escolhido === "Outro" ? outro : escolhido ?? "").trim();
  return (
    <Folha titulo="Registrar perda" subtitulo={`${lote.nomeReceita} · ${formatQtd(lote.quantidade)} ${unidadeNoPlural(lote.quantidade, lote.unidade)} · lote ${lote.lote}`} aoFechar={aoFechar}>
      <p className="text-[15px] font-medium mb-2.5">O que aconteceu?</p>
      <div className="grid grid-cols-2 gap-2">
        {[...MOTIVOS_PERDA, "Outro"].map((m) => {
          const ativo = escolhido === m;
          return (
            <button
              key={m}
              onClick={() => setEscolhido(m)}
              aria-pressed={ativo}
              className="min-h-14 rounded-xl border px-3 text-[15px] font-medium text-left"
              style={{ borderColor: ativo ? cor("perda") : "var(--linha-forte)", background: ativo ? tint(cor("perda"), 10) : "transparent", color: ativo ? corTexto("perda") : "var(--tinta)" }}
            >
              {m}
            </button>
          );
        })}
      </div>
      {escolhido === "Outro" && (
        <input
          autoFocus
          value={outro}
          onChange={(e) => setOutro(e.target.value)}
          placeholder="Conte o que aconteceu"
          aria-label="Outro motivo"
          className="mt-3 w-full min-h-14 px-4 rounded-xl border bg-transparent text-[16px] outline-none"
          style={{ borderColor: "var(--linha-forte)" }}
        />
      )}
      <button
        onClick={() => motivo && aoConfirmar(motivo)}
        disabled={!motivo}
        className="mt-5 w-full min-h-16 rounded-xl inline-flex items-center justify-center gap-2 text-[17px] font-semibold disabled:opacity-50"
        style={{ background: corTexto("perda"), color: "var(--panel)" }}
      >
        <Trash2 size={18} />
        Registrar perda
      </button>
    </Folha>
  );
}
