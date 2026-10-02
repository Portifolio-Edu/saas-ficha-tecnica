"use client";

// PRAÇAS NA COZINHA (2026-10-02): pedido do dono: "as praças também no
// layout de cozinha, pra que seja tudo montado sempre no padrão". A mesma
// praça que a gestão monta em Checklists → Praças (áreas, foto de cada área
// montada e o que precisa estar lá), aqui do jeito da cozinha: foto grande ao
// lado da lista, toque pra ampliar, toque pra conferir cada item.
// Conferir aqui é o mesmo que marcar o item no checklist (mesmo registro).
// Pra tirar: remover a seção "pracas" de MenuCozinha.tsx e CozinhaApp.tsx.

import { useState } from "react";
import { Camera, Check, ChevronLeft, Expand } from "lucide-react";
import { FotoAmpliada } from "@/components/checklists/FotoAmpliada";
import type { Checklist, ChecklistFoto, ChecklistItem } from "@/lib/dominio/checklist";

const painel = {
  background: "var(--panel)",
  borderColor: "var(--linha)",
} as const;

interface Area {
  /** null = "Geral" (item ou foto sem área). */
  id: string | null;
  nome: string;
  itens: ChecklistItem[];
  fotos: ChecklistFoto[];
}

/** Áreas na ordem da gestão; o que não tem área (ou área apagada) vai pra "Geral", no fim. */
function areasDa(praca: Checklist): Area[] {
  const areas = [...praca.areas].sort((a, b) => a.ordem - b.ordem);
  const ids = new Set(areas.map((a) => a.id));
  const ordenar = <T extends { ordem: number }>(l: T[]) => [...l].sort((a, b) => a.ordem - b.ordem);
  const lista: Area[] = areas.map((a) => ({
    id: a.id,
    nome: a.nome,
    itens: ordenar(praca.itens.filter((i) => i.areaId === a.id)),
    fotos: ordenar(praca.fotos.filter((f) => f.areaId === a.id)),
  }));
  const semArea = (x: { areaId: string | null }) => !x.areaId || !ids.has(x.areaId);
  const geral = {
    id: null,
    nome: areas.length ? "Geral" : praca.nome,
    itens: ordenar(praca.itens.filter(semArea)),
    fotos: ordenar(praca.fotos.filter(semArea)),
  };
  if (geral.itens.length || geral.fotos.length) lista.push(geral);
  return lista;
}

const conferidos = (itens: ChecklistItem[]) => itens.filter((i) => i.concluidoHoje).length;

function Progresso({ feitos, total }: { feitos: number; total: number }) {
  const pct = total ? Math.round((feitos / total) * 100) : 0;
  const completo = total > 0 && feitos === total;
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--panel-elevated)" }} aria-hidden>
      <div
        className="h-full rounded-full transition-[width]"
        style={{
          width: `${pct}%`,
          background: completo ? "var(--sucesso)" : "var(--tinta-sub)",
        }}
      />
    </div>
  );
}

