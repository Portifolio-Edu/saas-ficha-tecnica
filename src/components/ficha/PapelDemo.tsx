"use client";

// EQUIPE (2026-09-25): "Ver como" da demo. Troca o papel (dono, gestor,
// estoquista, cozinha) pra mostrar o que cada um enxerga sem precisar de
// login. Fica guardado no navegador (localStorage "demo:papel"). No app de
// verdade o papel vem do banco (membros) — isto é só da demonstração.

import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Eye } from "lucide-react";
import { ROTULO_PAPEL, type Papel } from "@/lib/auth/papeis";

const CHAVE = "demo:papel";
const PAPEIS: Papel[] = ["dono", "gestor", "estoquista", "cozinha"];

// LAYOUT (2026-10-03): `pronto` diz se o papel salvo já foi lido. O HTML vem do
// build com "dono"; até ler o localStorage, o cabeçalho esconde o papel em vez
// de mostrar "Dono" e trocar logo depois. Com o shell no layout.tsx o provider
// não remonta mais a cada navegação, então isso só acontece na carga da página.
const Contexto = createContext<{ papel: Papel; setPapel: (p: Papel) => void; pronto: boolean }>({ papel: "dono", setPapel: () => {}, pronto: true });

export function PapelDemoProvider({ children }: { children: ReactNode }) {
  const [papel, setPapelEstado] = useState<Papel>("dono");
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE) as Papel | null;
      if (salvo && PAPEIS.includes(salvo)) setPapelEstado(salvo);
    } catch {}
    setPronto(true);
  }, []);

  const setPapel = (p: Papel) => {
    setPapelEstado(p);
    try {
      localStorage.setItem(CHAVE, p);
    } catch {}
  };

  return <Contexto.Provider value={{ papel, setPapel, pronto }}>{children}</Contexto.Provider>;
}

export function usePapelDemo() {
  return useContext(Contexto);
}

// SELETOR (2026-10-03): antes era um <select> nativo, e a lista abria no estilo
// do sistema operacional (fundo branco e azul do Windows, mesmo no tema escuro).
// Agora é uma lista própria com os tokens do tema. O projeto não tem componente
// de menu (src/components/ui só tem o button), e pra 4 opções não vale trazer
// uma biblioteca: o teclado segue o padrão listbox do WAI-ARIA (setas, Home/End,
// Enter/Espaço escolhe, Esc e Tab fecham, o foco volta pro botão).
// Versão anterior: `git show 5a6843f:src/components/ficha/PapelDemo.tsx`.
const RESUMO_PAPEL: Record<Papel, string> = {
  dono: "Tudo, inclusive equipe e assinatura",
  gestor: "Operação inteira, com custos e CMV",
  estoquista: "Compras, estoque e CMV do estoque",
  cozinha: "Aparelho da cozinha, sem custos",
};

export function SeletorPapelDemo() {
  const { papel, setPapel, pronto } = usePapelDemo();
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const caixaRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const id = useId();

  const abrir = () => {
    setAtivo(PAPEIS.indexOf(papel));
    setAberto(true);
  };
  const fechar = (devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) botaoRef.current?.focus();
  };
  const escolher = (p: Papel) => {
    setPapel(p);
    fechar();
  };

  useEffect(() => {
    if (!aberto) return;
    listaRef.current?.focus();
    const foraDaCaixa = (e: PointerEvent) => {
      if (!caixaRef.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("pointerdown", foraDaCaixa);
    return () => document.removeEventListener("pointerdown", foraDaCaixa);
  }, [aberto]);

  const teclaNoBotao = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      abrir();
    }
  };

  const teclaNaLista = (e: React.KeyboardEvent) => {
    const ultimo = PAPEIS.length - 1;
    if (e.key === "ArrowDown") setAtivo((i) => Math.min(ultimo, i + 1));
    else if (e.key === "ArrowUp") setAtivo((i) => Math.max(0, i - 1));
    else if (e.key === "Home") setAtivo(0);
    else if (e.key === "End") setAtivo(ultimo);
    else if (e.key === "Enter" || e.key === " ") escolher(PAPEIS[ativo]);
    else if (e.key === "Escape") fechar();
    else if (e.key === "Tab") return fechar(false);
    else return;
    e.preventDefault();
  };

  return (
    <div ref={caixaRef} className="relative">
      <button
        ref={botaoRef}
        type="button"
        onClick={() => (aberto ? fechar() : abrir())}
        onKeyDown={teclaNoBotao}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={aberto ? `${id}-lista` : undefined}
        // O nome lido começa pelo texto visível ("Ver como" + papel), regra do axe
        // label-content-name-mismatch; antes: aria-label "Ver a demonstração como".
        // O {" "} entre os spans conta: sem ele o texto lido era "Ver comoGestor".
        aria-label={pronto ? `Ver como ${ROTULO_PAPEL[papel]}, papel da demonstração` : "Ver como, papel da demonstração"}
        title="Ver a demonstração como outro papel da equipe"
        className="h-10 pl-2 sm:pl-3 pr-2 rounded-lg border inline-flex items-center gap-1.5 text-[13px] text-[var(--tinta-sub)] hover:bg-[var(--panel-hover)] transition-colors"
        style={{ borderColor: "var(--linha)", background: aberto ? "var(--panel-hover)" : "var(--panel)" }}
      >
        <Eye size={15} className="hidden sm:block" aria-hidden />
        <span className="hidden sm:inline">Ver como</span>{" "}
        <span className={`font-medium text-[var(--tinta)] ${pronto ? "" : "invisible"}`}>{ROTULO_PAPEL[papel]}</span>
        <ChevronDown size={14} aria-hidden className={`text-[var(--tinta-faint)] transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto && (
        <ul
          ref={listaRef}
          id={`${id}-lista`}
          role="listbox"
          tabIndex={-1}
          aria-label="Papel da demonstração"
          aria-activedescendant={`${id}-${PAPEIS[ativo]}`}
          onKeyDown={teclaNaLista}
          className="absolute right-0 top-full mt-1.5 z-40 w-64 p-1 rounded-xl border outline-none animate-fade-in"
          style={{ background: "var(--panel)", borderColor: "var(--linha)", boxShadow: "var(--shadow-elevated)" }}
        >
          {PAPEIS.map((p, i) => {
            const selecionado = p === papel;
            return (
              <li
                key={p}
                id={`${id}-${p}`}
                role="option"
                aria-selected={selecionado}
                onClick={() => escolher(p)}
                onPointerMove={() => setAtivo(i)}
                className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer"
                style={{ background: i === ativo ? "var(--panel-hover)" : undefined }}
              >
                <span className="w-4 h-5 shrink-0 flex items-center justify-center" aria-hidden>
                  {selecionado && <Check size={15} strokeWidth={2.2} style={{ color: "var(--marca)" }} />}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[13px] text-[var(--tinta)] ${selecionado ? "font-semibold" : "font-medium"}`}>{ROTULO_PAPEL[p]}</span>
                  <span className="block text-[12px] text-[var(--tinta-sub)] leading-snug">{RESUMO_PAPEL[p]}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
