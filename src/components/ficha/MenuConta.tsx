"use client";

// CONFIGURAÇÕES (2026-10-01): menu da conta no canto da barra superior —
// quem está logado, atalhos pra Minha conta e Configurações e Sair. Antes o
// "Sair" só existia no rodapé do menu lateral, que no celular fica escondido
// atrás de "Menu". Padrão de menu do WAI-ARIA: Enter/Espaço/seta abre, setas
// andam, Esc fecha e devolve o foco ao botão, clicar fora fecha.

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

export interface ItemMenuConta {
  rotulo: string;
  icone: ReactNode;
  href?: string;
  onClick?: () => void;
  /** Linha antes do item (separa Sair do resto). */
  separado?: boolean;
}

export function MenuConta({ nome, detalhe, itens }: { nome: string; detalhe: string; itens: ItemMenuConta[] }) {
  const [aberto, setAberto] = useState(false);
  const botao = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const id = useId();

  const iniciais =
    nome
      .trim()
      .split(/\s+/)
      .filter((p) => /^\p{L}/u.test(p))
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "?";

  const itensDom = () => Array.from(lista.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  const fechar = (devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) botao.current?.focus();
  };

  useEffect(() => {
    if (!aberto) return;
    itensDom()[0]?.focus();
    const fora = (e: PointerEvent) => {
      if (!lista.current?.contains(e.target as Node) && !botao.current?.contains(e.target as Node)) fechar(false);
    };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberto]);

  const teclasMenu = (e: React.KeyboardEvent) => {
    const els = itensDom();
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      fechar();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      els[(i + 1) % els.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      els[(i - 1 + els.length) % els.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      els[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      els[els.length - 1]?.focus();
    } else if (e.key === "Tab") {
      fechar(false);
    }
  };

  const classeItem = "w-full flex items-center gap-2.5 px-3 min-h-10 text-[14px] text-left text-[var(--tinta)] outline-none hover:bg-[var(--panel-hover)] focus-visible:bg-[var(--panel-hover)]";

  return (
    <div className="relative">
      <button
        ref={botao}
        type="button"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={aberto ? id : undefined}
        aria-label={`Conta de ${nome}`}
        onClick={() => setAberto((a) => !a)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setAberto(true);
          }
        }}
        className="w-10 h-10 flex items-center justify-center rounded-full border text-[12.5px] font-semibold text-[var(--tinta)] hover:bg-[var(--panel-hover)]"
        style={{ borderColor: "var(--linha-forte)", background: "var(--panel-elevated)" }}
      >
        {/* INTEGRAÇÃO (2026-10-03): as iniciais são só desenho; o nome lido é o
            aria-label ("Conta de …"). Sem o aria-hidden o axe acusava
            label-content-name-mismatch (texto visível "GR" fora do nome). */}
        <span aria-hidden>{iniciais}</span>
      </button>
      {aberto && (
        <div
          ref={lista}
          id={id}
          role="menu"
          aria-label="Conta"
          onKeyDown={teclasMenu}
          className="absolute right-0 mt-2 w-64 rounded-xl border py-1.5 z-50 animate-fade-in"
          style={{ background: "var(--panel)", borderColor: "var(--linha)", boxShadow: "var(--shadow-elevated)" }}
        >
          <div className="px-3 pt-1.5 pb-2.5 mb-1 border-b" style={{ borderColor: "var(--linha)" }}>
            <div className="text-[14px] font-medium text-[var(--tinta)] truncate">{nome}</div>
            <div className="text-[12.5px] text-[var(--tinta-faint)] truncate">{detalhe}</div>
          </div>
          {itens.map((item) => (
            <div key={item.rotulo} role="none">
              {item.separado && <div role="separator" className="my-1 border-t" style={{ borderColor: "var(--linha)" }} />}
              {item.href ? (
                <Link href={item.href} role="menuitem" tabIndex={-1} className={classeItem} onClick={() => fechar(false)}>
                  <span className="text-[var(--tinta-faint)]" aria-hidden>
                    {item.icone}
                  </span>
                  {item.rotulo}
                </Link>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className={classeItem}
                  onClick={() => {
                    fechar(false);
                    item.onClick?.();
                  }}
                >
                  <span className="text-[var(--tinta-faint)]" aria-hidden>
                    {item.icone}
                  </span>
                  {item.rotulo}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
