"use client";

// FICHAS (2026-09-25): aba Fichas do modo cozinha, pensada pro tablet na
// bancada. É onde o padrão da casa acontece: o funcionário vê o prato como
// deve sair (foto do empratamento), separa tudo antes de começar e segue o
// passo a passo.
//  - Lista em cartões com foto, busca e filtro Pratos / Preparos.
//  - Ficha aberta: foto grande (toque amplia), "Vou fazer" com − / + que
//    recalcula todas as quantidades, lista "Separe antes de começar" com
//    marcação, peso bruto quando o insumo perde peso na limpeza (fator de
//    correção), e passo a passo grande com marcação de etapa feita.
//  - Preparos da casa usados no prato abrem a própria ficha (foto, modo de
//    preparo e quantidades), com trilha pra voltar ao prato.
//  - Quantidades em unidade de bancada: 0,15 l vira 150 ml, 0,01 kg vira 10 g.
//  - A tela não apaga enquanto a ficha está aberta (Wake Lock, onde existir).
// Nenhum valor em R$ aparece aqui (regra de EQUIPE).
// Antes: SecaoFichas em CozinhaApp.tsx (lista simples e texto corrido).
// Reverter: git revert do commit "Fichas técnicas no tablet".

import { useEffect, useMemo, useState } from "react";
import {
  Search, X, ChevronLeft, ChevronRight, Check, Camera, Minus, Plus, RotateCcw, UtensilsCrossed, CookingPot, Expand, Scale,
} from "lucide-react";
import { nums } from "@/components/ficha/tema";
import { tint } from "@/components/producoes/formato";
import type { FichaCozinha, IngredienteFicha } from "@/lib/dominio/cozinha";
import { fmt, qtdDeBancada } from "./bancada";

/** Passo do − / + do "Vou fazer": meio em peso e volume, inteiro no resto. */
const passoDa = (unidade: string) => (/^(kg|l|litro|litros)$/i.test(unidade.trim()) ? 0.5 : 1);

/** Sem etapas cadastradas, quebra o texto corrido em passos ("; " e ". "). */
function passosDoTexto(texto: string | null): string[] {
  if (!texto) return [];
  const partes = texto
    .split(/(?<=[.;])\s+|\n+/)
    .map((p) => p.trim().replace(/[;.]$/, "").trim())
    .filter(Boolean);
  return partes.map((p) => p.charAt(0).toUpperCase() + p.slice(1));
}

// ---------------------------------------------------------------------------

interface Aberta {
  id: string;
  /** Veio de um prato: quanto dele o prato usa (pra mostrar no topo). */
  usadoEm?: { nomePrato: string; quantidade: string };
}

export function FichasCozinha({ fichas }: { fichas: FichaCozinha[] }) {
  const [pilha, setPilha] = useState<Aberta[]>([]);
  const porId = useMemo(() => new Map(fichas.map((f) => [f.id, f])), [fichas]);
  const atual = pilha.length ? porId.get(pilha[pilha.length - 1].id) : undefined;

  // Abrir/voltar sempre começa do topo da página.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pilha.length]);

  if (atual) {
    const topo = pilha[pilha.length - 1];
    return (
      <FichaAberta
        key={atual.id}
        ficha={atual}
        porId={porId}
        trilha={pilha.map((p) => porId.get(p.id)?.nome ?? "")}
        usadoEm={topo.usadoEm}
        aoVoltar={() => setPilha((p) => p.slice(0, -1))}
        aoIrPara={(nivel) => setPilha((p) => p.slice(0, nivel))}
        aoAbrirPreparo={(id, usadoEm) => setPilha((p) => [...p, { id, usadoEm }])}
      />
    );
  }
  return <ListaFichas fichas={fichas} aoAbrir={(id) => setPilha([{ id }])} />;
}

// ---------------------------------------------------------------------------
// Lista

type Filtro = "todos" | "pratos" | "preparos";

