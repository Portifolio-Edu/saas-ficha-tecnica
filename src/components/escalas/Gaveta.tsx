"use client";

// PERFIL (2026-09-27): painel lateral (gaveta) das Escalas. Renderiza direto
// no <body> (portal): dentro da página, um ancestral com transform (a
// animação de entrada) fazia o `position: fixed` valer pra página inteira, e
// no celular, com a página rolada, a gaveta abria lá em cima, fora da tela.
// Trava a rolagem da página enquanto está aberta. Gavetas abertas uma sobre
// a outra (prontuário → escala) empilham na ordem em que abriram.

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Gaveta({ rotulo, largura = 560, aoFechar, children }: { rotulo: string; largura?: number; aoFechar: () => void; children: ReactNode }) {
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, []);
  // Só abre por toque (nunca vem aberta do servidor), então o document existe.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.5)" }} onClick={aoFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={rotulo}
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full overflow-y-auto overscroll-contain flex flex-col animate-fade-in"
        style={{ maxWidth: largura, background: "var(--panel)", borderLeft: "1px solid var(--linha)", color: "var(--tinta)" }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
