"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChefHat, Carrot, ClipboardList, LineChart, Settings, AlertTriangle,
  CookingPot, Scale, Thermometer, Apple, Package, ListChecks, Calculator,
} from "lucide-react";
import { C } from "./tema";
import { createClient } from "@/lib/supabase/client";

// Mesma lista/ordem/ícones de ficha-tecnica-mvp.jsx. Só Insumos e Receitas têm
// tela construída até agora; o resto fica visível (não redesenha o menu) mas
// inerte, pra não fingir que uma rota existe quando não existe.
const NAV = [
  { id: "visao-geral", label: "Visão Geral", icon: LineChart, href: null },
  { id: "insumos", label: "Insumos", icon: Carrot, href: "/insumos" },
  { id: "cmv", label: "Fechamento de CMV", icon: Calculator, href: null },
  { id: "producoes", label: "Produções", icon: CookingPot, href: null },
  { id: "checklists", label: "Checklists de Turno", icon: ListChecks, href: null },
  { id: "estoque", label: "Estoque", icon: Package, href: null },
  { id: "proteinas", label: "Manipulação de Proteínas", icon: Scale, href: null },
  { id: "nutricional", label: "Ficha Nutricional", icon: Apple, href: null },
  { id: "seguranca", label: "Segurança Alimentar", icon: Thermometer, href: null },
  { id: "receitas", label: "Receitas & Fichas", icon: ClipboardList, href: "/receitas" },
  { id: "relatorios", label: "Relatórios", icon: AlertTriangle, href: null },
  { id: "config", label: "Configurações", icon: Settings, href: null },
] as const;

export function AppShell({
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

  const sair = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="w-full min-h-screen flex" style={{ background: C.bg, color: C.text }}>
      <aside className="w-56 shrink-0 flex flex-col" style={{ backgroundColor: C.panel, borderRight: `1px solid ${C.border}` }}>
        <div className="px-5 h-16 flex items-center gap-2" style={{ borderBottom: `1px solid ${C.border}` }}>
          <ChefHat size={16} style={{ color: C.text }} />
          <span className="text-[14px] font-semibold" style={{ letterSpacing: "-0.01em" }}>Ficha Técnica</span>
        </div>
        <nav className="flex-1 py-3 px-2.5 space-y-0.5">
          {NAV.map((n) => {
            const active = n.href != null && pathname.startsWith(n.href);
            const Icon = n.icon;
            const conteudo = (
              <>
                <Icon size={14} strokeWidth={active ? 2.25 : 1.75} />
                {n.label}
              </>
            );
            if (!n.href) {
              return (
                <div
                  key={n.id}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-left rounded-md"
                  style={{ color: C.faint, opacity: 0.6, cursor: "default" }}
                  title="Ainda não construído"
                >
                  {conteudo}
                </div>
              );
            }
            return (
              <Link
                key={n.id}
                href={n.href}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-left rounded-md"
                style={{ color: active ? C.text : C.sub, background: active ? C.bg : "transparent", fontWeight: active ? 600 : 400 }}
              >
                {conteudo}
              </Link>
            );
          })}
        </nav>
        <div className="mx-2.5 mb-3 px-3 py-2.5 text-[12px]" style={{ borderTop: `1px solid ${C.border}` }}>
          <div style={{ color: C.text }}>{nomeRestaurante}</div>
          <button onClick={sair} className="mt-0.5" style={{ color: C.faint }}>
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-auto">
        <div className="h-16 shrink-0 flex items-center px-8" style={{ borderBottom: `1px solid ${C.border}` }}>
          <h1 className="text-[15px] font-semibold" style={{ letterSpacing: "-0.01em" }}>{tituloPagina}</h1>
        </div>
        <div className="p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}
