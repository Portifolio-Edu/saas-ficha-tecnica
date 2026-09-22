"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChefHat, Carrot, ClipboardList, LineChart, Settings, AlertTriangle,
  CookingPot, Scale, Thermometer, Apple, Package, ListChecks, Calculator,
  Menu, X, LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ToastContainer } from "./Toast";
import { BotaoAgenteIa } from "@/components/ia/BotaoAgenteIa";

interface NavItem {
  id: string;
  label: string;
  icon: typeof LineChart;
  href: string;
}

interface NavGroup {
  titulo?: string;
  itens: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    itens: [
      { id: "visao-geral", label: "Visão Geral", icon: LineChart, href: "/visao-geral" },
    ],
  },
  {
    titulo: "OPERAÇÃO",
    itens: [
      { id: "insumos", label: "Insumos", icon: Carrot, href: "/insumos" },
      { id: "receitas", label: "Receitas & Fichas", icon: ClipboardList, href: "/receitas" },
      { id: "producoes", label: "Produções", icon: CookingPot, href: "/producoes" },
      { id: "estoque", label: "Estoque", icon: Package, href: "/estoque" },
      { id: "cmv", label: "Fechamento de CMV", icon: Calculator, href: "/cmv" },
    ],
  },
  {
    titulo: "QUALIDADE & CONTROLE",
    itens: [
      { id: "checklists", label: "Checklists de Turno", icon: ListChecks, href: "/checklists" },
      { id: "proteinas", label: "Manipulação Proteínas", icon: Scale, href: "/proteinas" },
      { id: "nutricional", label: "Ficha Nutricional", icon: Apple, href: "/nutricional" },
      { id: "seguranca", label: "Segurança Alimentar", icon: Thermometer, href: "/seguranca" },
    ],
  },
  {
    titulo: "GESTÃO",
    itens: [
      { id: "relatorios", label: "Relatórios", icon: AlertTriangle, href: "/relatorios" },
      { id: "config", label: "Configurações", icon: Settings, href: "/configuracoes" },
    ],
  },
];

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
  const [mobileAberto, setMobileAberto] = useState(false);

  const sair = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const iniciais = (nomeRestaurante || "FT")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="px-5 h-16 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
            style={{
              background: "var(--gradient-accent)",
              color: "#FFFFFF",
            }}
          >
            <ChefHat size={18} />
          </div>
          <div>
            <div className="text-[14px] font-bold leading-none tracking-tight">Ficha Técnica</div>
            <div className="text-[10.5px] mt-0.5 leading-none" style={{ color: "var(--faint)" }}>
              SaaS Gastronômico
            </div>
          </div>
        </div>
        <button
          onClick={() => setMobileAberto(false)}
          className="md:hidden p-1 rounded-md text-[var(--sub)] hover:text-[var(--text)]"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav Items grouped */}
      <nav className="flex-1 py-3 px-3 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map((grupo, idx) => (
          <div key={idx} className="space-y-1">
            {grupo.titulo && (
              <div
                className="px-2.5 py-1 text-[10.5px] font-semibold tracking-wider uppercase"
                style={{ color: "var(--faint)" }}
              >
                {grupo.titulo}
              </div>
            )}
            {grupo.itens.map((n) => {
              const active = n.href != null && pathname.startsWith(n.href);
              const Icon = n.icon;
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setMobileAberto(false)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left rounded-lg transition-all duration-150 relative ${
                    active
                      ? "font-semibold shadow-sm"
                      : "hover:bg-[var(--accent-soft)]/50 hover:text-[var(--text)]"
                  }`}
                  style={{
                    color: active ? "var(--text)" : "var(--sub)",
                    backgroundColor: active ? "var(--accent-soft)" : "transparent",
                  }}
                >
                  <Icon
                    size={16}
                    strokeWidth={active ? 2.25 : 1.75}
                    style={{ color: active ? "var(--accent)" : "currentColor" }}
                  />
                  <span>{n.label}</span>
                  {active && (
                    <span
                      className="absolute right-2 w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: "var(--accent)" }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Restaurant Profile & Logout */}
      <div
        className="m-3 p-2.5 rounded-xl border flex items-center justify-between gap-2"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--bg)",
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{
              backgroundColor: "var(--accent-soft)",
              color: "var(--accent)",
            }}
          >
            {iniciais}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-medium truncate" style={{ color: "var(--text)" }}>
              {nomeRestaurante}
            </div>
            <div className="text-[10.5px]" style={{ color: "var(--accent)" }}>
              Plano Pro
            </div>
          </div>
        </div>
        <button
          onClick={sair}
          title="Sair"
          aria-label="Sair"
          className="p-1.5 rounded-lg hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] transition-colors shrink-0"
          style={{ color: "var(--faint)" }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-screen flex" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex w-60 shrink-0 flex-col sticky top-0 h-screen"
        style={{ backgroundColor: "var(--panel)", borderRight: "1px solid var(--border)" }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileAberto && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setMobileAberto(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 z-50 md:hidden flex flex-col transition-transform duration-300 ease-in-out ${
          mobileAberto ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          backgroundColor: "var(--panel)",
          borderRight: "1px solid var(--border)",
          boxShadow: "var(--shadow-lift)",
        }}
      >
        {sidebarContent}
      </aside>

      {/* Main Content Area */}
      <main id="conteudo" className="flex-1 flex flex-col min-w-0 overflow-auto">
        <header
          className="h-16 shrink-0 flex items-center justify-between px-5 md:px-8 sticky top-0 z-20 backdrop-blur-md"
          style={{
            backgroundColor: "var(--panel)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileAberto(true)}
              className="md:hidden p-1.5 rounded-lg hover:bg-[var(--bg)] text-[var(--sub)]"
              aria-label="Abrir menu lateral"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-[20px] font-bold" style={{ letterSpacing: "-0.02em" }}>
              {tituloPagina}
            </h1>
          </div>
          <BotaoAgenteIa variante="cabecalho" />
        </header>
        <div className="p-4 md:p-8 flex-1 animate-fade-in">{children}</div>
      </main>
      <BotaoAgenteIa variante="flutuante" />
      <ToastContainer />
    </div>
  );
}
