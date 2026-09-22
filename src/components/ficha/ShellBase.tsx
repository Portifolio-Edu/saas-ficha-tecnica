"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Carrot, ClipboardList, LineChart, Settings, AlertTriangle,
  CookingPot, Scale, Thermometer, Apple, Package, ListChecks, Calculator,
} from "lucide-react";
import { ToastContainer } from "./Toast";

// Visão Geral fica solta no topo (é o destino, não uma categoria); o resto se
// divide em Operação (o dia a dia da cozinha), Qualidade & Controle
// (compliance/segurança) e Gestão (visão de fora). Rotas relativas: AppShell
// usa sem prefixo, DemoShell prefixa com /preview.
const NAV_SOLTO = { id: "visao-geral", label: "Visão Geral", icon: LineChart, rota: "/visao-geral" };

const NAV_GRUPOS = [
  {
    titulo: "Operação",
    itens: [
      { id: "insumos", label: "Insumos", icon: Carrot, rota: "/insumos" },
      { id: "receitas", label: "Receitas & Fichas", icon: ClipboardList, rota: "/receitas" },
      { id: "producoes", label: "Produções", icon: CookingPot, rota: "/producoes" },
      { id: "estoque", label: "Estoque", icon: Package, rota: "/estoque" },
      { id: "cmv", label: "Fechamento de CMV", icon: Calculator, rota: "/cmv" },
    ],
  },
  {
    titulo: "Qualidade & controle",
    itens: [
      { id: "checklists", label: "Checklists de Turno", icon: ListChecks, rota: "/checklists" },
      { id: "proteinas", label: "Manipulação de Proteínas", icon: Scale, rota: "/proteinas" },
      { id: "nutricional", label: "Ficha Nutricional", icon: Apple, rota: "/nutricional" },
      { id: "seguranca", label: "Segurança Alimentar", icon: Thermometer, rota: "/seguranca" },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { id: "relatorios", label: "Relatórios", icon: AlertTriangle, rota: "/relatorios" },
      { id: "config", label: "Configurações", icon: Settings, rota: "/configuracoes" },
    ],
  },
];

function ItemNav({ label, icon: Icon, href, active }: { label: string; icon: typeof LineChart; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
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

function iniciais(nome: string) {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  return ((palavras[0]?.[0] ?? "") + (palavras[1]?.[0] ?? "")).toUpperCase();
}

export function ShellBase({
  nomeRestaurante,
  tituloPagina,
  prefixo,
  onSair,
  children,
}: {
  nomeRestaurante: string;
  tituloPagina: string;
  prefixo: string;
  onSair: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const ativo = (rota: string) => pathname.startsWith(prefixo + rota);

  return (
    <div className="w-full min-h-screen flex" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <aside className="w-60 shrink-0 flex flex-col textura-craft sticky top-0 h-screen" style={{ backgroundColor: "var(--panel)", borderRight: "1px solid var(--border)" }}>
        <div className="relative px-5 pt-5 pb-4" style={{ borderBottom: "2px solid var(--marca)" }}>
          <div aria-hidden className="absolute -left-6 -top-6 rounded-full" style={{ width: 90, height: 90, background: "var(--brasa-glow)", filter: "blur(18px)" }} />
          <div className="relative fonte-marca texto-brasa leading-[0.88]" style={{ fontSize: 25, letterSpacing: "0.01em" }}>
            FICHA
            <br />
            TÉCNICA
          </div>
        </div>

        <nav aria-label="Principal" className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4">
          <div className="space-y-0.5">
            <ItemNav label={NAV_SOLTO.label} icon={NAV_SOLTO.icon} href={prefixo + NAV_SOLTO.rota} active={ativo(NAV_SOLTO.rota)} />
          </div>

          {NAV_GRUPOS.map((grupo) => (
            <div key={grupo.titulo}>
              <div className="px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase" style={{ color: "var(--faint)", letterSpacing: "0.08em" }}>
                {grupo.titulo}
              </div>
              <div className="space-y-0.5">
                {grupo.itens.map((n) => (
                  <ItemNav key={n.id} label={n.label} icon={n.icon} href={prefixo + n.rota} active={ativo(n.rota)} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mx-2.5 mb-3 px-2.5 pt-3 pb-1 flex items-center gap-2.5" style={{ borderTop: "1px solid var(--border)" }}>
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
          <button onClick={onSair} className="shrink-0 text-[11px] px-1.5 py-1 rounded-md" style={{ color: "var(--sub)" }}>
            Sair
          </button>
        </div>
      </aside>

      <main id="conteudo" className="flex-1 min-w-0 flex flex-col">
        <div className="h-16 shrink-0 flex items-center px-8" style={{ borderBottom: "1px solid var(--border)" }}>
          <h1 className="text-[27px] italic font-semibold" style={{ fontFamily: "var(--fonte-titulo), serif", letterSpacing: "-0.015em" }}>{tituloPagina}</h1>
        </div>
        <div className="p-8 flex-1">{children}</div>
      </main>
      <ToastContainer />
    </div>
  );
}
