"use client";

// PRAÇAS NA COZINHA (2026-10-02): a foto ampliada da praça saiu de
// PracasView.tsx (era "Ampliada", só da gestão) pra ser a mesma na gestão e
// no modo cozinha. Ganhou: arrastar pro lado no tablet troca a foto, o foco
// vai pro "Fechar" ao abrir e volta pra foto tocada ao fechar.
// Antes: `git show fbbcde5:src/components/checklists/PracasView.tsx` (função Ampliada).

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ChecklistFoto } from "@/lib/dominio/checklist";

/** Distância mínima (px) do arraste pra trocar de foto. */
const ARRASTE_MIN = 50;

export function FotoAmpliada({
  titulo,
  fotos,
  indice,
  onTrocar,
  onFechar,
}: {
  titulo: string;
  fotos: ChecklistFoto[];
  indice: number;
  onTrocar: (i: number) => void;
  onFechar: () => void;
}) {
  const foto = fotos[indice];
  const varias = fotos.length > 1;
  const anterior = () => onTrocar((indice - 1 + fotos.length) % fotos.length);
  const proxima = () => onTrocar((indice + 1) % fotos.length);
  const fechar = useRef<HTMLButtonElement>(null);
  const inicioX = useRef<number | null>(null);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
      if (varias && e.key === "ArrowLeft") anterior();
      if (varias && e.key === "ArrowRight") proxima();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  // Foco no "Fechar" ao abrir; ao fechar, volta pra quem abriu.
  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    fechar.current?.focus();
    return () => antes?.focus?.();
  }, []);

  if (!foto) return null;
  const rotulo = foto.legenda ? `${titulo} · ${foto.legenda}` : titulo;
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.9)" }} role="dialog" aria-modal="true" aria-label={rotulo}>
      <div className="flex items-center justify-between gap-3 px-4 h-16 shrink-0 text-white">
        <span className="text-[15px] min-w-0 flex items-baseline gap-2">
          <span className="truncate">{rotulo}</span>
          {varias && (
            <span className="text-white/60 shrink-0 tabular-nums">
              {indice + 1} de {fotos.length}
            </span>
          )}
        </span>
        <button ref={fechar} onClick={onFechar} className="w-12 h-12 flex items-center justify-center rounded-lg hover:bg-white/10" aria-label="Fechar">
          <X size={24} />
        </button>
      </div>
      <div
        className="relative flex-1 min-h-0 flex items-center justify-center px-2 pb-6"
        onTouchStart={(e) => (inicioX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const x0 = inicioX.current;
          inicioX.current = null;
          const x1 = e.changedTouches[0]?.clientX;
          if (!varias || x0 == null || x1 == null || Math.abs(x1 - x0) < ARRASTE_MIN) return;
          if (x1 < x0) proxima();
          else anterior();
        }}
      >
        {varias && (
          // Por cima da foto, nas beiradas: no celular a foto ocupa a largura toda.
          <button onClick={anterior} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-14 h-14 flex items-center justify-center rounded-full text-white" style={{ background: "rgba(0,0,0,0.5)" }} aria-label="Foto anterior">
            <ChevronLeft size={28} />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={foto.url} alt={rotulo} className="max-h-full max-w-full object-contain rounded-md select-none" draggable={false} />
        {varias && (
          <button onClick={proxima} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-14 h-14 flex items-center justify-center rounded-full text-white" style={{ background: "rgba(0,0,0,0.5)" }} aria-label="Próxima foto">
            <ChevronRight size={28} />
          </button>
        )}
      </div>
    </div>
  );
}
