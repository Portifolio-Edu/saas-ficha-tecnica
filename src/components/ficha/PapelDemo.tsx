"use client";

// EQUIPE (2026-09-25): "Ver como" da demo. Troca o papel (dono, gestor,
// estoquista, cozinha) pra mostrar o que cada um enxerga sem precisar de
// login. Fica guardado no navegador (localStorage "demo:papel"). No app de
// verdade o papel vem do banco (membros) — isto é só da demonstração.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Eye } from "lucide-react";
import { ROTULO_PAPEL, type Papel } from "@/lib/auth/papeis";

const CHAVE = "demo:papel";
const PAPEIS: Papel[] = ["dono", "gestor", "estoquista", "cozinha"];

const Contexto = createContext<{ papel: Papel; setPapel: (p: Papel) => void }>({ papel: "dono", setPapel: () => {} });

export function PapelDemoProvider({ children }: { children: ReactNode }) {
  const [papel, setPapelEstado] = useState<Papel>("dono");

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE) as Papel | null;
      if (salvo && PAPEIS.includes(salvo)) setPapelEstado(salvo);
    } catch {}
  }, []);

  const setPapel = (p: Papel) => {
    setPapelEstado(p);
    try {
      localStorage.setItem(CHAVE, p);
    } catch {}
  };

  return <Contexto.Provider value={{ papel, setPapel }}>{children}</Contexto.Provider>;
}

export function usePapelDemo() {
  return useContext(Contexto);
}

export function SeletorPapelDemo() {
  const { papel, setPapel } = usePapelDemo();
  return (
    <label
      className="h-10 pl-3 pr-1 rounded-lg border inline-flex items-center gap-1.5 text-[13px] text-[var(--tinta-sub)]"
      style={{ borderColor: "var(--linha)", background: "var(--panel)" }}
      title="Ver a demonstração como outro papel da equipe"
    >
      <Eye size={15} />
      <span className="hidden sm:inline">Ver como</span>
      <select
        value={papel}
        onChange={(e) => setPapel(e.target.value as Papel)}
        className="h-8 bg-transparent text-[13px] font-medium text-[var(--tinta)] outline-none cursor-pointer"
        aria-label="Ver a demonstração como"
      >
        {PAPEIS.map((p) => (
          <option key={p} value={p}>{ROTULO_PAPEL[p]}</option>
        ))}
      </select>
    </label>
  );
}
