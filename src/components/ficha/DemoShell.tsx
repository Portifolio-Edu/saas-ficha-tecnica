"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChefHat, Carrot, ClipboardList, LineChart, Settings, AlertTriangle,
  CookingPot, Scale, Thermometer, Apple, Package, ListChecks, Calculator,
} from "lucide-react";
import { C } from "./tema";

// Cópia de AppShell.tsx para o modo demo (/preview-tmp), que roda sem sessão
// Supabase real. Único conteúdo alterado: todo href do NAV ganha o prefixo
// /preview-tmp, e "Sair" volta pro índice do demo em vez de deslogar de
// verdade (não há sessão pra encerrar aqui). Não editar AppShell.tsx com isso.
const NAV = [
  { id: "visao-geral", label: "Visão Geral", icon: LineChart, href: null },
  { id: "insumos", label: "Insumos", icon: Carrot, href: "/preview-tmp/insumos" },
  { id: "cmv", label: "Fechamento de CMV", icon: Calculator, href: "/preview-tmp/cmv" },
  { id: "producoes", label: "Produções", icon: CookingPot, href: "/preview-tmp/producoes" },
  { id: "checklists", label: "Checklists de Turno", icon: ListChecks, href: "/preview-tmp/checklists" },
  { id: "estoque", label: "Estoque", icon: Package, href: "/preview-tmp/estoque" },
  { id: "proteinas", label: "Manipulação de Proteínas", icon: Scale, href: "/preview-tmp/proteinas" },
  { id: "nutricional", label: "Ficha Nutricional", icon: Apple, href: "/preview-tmp/nutricional" },
  { id: "seguranca", label: "Segurança Alimentar", icon: Thermometer, href: "/preview-tmp/seguranca" },
  { id: "receitas", label: "Receitas & Fichas", icon: ClipboardList, href: "/preview-tmp/receitas" },
  { id: "relatorios", label: "Relatórios", icon: AlertTriangle, href: "/preview-tmp/relatorios" },
  { id: "config", label: "Configurações", icon: Settings, href: null },
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
    router.push("/preview-tmp");
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