function ListaFichas({ fichas, aoAbrir }: { fichas: FichaCozinha[]; aoAbrir: (id: string) => void }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const encontradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? fichas.filter((f) => f.nome.toLowerCase().includes(q) || (f.categoria ?? "").toLowerCase().includes(q)) : fichas;
  }, [fichas, busca]);
  const pratos = encontradas.filter((f) => f.tipo === "prato_final");
  const preparos = encontradas.filter((f) => f.tipo === "preparo_base");

  const grupos: [string, FichaCozinha[]][] = [];
  if (filtro !== "preparos" && pratos.length) grupos.push(["Pratos", pratos]);
  if (filtro !== "pratos" && preparos.length) grupos.push(["Preparos da casa", preparos]);

  return (
    <section>
      <h1 className="text-[24px] font-semibold tracking-tight">Fichas técnicas</h1>
      <p className="text-[15px] text-[var(--tinta-sub)] mt-0.5">Siga a ficha: é assim que cada prato sai igual, todo dia.</p>

      <div className="flex flex-col md:flex-row gap-3 mt-4 mb-5">
        <label className="flex-1 flex items-center gap-2.5 px-4 min-h-14 rounded-xl border bg-[var(--panel)]" style={{ borderColor: "var(--linha-forte)" }}>
          <Search size={19} className="text-[var(--tinta-faint)] shrink-0" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar prato ou preparo" aria-label="Procurar ficha" className="flex-1 min-w-0 bg-transparent outline-none text-[17px]" />
          {busca && (
            <button onClick={() => setBusca("")} aria-label="Limpar busca" className="w-10 h-10 -mr-2 flex items-center justify-center text-[var(--tinta-faint)]">
              <X size={19} />
            </button>
          )}
        </label>
        <div className="flex rounded-xl border p-1 gap-1 bg-[var(--panel)]" style={{ borderColor: "var(--linha-forte)" }} role="group" aria-label="Mostrar">
          {(
            [
              ["todos", "Todos", encontradas.length],
              ["pratos", "Pratos", pratos.length],
              ["preparos", "Preparos", preparos.length],
            ] as const
          ).map(([id, rotulo, n]) => (
            <button
              key={id}
              onClick={() => setFiltro(id)}
              aria-pressed={filtro === id}
              className="flex-1 md:flex-none min-h-12 px-4 rounded-lg text-[15px] font-medium whitespace-nowrap"
              style={filtro === id ? { background: "var(--tinta)", color: "var(--panel)" } : { color: "var(--tinta-sub)" }}
            >
              {rotulo} <span style={{ ...nums, opacity: 0.7 }}>{n}</span>
            </button>
          ))}
        </div>
      </div>

      {grupos.length === 0 && (
        <p className="text-[16px] text-[var(--tinta-sub)] py-10 text-center">
          {fichas.length === 0 ? "Nenhuma ficha cadastrada ainda. O gestor cadastra em Receitas e fichas." : "Nenhuma ficha com esse nome."}
        </p>
      )}

      {grupos.map(([titulo, lista]) => (
        <div key={titulo} className="mb-7">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--tinta-faint)] mb-2.5">{titulo}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {lista.map((f) => (
              <button
                key={f.id}
                onClick={() => aoAbrir(f.id)}
                className="text-left rounded-xl overflow-hidden border bg-[var(--panel)] active:scale-[0.99] transition-transform"
                style={{ borderColor: "var(--linha)", boxShadow: "var(--shadow-sm)" }}
              >
                <Foto url={f.fotoUrl} alt={f.nome} tipo={f.tipo} className="aspect-[4/3]" compacta />
                <div className="p-3">
                  <div className="text-[16px] font-semibold leading-snug">{f.nome}</div>
                  <div className="text-[13px] text-[var(--tinta-sub)] mt-0.5" style={nums}>
                    {f.tipo === "preparo_base" ? `rende ${qtdDeBancada(f.rendimento, f.unidadeRendimento)}` : (f.categoria ?? "Prato")}
                    {f.etapas.length > 0 && ` · ${f.etapas.length} etapas`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Ficha aberta

function FichaAberta({
  ficha,
  porId,
  trilha,
  usadoEm,
  aoVoltar,
  aoIrPara,
  aoAbrirPreparo,
}: {
  ficha: FichaCozinha;
  porId: Map<string, FichaCozinha>;
  trilha: string[];
  usadoEm?: Aberta["usadoEm"];
  aoVoltar: () => void;
  aoIrPara: (nivel: number) => void;
  aoAbrirPreparo: (id: string, usadoEm: Aberta["usadoEm"]) => void;
}) {
  const [quanto, setQuanto] = useState(ficha.rendimento);
  const [separados, setSeparados] = useState<Set<string>>(new Set());
  const [feitas, setFeitas] = useState<Set<number>>(new Set());
  const [ampliada, setAmpliada] = useState<{ url: string; legenda: string } | null>(null);
  const fator = ficha.rendimento > 0 ? quanto / ficha.rendimento : 1;
  const escalada = Math.abs(fator - 1) > 1e-9;
  const passo = passoDa(ficha.unidadeRendimento);

  useTelaAcesa();

  const etapas = ficha.etapas.length
    ? [...ficha.etapas].sort((a, b) => a.ordem - b.ordem).map((e, i) => ({ n: i + 1, titulo: e.titulo, texto: e.texto, fotoUrl: e.fotoUrl }))
    : passosDoTexto(ficha.modoPreparo).map((t, i) => ({ n: i + 1, titulo: null as string | null, texto: t as string | null, fotoUrl: null as string | null }));
  const agora = etapas.find((e) => !feitas.has(e.n))?.n ?? null;
  const preparos = ficha.ingredientes.filter((i) => i.ehPreparo && i.receitaId && porId.has(i.receitaId));

  const alternar = <T,>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, v: T) =>
    setter((atual) => {
      const novo = new Set(atual);
      if (novo.has(v)) novo.delete(v);
      else novo.add(v);
      return novo;
    });

  const qtdDoIngrediente = (i: IngredienteFicha) => {
    const q = i.quantidade * fator;
    // "1 un" de um preparo é 1 unidade do rendimento dele (ex.: 1 disco de massa).
    const sub = i.receitaId ? porId.get(i.receitaId) : undefined;
    if (sub && i.unidade.toLowerCase() === "un") return qtdDeBancada(q, sub.unidadeRendimento);
    return qtdDeBancada(q, i.unidade);
  };

  return (
    <section>
      {/* Trilha: Fichas › Prato › Preparo */}
      <nav className="flex items-center flex-wrap gap-x-1 gap-y-1 mb-3 -ml-2" aria-label="Onde você está">
        <button onClick={aoVoltar} className="min-h-12 pl-1 pr-3 inline-flex items-center gap-1 text-[16px] font-medium rounded-lg" style={{ color: "var(--tinta)" }}>
          <ChevronLeft size={22} /> Voltar
        </button>
        <span className="text-[14px] text-[var(--tinta-faint)] flex items-center gap-1 flex-wrap">
          <button onClick={() => aoIrPara(0)} className="min-h-10 px-1.5 underline-offset-2 hover:underline">Fichas</button>
          {trilha.slice(0, -1).map((nome, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight size={14} />
              <button onClick={() => aoIrPara(i + 1)} className="min-h-10 px-1.5 underline-offset-2 hover:underline">{nome}</button>
            </span>
          ))}
        </span>
      </nav>

      {usadoEm && (
        <div className="mb-4 rounded-xl px-4 py-3 text-[15px] flex items-center gap-2.5" style={{ background: tint("var(--etapa-estoque)", 10), color: "var(--etapa-estoque-texto)" }}>
          <CookingPot size={18} className="shrink-0" />
          <span>
            Preparo usado em <strong>{usadoEm.nomePrato}</strong>: {usadoEm.quantidade} por receita do prato.
          </span>
        </div>
      )}

      {/* Título + Vou fazer */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-4 mb-5">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[13px] font-semibold px-2.5 py-1 rounded-full" style={{ background: tint(ficha.tipo === "prato_final" ? "var(--etapa-produzido)" : "var(--etapa-estoque)", 14), color: ficha.tipo === "prato_final" ? "var(--etapa-produzido-texto)" : "var(--etapa-estoque-texto)" }}>
              {ficha.tipo === "prato_final" ? "Prato" : "Preparo da casa"}
            </span>
            {ficha.categoria && <span className="text-[14px] text-[var(--tinta-sub)]">{ficha.categoria}</span>}
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight leading-tight">{ficha.nome}</h1>
          <p className="text-[16px] text-[var(--tinta-sub)] mt-1" style={nums}>
            Receita rende {qtdDeBancada(ficha.rendimento, ficha.unidadeRendimento)}
            {ficha.tipo === "prato_final" && ficha.pesoPorcaoG ? ` · porção de ${fmt(ficha.pesoPorcaoG, 0)} g` : ""}
          </p>
        </div>
        <div className="rounded-xl border p-2 flex items-center gap-2 bg-[var(--panel)] self-start lg:self-auto" style={{ borderColor: "var(--linha-forte)" }}>
          <span className="text-[14px] text-[var(--tinta-sub)] pl-2 pr-1">Vou fazer</span>
          <button onClick={() => setQuanto((q) => Math.max(passo, Math.round((q - passo) * 100) / 100))} disabled={quanto <= passo} aria-label="Menos" className="w-12 h-12 rounded-lg border flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform" style={{ borderColor: "var(--linha-forte)" }}>
            <Minus size={20} />
          </button>
          <span className="min-w-[96px] text-center text-[20px] font-semibold" style={nums} aria-live="polite">
            {qtdDeBancada(quanto, ficha.unidadeRendimento)}
          </span>
          <button onClick={() => setQuanto((q) => Math.round((q + passo) * 100) / 100)} aria-label="Mais" className="w-12 h-12 rounded-lg border flex items-center justify-center active:scale-95 transition-transform" style={{ borderColor: "var(--linha-forte)" }}>
            <Plus size={20} />
          </button>
          {escalada && (
            <button onClick={() => setQuanto(ficha.rendimento)} aria-label="Voltar pra 1 receita" className="w-12 h-12 rounded-lg flex items-center justify-center text-[var(--tinta-sub)]">
              <RotateCcw size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 items-start">
        {/* Coluna 1: foto, preparos da casa, separar */}
        <div className="space-y-5 min-w-0">
          <div className="relative">
            <Foto url={ficha.fotoUrl} alt={`Como o prato deve sair: ${ficha.nome}`} tipo={ficha.tipo} className={`${!ficha.fotoUrl && ficha.tipo === "preparo_base" ? "aspect-[16/5]" : "aspect-[4/3]"} rounded-2xl border`} aoTocar={ficha.fotoUrl ? () => setAmpliada({ url: ficha.fotoUrl!, legenda: ficha.nome }) : undefined} />
            {ficha.fotoUrl && (
              <span className="pointer-events-none absolute left-3 bottom-3 text-[13px] font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1.5" style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>
                <Expand size={13} /> {ficha.tipo === "prato_final" ? "Empratamento padrão · toque pra ampliar" : "Toque pra ampliar"}
              </span>
            )}
          </div>

          {preparos.length > 0 && (
            <div>
              <h2 className="text-[18px] font-semibold mb-2">Preparos da casa neste prato</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2.5">
                {preparos.map((i) => {
                  const sub = porId.get(i.receitaId!)!;
                  const q = qtdDoIngrediente(i);
                  return (
                    <button
                      key={i.id}
                      onClick={() => aoAbrirPreparo(sub.id, { nomePrato: ficha.nome, quantidade: qtdDeBancada(i.quantidade, sub && i.unidade.toLowerCase() === "un" ? sub.unidadeRendimento : i.unidade) })}
                      className="flex items-center gap-3 p-2.5 rounded-xl border text-left bg-[var(--panel)] active:scale-[0.99] transition-transform min-h-[76px]"
                      style={{ borderColor: tint("var(--etapa-estoque)", 35) }}
                    >
                      <Foto url={sub.fotoUrl} alt={sub.nome} tipo={sub.tipo} className="w-14 h-14 rounded-lg shrink-0" compacta semLegenda />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[16px] font-semibold leading-snug">{sub.nome}</span>
                        <span className="block text-[14px] text-[var(--tinta-sub)]" style={nums}>usa {q} · ver receita</span>
                      </span>
                      <ChevronRight size={20} className="text-[var(--tinta-faint)] shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <h2 className="text-[18px] font-semibold">Separe antes de começar</h2>
              <span className="text-[14px] text-[var(--tinta-sub)]" style={nums}>
                {separados.size} de {ficha.ingredientes.length}
              </span>
            </div>
            {escalada && (
              <p className="text-[14px] mb-2 px-3 py-2 rounded-lg" style={{ background: tint("var(--etapa-producao)", 12), color: "var(--etapa-producao-texto)" }}>
                Quantidades para {qtdDeBancada(quanto, ficha.unidadeRendimento)} ({fmt(fator, 2)}× a receita).
              </p>
            )}
            <div className="rounded-xl border overflow-hidden bg-[var(--panel)]" style={{ borderColor: "var(--linha)" }}>
              {ficha.ingredientes.length === 0 && <p className="px-4 py-4 text-[15px] text-[var(--tinta-sub)]">Ficha sem ingredientes cadastrados.</p>}
              {ficha.ingredientes.map((i, n) => {
                const ok = separados.has(i.id);
                const bruto = !i.ehPreparo && i.fatorCorrecao && i.fatorCorrecao > 1.005 ? qtdDeBancada(i.quantidade * fator * i.fatorCorrecao, i.unidade) : null;
                return (
                  <button
                    key={i.id}
                    onClick={() => alternar(setSeparados, i.id)}
                    aria-pressed={ok}
                    className={`w-full min-h-16 px-3.5 py-2.5 flex items-center gap-3 text-left ${n > 0 ? "border-t" : ""}`}
                    style={{ borderColor: "var(--linha)", background: ok ? tint("var(--etapa-produzido)", 7) : undefined }}
                  >
                    <span
                      className="w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: ok ? "var(--etapa-produzido)" : "var(--linha-forte)", background: ok ? "var(--etapa-produzido)" : "transparent", color: "#fff" }}
                      aria-hidden
                    >
                      {ok && <Check size={18} strokeWidth={3} />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[17px] leading-snug" style={{ color: ok ? "var(--tinta-sub)" : "var(--tinta)" }}>{i.nome}</span>
                      {i.ehPreparo && <span className="block text-[13px]" style={{ color: "var(--etapa-estoque-texto)" }}>preparo da casa</span>}
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-[19px] font-semibold" style={nums}>{qtdDoIngrediente(i)}</span>
                      {bruto && (
                        <span className="flex items-center justify-end gap-1 text-[13px] text-[var(--tinta-sub)]" style={nums} title="Peso antes de limpar (fator de correção)">
                          <Scale size={12} /> bruto {bruto}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Coluna 2: modo de preparo */}
        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <h2 className="text-[18px] font-semibold">Modo de preparo</h2>
            {etapas.length > 0 && (
              <span className="flex items-center gap-2 text-[14px] text-[var(--tinta-sub)]" style={nums}>
                {feitas.size} de {etapas.length} feitas
                {feitas.size > 0 && (
                  <button onClick={() => setFeitas(new Set())} className="min-h-10 px-2.5 rounded-lg inline-flex items-center gap-1.5 border" style={{ borderColor: "var(--linha-forte)" }}>
                    <RotateCcw size={14} /> Recomeçar
                  </button>
                )}
              </span>
            )}
          </div>
          {ficha.etapas.length > 0 && ficha.modoPreparo && <p className="text-[16px] leading-relaxed text-[var(--tinta-sub)] mb-3">{ficha.modoPreparo}</p>}
          {escalada && etapas.length > 0 && (
            <p className="text-[14px] mb-3 text-[var(--tinta-sub)]">As quantidades escritas nos passos são de 1 receita. Use as da lista “Separe antes de começar”.</p>
          )}

          {etapas.length === 0 ? (
            <p className="text-[16px] text-[var(--tinta-sub)] rounded-xl border border-dashed px-4 py-6 text-center" style={{ borderColor: "var(--linha-forte)" }}>
              O modo de preparo ainda não foi escrito. Peça ao gestor pra completar em Receitas e fichas.
            </p>
          ) : (
            <ol className="space-y-3">
              {etapas.map((e) => {
                const feita = feitas.has(e.n);
                const eAgora = agora === e.n;
                return (
                  <li key={e.n}>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-pressed={feita}
                      onClick={() => alternar(setFeitas, e.n)}
                      onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), alternar(setFeitas, e.n))}
                      className="rounded-xl border p-4 flex gap-4 bg-[var(--panel)] cursor-pointer transition-colors"
                      style={{
                        borderColor: eAgora ? "var(--etapa-producao)" : "var(--linha)",
                        boxShadow: eAgora ? `0 0 0 1px var(--etapa-producao) inset` : "var(--shadow-sm)",
                        opacity: feita ? 0.62 : 1,
                      }}
                    >
                      <span
                        className="w-11 h-11 rounded-full flex items-center justify-center text-[18px] font-semibold shrink-0"
                        style={
                          feita
                            ? { background: "var(--etapa-produzido)", color: "#fff" }
                            : eAgora
                              ? { background: "var(--etapa-producao)", color: "#fff" }
                              : { background: "var(--panel-elevated)", color: "var(--tinta)", border: "1px solid var(--linha-forte)" }
                        }
                        aria-hidden
                      >
                        {feita ? <Check size={20} strokeWidth={3} /> : e.n}
                      </span>
                      <div className="flex-1 min-w-0">
                        {eAgora && <div className="text-[12px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--etapa-producao-texto)" }}>Agora</div>}
                        {e.titulo && <div className="text-[18px] font-semibold leading-snug" style={{ textDecoration: feita ? "line-through" : undefined }}>{e.titulo}</div>}
                        {e.texto && <p className="text-[17px] leading-relaxed mt-0.5">{e.texto}</p>}
                        {e.fotoUrl && (
                          <Foto
                            url={e.fotoUrl}
                            alt={e.titulo ?? `Passo ${e.n}`}
                            tipo={ficha.tipo}
                            className="mt-3 aspect-[16/10] max-w-md rounded-xl border"
                            aoTocar={() => setAmpliada({ url: e.fotoUrl!, legenda: `${e.n}. ${e.titulo ?? ficha.nome}` })}
                            semLegenda
                          />
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          {etapas.length > 0 && feitas.size === etapas.length && (
            <p className="mt-4 rounded-xl px-4 py-3 text-[16px] font-medium flex items-center gap-2" style={{ background: tint("var(--etapa-produzido)", 12), color: "var(--etapa-produzido-texto)" }}>
              <Check size={18} strokeWidth={3} />
              {ficha.tipo === "prato_final" ? "Tudo feito. Confira com a foto antes de sair." : "Tudo feito. Etiquete com data e lote antes de guardar."}
            </p>
          )}
        </div>
      </div>

      {ampliada && <FotoAmpliada {...ampliada} aoFechar={() => setAmpliada(null)} />}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Foto com aviso quando falta (ou não carrega)

function Foto({
  url,
  alt,
  tipo,
  className = "",
  compacta,
  semLegenda,
  aoTocar,
}: {
  url: string | null;
  alt: string;
  tipo: FichaCozinha["tipo"];
  className?: string;
  compacta?: boolean;
  semLegenda?: boolean;
  aoTocar?: () => void;
}) {
  const [falhou, setFalhou] = useState(false);
  if (!url || falhou) {
    const Icone = tipo === "prato_final" ? UtensilsCrossed : CookingPot;
    return (
      <div className={`${className} flex flex-col items-center justify-center gap-1.5 text-center px-3 overflow-hidden`} style={{ background: "var(--panel-elevated)", borderColor: "var(--linha)", color: "var(--tinta-faint)" }}>
        {compacta ? <Icone size={semLegenda ? 20 : 30} /> : <Camera size={34} />}
        {!semLegenda && (
          <span className={compacta ? "text-[12px]" : "text-[15px] max-w-xs"}>
            {compacta ? "Sem foto" : tipo === "prato_final" ? "Sem foto do empratamento. Peça ao gestor pra adicionar em Receitas e fichas: é ela que mostra o padrão do prato." : "Sem foto deste preparo."}
          </span>
        )}
      </div>
    );
  }
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} draggable={false} onError={() => setFalhou(true)} className="w-full h-full object-cover" loading="lazy" />
  );
  if (!aoTocar) return <div className={`${className} overflow-hidden`} style={{ borderColor: "var(--linha)" }}>{img}</div>;
  return (
    <button
      type="button"
      onClick={(ev) => {
        ev.stopPropagation();
        aoTocar();
      }}
      aria-label={`Ampliar foto: ${alt}`}
      className={`${className} overflow-hidden block w-full`}
      style={{ borderColor: "var(--linha)" }}
    >
      {img}
    </button>
  );
}

function FotoAmpliada({ url, legenda, aoFechar }: { url: string; legenda: string; aoFechar: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aoFechar]);
  return (
    <div role="dialog" aria-modal="true" aria-label={legenda} className="fixed inset-0 z-[60] flex flex-col" style={{ background: "rgba(0,0,0,0.92)" }} onClick={aoFechar}>
      <div className="flex items-center gap-3 px-4 py-3 text-white">
        <span className="flex-1 text-[16px] font-medium truncate">{legenda}</span>
        <button onClick={aoFechar} aria-label="Fechar foto" className="w-14 h-14 -mr-2 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.12)" }}>
          <X size={26} />
        </button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center p-3 pb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={legenda} className="max-w-full max-h-full object-contain rounded-lg" />
      </div>
    </div>
  );
}

/** Mantém a tela do tablet acesa enquanto a ficha está aberta (onde o navegador deixa). */
function useTelaAcesa() {
  useEffect(() => {
    type Trava = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (tipo: "screen") => Promise<Trava> } };
    if (!nav.wakeLock) return;
    let trava: Trava | null = null;
    let ativo = true;
    const pedir = () => {
      if (document.visibilityState !== "visible") return;
      nav.wakeLock!.request("screen").then(
        (t) => {
          if (ativo) trava = t;
          else void t.release();
        },
        () => {},
      );
    };
    pedir();
    document.addEventListener("visibilitychange", pedir);
    return () => {
      ativo = false;
      document.removeEventListener("visibilitychange", pedir);
      void trava?.release().catch(() => {});
    };
  }, []);
}