export function PracasCozinha({ pracas, alternarItem }: { pracas: Checklist[]; alternarItem: (itemId: string, feito: boolean) => void }) {
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const aberta = pracas.find((p) => p.id === abertaId) ?? null;

  const abrir = (id: string | null) => {
    setAbertaId(id);
    window.scrollTo({ top: 0 });
  };

  if (pracas.length === 0) {
    return (
      <p className="text-[15px] text-[var(--tinta-sub)] max-w-xl">
        Nenhuma praça cadastrada ainda. O gestor monta em Checklists → Praças, com a foto de cada área montada e o que precisa estar nela.
      </p>
    );
  }

  if (aberta) return <DetalhePraca praca={aberta} onVoltar={() => abrir(null)} alternarItem={alternarItem} />;

  return (
    <section>
      <h1 className="text-[22px] font-semibold tracking-tight">Praças</h1>
      <p className="text-[15px] text-[var(--tinta-sub)] mt-0.5 mb-4">Monte cada área igual à foto e confira o que precisa estar lá.</p>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pracas.map((p) => {
          const feitos = conferidos(p.itens);
          const total = p.itens.length;
          const completa = total > 0 && feitos === total;
          const capa = [...p.fotos].sort((a, b) => a.ordem - b.ordem)[0];
          const nomesAreas = [...p.areas].sort((a, b) => a.ordem - b.ordem).map((a) => a.nome);
          return (
            <li key={p.id}>
              <button
                onClick={() => abrir(p.id)}
                className="w-full h-full text-left rounded-xl border overflow-hidden flex flex-col active:scale-[0.99] transition-transform"
                style={{
                  ...painel,
                  borderColor: completa ? "var(--sucesso)" : "var(--linha)",
                }}
              >
                <Foto foto={capa} alt="" className="aspect-[16/10]" vazio="Sem foto da montagem" />
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div className="text-[18px] font-semibold leading-snug">{p.nome}</div>
                  {nomesAreas.length > 0 && <div className="text-[14px] text-[var(--tinta-sub)] line-clamp-2">{nomesAreas.join(" · ")}</div>}
                  <div className="mt-auto pt-1 space-y-1.5">
                    <Progresso feitos={feitos} total={total} />
                    <div
                      className="text-[14px] font-medium"
                      style={{
                        color: completa ? "var(--sucesso)" : "var(--tinta-sub)",
                      }}
                    >
                      {completa ? "Montada no padrão hoje" : total ? `${feitos} de ${total} conferidos hoje` : "Sem itens pra conferir"}
                    </div>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DetalhePraca({ praca, onVoltar, alternarItem }: { praca: Checklist; onVoltar: () => void; alternarItem: (itemId: string, feito: boolean) => void }) {
  const areas = areasDa(praca);
  const feitos = conferidos(praca.itens);
  const total = praca.itens.length;
  const completa = total > 0 && feitos === total;
  const idArea = (a: Area) => `praca-${praca.id}-${a.id ?? "geral"}`;

  return (
    <section>
      <button onClick={onVoltar} className="min-h-11 -ml-2 pl-1 pr-3 mb-3 inline-flex items-center gap-1 text-[15px] font-medium text-[var(--tinta-sub)]">
        <ChevronLeft size={20} /> Todas as praças
      </button>
      <h1 className="text-[22px] font-semibold tracking-tight">{praca.nome}</h1>
      <div className="mt-2 mb-4 max-w-md space-y-1.5">
        <Progresso feitos={feitos} total={total} />
        <p className="text-[15px] font-medium" style={{ color: completa ? "var(--sucesso)" : "var(--tinta-sub)" }} aria-live="polite">
          {completa ? "Tudo conferido: praça montada no padrão" : `${feitos} de ${total} conferidos hoje`}
        </p>
      </div>

      {/* Atalho pras áreas (praça com várias): quebra linha em vez de rolar pro lado. */}
      {areas.length > 2 && (
        <nav aria-label="Áreas da praça" className="flex flex-wrap gap-2 mb-5">
          {areas.map((a) => {
            const ok = a.itens.length > 0 && conferidos(a.itens) === a.itens.length;
            return (
              <a
                key={idArea(a)}
                href={`#${idArea(a)}`}
                className="min-h-11 px-3.5 rounded-full border inline-flex items-center gap-2 text-[14px] font-medium"
                style={{
                  borderColor: ok ? "var(--sucesso)" : "var(--linha-forte)",
                  background: "var(--panel)",
                }}
              >
                {ok && <Check size={15} strokeWidth={3} style={{ color: "var(--sucesso)" }} aria-hidden />}
                {a.nome}
                <span className="tabular-nums text-[var(--tinta-faint)]">
                  {conferidos(a.itens)}/{a.itens.length}
                </span>
              </a>
            );
          })}
        </nav>
      )}

      <div className="space-y-5">
        {areas.map((a) => (
          <BlocoArea key={idArea(a)} id={idArea(a)} area={a} alternarItem={alternarItem} />
        ))}
      </div>
    </section>
  );
}

function BlocoArea({ id, area, alternarItem }: { id: string; area: Area; alternarItem: (itemId: string, feito: boolean) => void }) {
  const [principal, setPrincipal] = useState(0);
  const [ampliada, setAmpliada] = useState<number | null>(null);
  const feitos = conferidos(area.itens);
  const completa = area.itens.length > 0 && feitos === area.itens.length;
  const foto = area.fotos[Math.min(principal, area.fotos.length - 1)];

  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className="rounded-xl border overflow-hidden scroll-mt-20"
      style={{
        ...painel,
        borderColor: completa ? "var(--sucesso)" : "var(--linha)",
      }}
    >
      <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 border-b" style={{ borderColor: "var(--linha)" }}>
        <h2 id={`${id}-titulo`} className="text-[19px] font-semibold">
          {area.nome}
        </h2>
        <span className="text-[15px] font-semibold tabular-nums inline-flex items-center gap-1.5" style={{ color: completa ? "var(--sucesso)" : "var(--tinta-sub)" }}>
          {completa && <Check size={17} strokeWidth={3} aria-hidden />}
          {area.itens.length ? `${feitos} de ${area.itens.length}` : "sem itens"}
        </span>
      </div>

      {/* Sem foto: a lista ocupa a largura toda, com um aviso fino (um quadro
          vazio do tamanho da foto só empurraria a lista pra baixo). */}
      {!foto && (
        <p
          className="px-4 sm:px-5 py-2.5 flex items-center gap-2 text-[14px] text-[var(--tinta-sub)] border-b"
          style={{
            borderColor: "var(--linha)",
            background: "var(--panel-elevated)",
          }}
        >
          <Camera size={16} strokeWidth={1.8} className="shrink-0 text-[var(--tinta-faint)]" aria-hidden />
          Sem foto de como fica montada. O gestor tira em Checklists → Praças; até lá, siga a lista.
        </p>
      )}
      <div className={foto ? "grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]" : undefined}>
        {/* Como fica montada */}
        {foto && (
          <div className="p-4 sm:p-5 lg:border-r" style={{ borderColor: "var(--linha)" }}>
            <button
              onClick={() => setAmpliada(Math.min(principal, area.fotos.length - 1))}
              className="relative block w-full rounded-lg overflow-hidden"
              aria-label={`Ampliar foto de ${area.nome}${foto.legenda ? `: ${foto.legenda}` : ""}`}
            >
              <Foto foto={foto} alt={foto.legenda ?? `${area.nome} montada`} className="aspect-[4/3]" vazio="A foto não carregou" />
              <span
                className="absolute right-2 bottom-2 w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                aria-hidden
              >
                <Expand size={18} />
              </span>
            </button>
            {foto.legenda && <p className="text-[14px] text-[var(--tinta-sub)] mt-2">{foto.legenda}</p>}
            {area.fotos.length > 1 && (
              <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label={`Fotos de ${area.nome}`}>
                {area.fotos.map((f, i) => {
                  const ativa = f.id === foto.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setPrincipal(i)}
                      aria-pressed={ativa}
                      aria-label={`Foto ${i + 1}${f.legenda ? `: ${f.legenda}` : ""}`}
                      className="w-20 h-16 rounded-md overflow-hidden border-2"
                      style={{
                        borderColor: ativa ? "var(--tinta)" : "transparent",
                      }}
                    >
                      <Foto foto={f} alt="" className="w-full h-full" vazio="" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* O que precisa estar lá */}
        <div className={foto ? "border-t lg:border-t-0" : undefined} style={{ borderColor: "var(--linha)" }}>
          <h3 className="sr-only">O que precisa estar em {area.nome}</h3>
          {area.itens.length === 0 ? (
            <p className="p-5 text-[15px] text-[var(--tinta-sub)]">Nada listado pra esta área.</p>
          ) : (
            <ul>
              {area.itens.map((i, n) => (
                <li key={i.id} className={n > 0 ? "border-t" : ""} style={{ borderColor: "var(--linha)" }}>
                  <button
                    onClick={() => alternarItem(i.id, i.concluidoHoje)}
                    className="w-full min-h-14 px-4 sm:px-5 py-3 flex items-center gap-3 text-left"
                    aria-pressed={i.concluidoHoje}
                  >
                    <span
                      className="w-7 h-7 rounded-md border-2 flex items-center justify-center shrink-0"
                      style={{
                        borderColor: i.concluidoHoje ? "var(--sucesso)" : "var(--linha-forte)",
                        background: i.concluidoHoje ? "var(--sucesso)" : "transparent",
                        color: "#fff",
                      }}
                      aria-hidden
                    >
                      {i.concluidoHoje && <Check size={17} strokeWidth={3} />}
                    </span>
                    <span
                      className="text-[16px]"
                      style={{
                        color: i.concluidoHoje ? "var(--tinta-faint)" : "var(--tinta)",
                        textDecoration: i.concluidoHoje ? "line-through" : undefined,
                      }}
                    >
                      {i.texto}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {ampliada !== null && area.fotos[ampliada] && (
        <FotoAmpliada titulo={area.nome} fotos={area.fotos} indice={ampliada} onTrocar={setAmpliada} onFechar={() => setAmpliada(null)} />
      )}
    </section>
  );
}

/** Foto que não carrega (sem internet na cozinha, link vencido) vira um aviso em vez de quadro quebrado. */
function Foto({ foto, alt, className, vazio }: { foto: ChecklistFoto | undefined; alt: string; className: string; vazio: string }) {
  const [falhou, setFalhou] = useState<string | null>(null);
  if (!foto || falhou === foto.url) {
    return (
      <div
        className={`${className} w-full flex flex-col items-center justify-center gap-1.5 text-[14px] text-[var(--tinta-faint)]`}
        style={{ background: "var(--panel-elevated)" }}
      >
        {vazio && <Camera size={22} strokeWidth={1.6} aria-hidden />}
        {vazio}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={foto.url} alt={alt} onError={() => setFalhou(foto.url)} className={`${className} w-full object-cover`} style={{ background: "var(--panel-elevated)" }} />
  );
}
