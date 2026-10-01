"use client";

// CELULAR (2026-09-26): no celular, tabela vira lista. Cada linha mostra o
// nome à esquerda e o número que importa à direita, grande o bastante pra ler
// andando; o toque abre o detalhe/edição logo abaixo. No computador a tela
// continua usando a tabela (a lista tem md:hidden, a tabela hidden md:table).
// Onde usar: toda tabela com mais de 3 colunas (senão a página inteira rola
// pro lado no celular — o teste e2e "celular.spec.ts" pega).

import type { CSSProperties, ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function ListaMovel({ rotulo, children, className = "" }: { rotulo: string; children: ReactNode; className?: string }) {
  return (
    <ul aria-label={rotulo} className={`md:hidden ${className}`}>
      {children}
    </ul>
  );
}

export function ItemMovel({
  titulo,
  subtitulo,
  valor,
  corValor,
  detalhe,
  selo,
  aberto,
  aoTocar,
  children,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  valor?: ReactNode;
  corValor?: string;
  detalhe?: ReactNode;
  selo?: ReactNode;
  /** Com `aoTocar`, a linha vira botão (abre/fecha o conteúdo em `children`). */
  aberto?: boolean;
  aoTocar?: () => void;
  children?: ReactNode;
}) {
  const valorEstilo: CSSProperties = { fontVariantNumeric: "tabular-nums", color: corValor ?? "var(--tinta)" };
  const conteudo = (
    <>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium text-[var(--tinta)] leading-snug">{titulo}</div>
        {subtitulo && <div className="text-[13px] text-[var(--tinta-sub)] mt-0.5 leading-snug">{subtitulo}</div>}
        {selo && <div className="mt-1.5">{selo}</div>}
      </div>
      {(valor !== undefined || detalhe) && (
        <div className="text-right shrink-0 max-w-[48%]">
          {valor !== undefined && <div className="text-[15px] font-semibold leading-snug" style={valorEstilo}>{valor}</div>}
          {detalhe && <div className="text-[12.5px] text-[var(--tinta-faint)] mt-0.5 leading-snug">{detalhe}</div>}
        </div>
      )}
      {aoTocar && (
        <span className="shrink-0 self-center text-[var(--tinta-faint)]" aria-hidden>
          {aberto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      )}
    </>
  );
  return (
    <li className="border-t first:border-t-0" style={{ borderColor: "var(--linha)" }}>
      {aoTocar ? (
        <button type="button" onClick={aoTocar} aria-expanded={aberto} className="w-full px-4 py-3 min-h-14 flex items-start gap-3 text-left active:bg-[var(--panel-hover)]">
          {conteudo}
        </button>
      ) : (
        <div className="px-4 py-3 min-h-14 flex items-start gap-3">{conteudo}</div>
      )}
      {aberto && children && <div className="px-4 pb-4">{children}</div>}
    </li>
  );
}
