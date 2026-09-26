"use client";

// MENU DA COZINHA (2026-09-26): as 8 seções do modo cozinha não cabiam numa
// fileira de abas e a barra rolava pro lado (pedido do dono: "rolagem
// desnecessária"). Agora:
//  - tablet/computador: menu lateral agrupado (Rotina, Produção, Estoque,
//    Equipe), que recolhe pra só ícones — a escolha fica guardada no aparelho;
//  - celular: barra de baixo com as 4 mais usadas + "Mais" com o resto.
// Números nos itens: o que falta hoje (checklist) e pedidos pendentes.
// Antes: <nav> com abas roláveis no cabeçalho de CozinhaApp.tsx.
// Reverter: git revert do commit "cozinha: menu lateral".

import { useEffect, useState } from "react";
import {
  ChefHat, ClipboardCheck, Thermometer, CookingPot, Beef, BookOpen, PackageSearch, CalendarDays, ShoppingBasket,
  PanelLeftClose, PanelLeftOpen, MoreHorizontal, X,
} from "lucide-react";

export type Aba = "checklists" | "temperatura" | "producao" | "proteinas" | "fichas" | "pedidos" | "contagem" | "escala";

interface ItemMenu {
  id: Aba;
  rotulo: string;
  icone: typeof ChefHat;
}

const GRUPOS: { titulo: string; itens: ItemMenu[] }[] = [
  {
    titulo: "Rotina",
    itens: [
      { id: "checklists", rotulo: "Checklists", icone: ClipboardCheck },
      { id: "temperatura", rotulo: "Temperatura", icone: Thermometer },
    ],
  },
  {
    titulo: "Produção",
    itens: [
      { id: "producao", rotulo: "Produção", icone: CookingPot },
      { id: "proteinas", rotulo: "Proteínas", icone: Beef },
      { id: "fichas", rotulo: "Fichas", icone: BookOpen },
    ],
  },
  {
    titulo: "Estoque",
    itens: [
      { id: "pedidos", rotulo: "Pedidos", icone: ShoppingBasket },
      { id: "contagem", rotulo: "Contagem", icone: PackageSearch },
    ],
  },
  { titulo: "Equipe", itens: [{ id: "escala", rotulo: "Escala", icone: CalendarDays }] },
];

const TODOS = GRUPOS.flatMap((g) => g.itens);
/** Celular: as 4 que a cozinha mais usa ficam na barra; o resto vai pro "Mais". */
const NA_BARRA: Aba[] = ["checklists", "producao", "fichas", "pedidos"];

const CHAVE_RECOLHIDO = "cozinha:menu-recolhido";

function Contador({ n, escuro }: { n?: number; escuro?: boolean }) {
  if (!n) return null;
  return (
    <span
      className="min-w-5 h-5 px-1.5 rounded-full text-[12px] font-semibold tabular-nums inline-flex items-center justify-center"
      style={escuro ? { background: "var(--panel)", color: "var(--tinta)" } : { background: "var(--etapa-producao)", color: "#1c1917" }}
    >
      {n}
    </span>
  );
}

