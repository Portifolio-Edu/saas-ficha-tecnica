"use client";

// AJUSTES prints (2026-10-06): busca pelas seções que o papel pode acessar.
// Sem consultar dados do restaurante. Docs/melhorias/07-busca-e-lateral.md.
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Search, X, ArrowUpRight, type LucideIcon } from "lucide-react";
import { normalizarBusca } from "@/lib/busca";

export type DestinoBusca = {
  id: string;
  label: string;
  href: string;
  icone: LucideIcon;
};
type Props = { destinos: DestinoBusca[]; onClose: () => void };

export function BuscaNavegacao(props: Props) {
  const [destino, setDestino] = useState<HTMLElement | null>(null);
  useEffect(() => setDestino(document.body), []);
  return destino ? createPortal(<ConteudoBusca {...props} />, destino) : null;
}

function ConteudoBusca({ destinos, onClose }: Props) {
  const [busca, setBusca] = useState("");
  const id = useId();
  const fundo = useRef<HTMLDivElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const termo = normalizarBusca(busca);
  const resultados = destinos.filter((n) => normalizarBusca(n.label).includes(termo));

  useEffect(() => {
    const origem = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const anteriores = [...document.body.children]
      .filter((el): el is HTMLElement => el instanceof HTMLElement && el !== fundo.current)
      .map((el) => ({ el, inert: el.inert }));
    anteriores.forEach(({ el }) => { el.inert = true; });
    document.body.style.overflow = "hidden";
    campo.current?.focus();
    return () => {
      anteriores.forEach(({ el, inert }) => { el.inert = inert; });
      document.body.style.overflow = overflow;
      if (origem?.isConnected) origem.focus();
    };
  }, []);

  return (
    <div
      ref={fundo}
      className="fixed inset-0 z-[70] flex items-start justify-center px-3 pt-[max(16px,10dvh)] pb-4"
      style={{ background: "rgba(13,13,15,0.55)" }}
      onClick={onClose}
    >
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-descricao`}
        className="w-full max-w-lg max-h-[80dvh] flex flex-col rounded-xl border overflow-hidden"
        style={{ background: "var(--panel)", borderColor: "var(--linha-forte)", boxShadow: "var(--shadow-elevated)" }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); return; }
          const links = [...(painel.current?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? [])];
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!links.length) return;
            const atual = links.indexOf(document.activeElement as HTMLAnchorElement);
            const proximo = e.key === "ArrowDown" ? (atual + 1) % links.length : (atual < 0 ? links.length - 1 : (atual - 1 + links.length) % links.length);
            links[proximo].focus();
          } else if (e.key === "Enter" && e.target === campo.current) {
            e.preventDefault(); links[0]?.click();
          } else if (e.key === "Tab") {
            const alvos = painel.current?.querySelectorAll<HTMLElement>("input, button, a[href]");
            if (!alvos?.length) return;
            const primeiro = alvos[0], ultimo = alvos[alvos.length - 1];
            if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
            else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
          }
        }}
      >
        <div className="flex items-center justify-between gap-3 px-4 pt-3">
          <h2 id={`${id}-titulo`} className="text-[16px] font-semibold">Buscar seção</h2>
          <button onClick={onClose} aria-label="Fechar busca" className="w-11 h-11 shrink-0 flex items-center justify-center rounded-lg hover:bg-[var(--panel-hover)]" style={{ color: "var(--sub)" }}><X size={20} /></button>
        </div>
        <p id={`${id}-descricao`} className="px-4 text-[13px]" style={{ color: "var(--sub)" }}>Acesse rapidamente as seções do sistema.</p>
        <label className="flex items-center gap-2 min-h-11 mx-4 my-3 px-3 rounded-lg border focus-within:border-[var(--marca)]" style={{ borderColor: "var(--linha-forte)" }}>
          <Search size={18} className="shrink-0" style={{ color: "var(--sub)" }} aria-hidden />
          <input ref={campo} aria-label="Buscar seção" placeholder="Receitas, produções, estoque…" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full min-w-0 bg-transparent outline-none text-[15px]" />
        </label>
        <p className="sr-only" role="status">{resultados.length} {resultados.length === 1 ? "seção encontrada" : "seções encontradas"}.</p>
        <nav aria-label="Resultados da busca" className="overflow-y-auto overscroll-contain px-2 pb-2">
          {resultados.map((n) => {
            const Icone = n.icone;
            return <Link key={n.id} href={n.href} onClick={onClose} className="flex items-center gap-3 min-h-11 px-3 rounded-lg text-[14px] hover:bg-[var(--panel-hover)] focus-visible:bg-[var(--panel-elevated)]">
              <Icone size={18} className="shrink-0" style={{ color: "var(--sub)" }} aria-hidden />
              <span className="flex-1">{n.label}</span>
              <ArrowUpRight size={15} style={{ color: "var(--faint)" }} aria-hidden />
            </Link>;
          })}
          {resultados.length === 0 && <p className="px-3 py-5 text-[14px]" style={{ color: "var(--sub)" }}>Nenhuma seção encontrada. Tente outro nome.</p>}
        </nav>
        <div className="px-4 py-3 border-t text-[12px]" style={{ borderColor: "var(--linha)", color: "var(--faint)" }}>↑ ↓ navegar · Enter abrir · Esc fechar</div>
      </div>
    </div>
  );
}
