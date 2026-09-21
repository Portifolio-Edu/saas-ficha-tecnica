"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Carrot, ClipboardList, LineChart, Settings, AlertTriangle,
  CookingPot, Scale, Thermometer, Apple, Package, ListChecks, Calculator,
} from "lucide-react";
import { ToastContainer } from "./Toast";

// Cópia de AppShell.tsx para o modo demo (/preview), que roda sem sessão
// Supabase real. Único conteúdo alterado: todo href do NAV ganha o prefixo
// /preview, e "Sair" volta pro índice do demo em vez de deslogar de
// verdade (não há sessão pra encerrar aqui). Não editar AppShell.tsx com isso.
const NAV = [
  { id: "visao-geral", label: "Visão Geral", icon: LineChart, href: "/preview/visao-geral" },
  { id: "insumos", label: "Insumos", icon: Carrot, href: "/preview/insumos" },
  { id: "cmv", label: "Fechamento de CMV", icon: Calculator, href: "/preview/cmv" },
  { id: "producoes", label: "Produções", icon: CookingPot, href: "/preview/producoes" },
  { id: "checklists", label: "Checklists de Turno", icon: ListChecks, href: "/preview/checklists" },
  { id: "estoque", label: "Estoque", icon: Package, href: "/preview/estoque" },
  { id: "proteinas", label: "Manipulação de Proteínas", icon: Scale, href: "/preview/proteinas" },
  { id: "nutricional", label: "Ficha Nutricional", icon: Apple, href: "/preview/nutricional" },
  { id: "seguranca", label: "Segurança Alimentar", icon: Thermometer, href: "/preview/seguranca" },
  { id: "receitas", label: "Receitas & Fichas", icon: ClipboardList, href: "/preview/receitas" },
  { id: "relatorios", label: "Relatórios", icon: AlertTriangle, href: "/preview/relatorios" },
  { id: "config", label: "Configurações", icon: Settings, href: "/preview/configuracoes" },
] as const;

export function DemoShell({
  nomeRestaurante,
  tituloPagina,
  children,
}: {
  nomeRestaurante: string;
  tituloPagina: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const sair = () => {
    router.push("/preview");
  };

  return (
    <div className="w-full min-h-screen flex" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <aside className="w-56 shrink-0 flex flex-col textura-craft" style={{ backgroundColor: "var(--panel)", borderRight: `1px solid ${"var(--border)"}` }}>
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: `2px solid ${"var(--marca)"}` }}>
          <div className="fonte-marca leading-[0.92]" style={{ color: "var(--marca)", fontSize: 19, letterSpacing: "0.01em" }}>
            FICHA
            <br />
            TÉCNICA
          </div>
        </div>
        <nav className="flex-1 py-3 pr-2.5 space-y-0.5">
          {NAV.map((n) => {
            const active = n.href != null && pathname.startsWith(n.href);
            const Icon = n.icon;
            const conteudo = (
              <>
                <Icon size={14} strokeWidth={active ? 2.25 : 1.75} />
                {n.label}
              </>
            );
            return (
              <Link
                key={n.id}
                href={n.href}
                className="w-full flex items-center gap-2.5 py-1.5 text-[13px] text-left"
                style={{
                  color: active ? "var(--text)" : "var(--sub)",
                  background: active ? "var(--marca-soft)" : "transparent",
                  fontWeight: active ? 600 : 400,
                  borderLeft: `3px solid ${active ? "var(--marca)" : "transparent"}`,
                  borderRadius: "0 8px 8px 0",
                  paddingLeft: 9,
                }}
              >
                {conteudo}
              </Link>
            );
          })}
        </nav>
        <div className="mx-2.5 mb-3 px-3 py-2.5 text-[12px]" style={{ borderTop: `1px solid ${"var(--border)"}` }}>
          <div style={{ color: "var(--text)" }}>{nomeRestaurante}</div>
          <button onClick={sair} className="mt-0.5" style={{ color: "var(--faint)" }}>
            Sair
          </button>
        </div>
      </aside>

      <main id="conteudo" className="flex-1 flex flex-col overflow-auto">
        <div className="h-16 shrink-0 flex items-center px-8" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
          <h1 className="text-[19px] font-semibold" style={{ letterSpacing: "-0.02em" }}>{tituloPagina}</h1>
        </div>
        <div className="p-8 flex-1">{children}</div>
      </main>
      <ToastContainer />
    </div>
  );
}
