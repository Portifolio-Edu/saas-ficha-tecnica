"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Carrot, ClipboardList, LineChart, Settings, AlertTriangle,
  CookingPot, Scale, Thermometer, Apple, Package, ListChecks, Calculator,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ToastContainer } from "./Toast";

// Mesma lista de rotas/ícones de ficha-tecnica-mvp.jsx, agora agrupada por
// função em vez de uma lista plana de 12 itens -- Visão Geral fica solta no
// topo (é o destino, não uma categoria), o resto se divide em Operação (o
// dia a dia da cozinha), Qualidade & Controle (compliance/segurança) e
// Gestão (visão de fora). Nenhuma rota, ícone ou label mudou.
const NAV_SOLTO = { id: "visao-geral", label: "Visão Geral", icon: LineChart, href: "/visao-geral" } as const;

const NAV_GRUPOS = [
  {
    titulo: "Operação",
    itens: [
      { id: "insumos", label: "Insumos", icon: Carrot, href: "/insumos" },
      { id: "receitas", label: "Receitas & Fichas", icon: ClipboardList, href: "/receitas" },
      { id: "producoes", label: "Produções", icon: CookingPot, href: "/producoes" },
      { id: "estoque", label: "Estoque", icon: Package, href: "/estoque" },
      { id: "cmv", label: "Fechamento de CMV", icon: Calculator, href: "/cmv" },
    ],
  },
  {
    titulo: "Qualidade & controle",
    itens: [
      { id: "checklists", label: "Checklists de Turno", icon: ListChecks, href: "/checklists" },
      { id: "proteinas", label: "Manipulação de Proteínas", icon: Scale, href: "/proteinas" },
      { id: "nutricional", label: "Ficha Nutricional", icon: Apple, href: "/nutricional" },
      { id: "seguranca", label: "Segurança Alimentar", icon: Thermometer, href: "/seguranca" },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { id: "relatorios", label: "Relatórios", icon: AlertTriangle, href: "/relatorios" },
      { id: "config", label: "Configurações", icon: Settings, href: "/configuracoes" },
    ],
  },
] as const;

function ItemNav({ id, label, icon: Icon, href, active }: { id: string; label: string; icon: typeof LineChart; href: string; active: boolean }) {
  return (
    <Link
      key={id}
      href={href}
      className="w-full flex items-center gap-2.5 py-1.5 px-2.5 text-[13px] text-left rounded-lg"
      style={{
        color: active ? "var(--marca)" : "var(--sub)",
        background: active ? "var(--marca-soft)" : "transparent",
        fontWeight: active ? 600 : 400,
      }}
    >
      <Icon size={14} strokeWidth={active ? 2.25 : 1.75} />
      {label}
    </Link>
  );
}

// Iniciais reais do nome do restaurante (primeira letra das duas primeiras
// palavras), não um placeholder fixo -- funciona pra qualquer cliente.
function iniciais(nome: string) {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  return (palavras[0]?.[0] ?? "") + (palavras[1]?.[0] ?? "");
}

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
    <div className="w-full min-h-screen flex" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <aside className="w-60 shrink-0 flex flex-col textura-craft" style={{ backgroundColor: "var(--panel)", borderRight: `1px solid ${"var(--border)"}` }}>
        <div className="relative px-5 pt-5 pb-4" style={{ borderBottom: `2px solid ${"var(--marca)"}` }}>
          <div aria-hidden className="absolute -left-6 -top-6 rounded-full" style={{ width: 90, height: 90, background: "var(--brasa-glow)", filter: "blur(18px)" }} />
          <div className="relative fonte-marca texto-brasa leading-[0.88]" style={{ fontSize: 25, letterSpacing: "0.01em" }}>
            FICHA
            <br />
            TÉCNICA
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4">
          <div className="space-y-0.5">
            <ItemNav {...NAV_SOLTO} active={pathname.startsWith(NAV_SOLTO.href)} />
          </div>

          {NAV_GRUPOS.map((grupo) => (
            <div key={grupo.titulo}>
              <div
                className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase"
                style={{ color: "var(--faint)", letterSpacing: "0.08em" }}
              >
                {grupo.titulo}
              </div>
              <div className="space-y-0.5">
                {grupo.itens.map((n) => (
                  <ItemNav key={n.id} {...n} active={pathname.startsWith(n.href)} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mx-2.5 mb-3 px-3 py-2.5 flex items-center gap-2.5" style={{ borderTop: `1px solid ${"var(--border)"}` }}>
          <div
            aria-hidden
            className="shrink-0 flex items-center justify-center rounded-full text-[11px] font-semibold"
            style={{ width: 30, height: 30, background: "var(--marca-soft)", color: "var(--marca)" }}
          >
            {iniciais(nomeRestaurante)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] truncate" style={{ color: "var(--text)" }}>{nomeRestaurante}</div>
            <div className="flex items-center gap-1.5 text-[10.5px] mt-0.5" style={{ color: "var(--accent)" }}>
              <span aria-hidden className="rounded-full shrink-0" style={{ width: 6, height: 6, background: "var(--accent)" }} />
              Sistema operacional
            </div>
          </div>
          <button onClick={sair} title="Sair" className="shrink-0 text-[11px]" style={{ color: "var(--faint)" }}>
            Sair
          </button>
        </div>
      </aside>

      <main id="conteudo" className="flex-1 flex flex-col overflow-auto">
        <div className="h-16 shrink-0 flex items-center px-8" style={{ borderBottom: `1px solid ${"var(--border)"}` }}>
          <h1 className="text-[26px] font-bold" style={{ letterSpacing: "-0.025em" }}>{tituloPagina}</h1>
        </div>
        <div className="p-8 flex-1">{children}</div>
      </main>
      <ToastContainer />
    </div>
  );
}