export function MenuLateralCozinha({ aba, onTrocar, contadores }: { aba: Aba; onTrocar: (a: Aba) => void; contadores: Partial<Record<Aba, number>> }) {
  const [recolhido, setRecolhido] = useState(false);
  useEffect(() => {
    try {
      setRecolhido(localStorage.getItem(CHAVE_RECOLHIDO) === "1");
    } catch {}
  }, []);
  const alternar = () => {
    setRecolhido((r) => {
      try {
        localStorage.setItem(CHAVE_RECOLHIDO, r ? "0" : "1");
      } catch {}
      return !r;
    });
  };

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 border-r sticky top-16 h-[calc(100dvh-4rem)] transition-[width] duration-200 motion-reduce:transition-none ${recolhido ? "w-[76px]" : "w-[212px]"}`}
      style={{ background: "var(--panel)", borderColor: "var(--linha)" }}
    >
      <nav aria-label="Seções da cozinha" className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4">
        {GRUPOS.map((g) => (
          <div key={g.titulo}>
            {!recolhido && <div className="px-3 pb-1 text-[12px] font-semibold uppercase tracking-wide text-[var(--tinta-faint)]">{g.titulo}</div>}
            {recolhido && <div className="mx-3 mb-1.5 border-t first:hidden" style={{ borderColor: "var(--linha)" }} aria-hidden />}
            <ul className="space-y-1">
              {g.itens.map((a) => {
                const Icone = a.icone;
                const ativa = aba === a.id;
                const n = contadores[a.id];
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => onTrocar(a.id)}
                      aria-current={ativa ? "page" : undefined}
                      aria-label={recolhido ? `${a.rotulo}${n ? ` (${n})` : ""}` : undefined}
                      title={recolhido ? a.rotulo : undefined}
                      className={`w-full min-h-14 rounded-xl flex items-center gap-3 text-[16px] font-medium relative ${recolhido ? "justify-center px-0" : "px-3"}`}
                      style={ativa ? { background: "var(--tinta)", color: "var(--panel)" } : { color: "var(--tinta-sub)" }}
                    >
                      <Icone size={21} className="shrink-0" aria-hidden />
                      {!recolhido && <span className="flex-1 text-left">{a.rotulo}</span>}
                      {!recolhido && <Contador n={n} escuro={ativa} />}
                      {recolhido && n ? <span className="absolute top-2 right-3 w-2.5 h-2.5 rounded-full" style={{ background: "var(--etapa-producao)" }} aria-hidden /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <button
        onClick={alternar}
        aria-expanded={!recolhido}
        aria-label={recolhido ? "Abrir menu" : "Recolher menu"}
        className={`m-2.5 min-h-12 rounded-xl flex items-center gap-2.5 text-[14px] font-medium text-[var(--tinta-sub)] hover:bg-[var(--panel-hover)] ${recolhido ? "justify-center" : "px-3"}`}
      >
        {recolhido ? <PanelLeftOpen size={20} aria-hidden /> : <PanelLeftClose size={20} aria-hidden />}
        {!recolhido && "Recolher menu"}
      </button>
    </aside>
  );
}

export function BarraInferiorCozinha({ aba, onTrocar, contadores }: { aba: Aba; onTrocar: (a: Aba) => void; contadores: Partial<Record<Aba, number>> }) {
  const [mais, setMais] = useState(false);
  const naBarra = TODOS.filter((a) => NA_BARRA.includes(a.id));
  const resto = TODOS.filter((a) => !NA_BARRA.includes(a.id));
  const maisAtivo = resto.some((a) => a.id === aba);
  const trocar = (a: Aba) => {
    setMais(false);
    onTrocar(a);
  };

  return (
    <>
      {mais && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setMais(false)}>
          <div
            role="dialog"
            aria-label="Mais seções"
            className="absolute inset-x-0 bottom-0 rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            style={{ background: "var(--panel)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[17px] font-semibold">Mais seções</h2>
              <button onClick={() => setMais(false)} aria-label="Fechar" className="w-11 h-11 -mr-2 flex items-center justify-center text-[var(--tinta-faint)]">
                <X size={20} />
              </button>
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {resto.map((a) => {
                const Icone = a.icone;
                const ativa = aba === a.id;
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => trocar(a.id)}
                      aria-current={ativa ? "page" : undefined}
                      className="w-full min-h-16 rounded-xl border flex items-center gap-3 px-4 text-[16px] font-medium"
                      style={ativa ? { background: "var(--tinta)", color: "var(--panel)", borderColor: "var(--tinta)" } : { borderColor: "var(--linha-forte)" }}
                    >
                      <Icone size={20} aria-hidden /> {a.rotulo}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
      <nav
        aria-label="Seções da cozinha"
        className="md:hidden fixed inset-x-0 bottom-0 z-20 border-t grid grid-cols-5 pb-[env(safe-area-inset-bottom)]"
        style={{ background: "var(--panel)", borderColor: "var(--linha)" }}
      >
        {naBarra.map((a) => {
          const Icone = a.icone;
          const ativa = aba === a.id;
          const n = contadores[a.id];
          return (
            <button
              key={a.id}
              onClick={() => trocar(a.id)}
              aria-current={ativa ? "page" : undefined}
              className="min-h-16 flex flex-col items-center justify-center gap-1 text-[12px] font-medium relative"
              style={{ color: ativa ? "var(--tinta)" : "var(--tinta-faint)" }}
            >
              <Icone size={22} aria-hidden />
              {a.rotulo}
              {n ? <span className="absolute top-2 left-1/2 ml-2"><Contador n={n} /></span> : null}
            </button>
          );
        })}
        <button
          onClick={() => setMais(true)}
          aria-haspopup="dialog"
          className="min-h-16 flex flex-col items-center justify-center gap-1 text-[12px] font-medium"
          style={{ color: maisAtivo ? "var(--tinta)" : "var(--tinta-faint)" }}
        >
          <MoreHorizontal size={22} aria-hidden />
          {maisAtivo ? TODOS.find((a) => a.id === aba)?.rotulo : "Mais"}
        </button>
      </nav>
    </>
  );
}
