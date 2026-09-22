"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChefHat, Carrot, ClipboardList, LineChart, Settings, AlertTriangle,
  CookingPot, Scale, Thermometer, Apple, Package, ListChecks, Calculator,
  Menu, X, ArrowLeft, Sun, Moon,
} from "lucide-react";
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
      { id: "visao-geral", label: "Visão Geral", icon: LineChart, href: "/preview/visao-geral" },
    ],
  },
  {
    titulo: "OPERAÇÃO",
    itens: [
      { id: "insumos", label: "Insumos", icon: Carrot, href: "/preview/insumos" },
      { id: "receitas", label: "Receitas & Fichas", icon: ClipboardList, href: "/preview/receitas" },
      { id: "producoes", label: "Produções", icon: CookingPot, href: "/preview/producoes" },
      { id: "estoque", label: "Estoque", icon: Package, href: "/preview/estoque" },
      { id: "cmv", label: "Fechamento de CMV", icon: Calculator, href: "/preview/cmv" },
    ],
  },
  {
    titulo: "QUALIDADE & CONTROLE",
    itens: [
      { id: "checklists", label: "Checklists de Turno", icon: ListChecks, href: "/preview/checklists" },
      { id: "proteinas", label: "Manipulação Proteínas", icon: Scale, href: "/preview/proteinas" },
      { id: "nutricional", label: "Ficha Nutricional", icon: Apple, href: "/preview/nutricional" },
      { id: "seguranca", label: "Segurança Alimentar", icon: Thermometer, href: "/preview/seguranca" },
    ],
  },
  {
    titulo: "GESTÃO",
    itens: [
      { id: "relatorios", label: "Relatórios", icon: AlertTriangle, href: "/preview/relatorios" },
      { id: "config", label: "Configurações", icon: Settings, href: "/preview/configuracoes" },
    ],
  },
];

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
  const [mobileAberto, setMobileAberto] = useState(false);
  const [tema, setTema] = useState<"light" | "dark">("light");

  useEffect(() => {
    const atual = document.documentElement.getAttribute("data-theme") as "light" | "dark" | null;
    if (atual === "light" || atual === "dark") {
      setTema(atual);
    }
  }, []);

  const alternarTema = (novoTema: "light" | "dark") => {
    setTema(novoTema);
    document.documentElement.setAttribute("data-theme", novoTema);
    localStorage.setItem("tema", novoTema);
  };

  const sair = () => {
    router.push("/preview");
  };

  const iniciais = (nomeRestaurante || "FT")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const sidebarContent = (
    <div className="flex flex-col h-full font-sans">
      {/* Brand Header */}
      <div className="px-5 h-16 flex items-center justify-between border-b" style={{ borderColor: "var(--linha)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm"
            style={{
              borderColor: "var(--linha-forte)",
              backgroundColor: "var(--panel-elevated)",
              color: "var(--tinta)",
            }}
          >
            <ChefHat size={19} strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-black tracking-tight text-[var(--tinta)]">Ficha Técnica</span>
              <span
                className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase"
                style={{
                  backgroundColor: "rgba(255, 59, 48, 0.15)",
                  color: "var(--sinal)",
                  border: "1px solid rgba(255, 59, 48, 0.35)",
                }}
              >
                PRO
              </span>
            </div>
            <div className="text-[11px] font-bold text-[var(--tinta-sub)] tracking-wider">
              CONTROLE DE COZINHA
            </div>
          </div>
        </div>
        <button
          onClick={() => setMobileAberto(false)}
          className="md:hidden p-2 rounded-xl text-[var(--sub)] hover:text-[var(--text)] hover:bg-[var(--panel-elevated)]"
          aria-label="Fechar menu"
        >
          <X size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Nav Items grouped */}
      <nav className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map((grupo, idx) => (
          <div key={idx} className="space-y-1.5">
            {grupo.titulo && (
              <div
                className="px-3 py-1 text-[11px] md:text-[12px] font-black tracking-wider uppercase text-[var(--tinta-sub)]"
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[14px] md:text-[15px] text-left transition-all ${
                    active
                      ? "font-extrabold shadow-sm"
                      : "font-semibold hover:bg-[var(--accent-soft)]"
                  }`}
                  style={{
                    color: active ? "var(--tinta)" : "var(--tinta-sub)",
                    backgroundColor: active ? "var(--panel-elevated)" : "transparent",
                    border: active ? "1px solid var(--linha-forte)" : "1px solid transparent",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      size={18}
                      strokeWidth={active ? 2.25 : 1.75}
                      style={{ color: active ? "var(--sinal)" : "var(--tinta-sub)" }}
                    />
                    <span>{n.label}</span>
                  </div>
                  {active && (
                    <span className="w-2 h-2 rounded-full bg-[var(--sinal)] shadow-sm" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Restaurant Profile & Back to Preview Index */}
      <div
        className="m-3 p-3.5 rounded-2xl border flex items-center justify-between gap-2.5 shadow-sm"
        style={{
          borderColor: "var(--linha)",
          backgroundColor: "var(--panel-elevated)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-black shrink-0 border"
            style={{
              borderColor: "var(--linha-forte)",
              backgroundColor: "var(--panel)",
              color: "var(--tinta)",
            }}
          >
            {iniciais}
          </div>
          <div className="min-w-0 flex-1">
            {/* POLIMENTO shell: nome em até 2 linhas (antes cortava "Cantina Bella ...") e
                selo "Modo demonstração" numa linha. Antes: "SISTEMA OPERACIONAL ATIVO", que
                quebrava em 3 linhas e afirmava um status que a demo não tem. */}
            <div className="text-[13px] md:text-[14px] font-black text-[var(--tinta)] leading-tight line-clamp-2">
              {nomeRestaurante}
            </div>
            <div className="text-[11px] font-extrabold text-[var(--tinta-sub)] flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--aviso)] shrink-0" />
              Modo demonstração
            </div>
          </div>
        </div>
        <button
          onClick={sair}
          title="Voltar ao índice da Preview"
          aria-label="Voltar ao índice da Preview"
          className="p-2 rounded-xl hover:text-[var(--text)] hover:bg-[var(--panel)] transition-colors shrink-0 text-[var(--tinta-sub)] border border-[var(--linha)]"
        >
          <ArrowLeft size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-screen flex" style={{ background: "var(--fundo)", color: "var(--tinta)" }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex w-64 shrink-0 flex-col sticky top-0 h-screen border-r"
        style={{ backgroundColor: "var(--panel)", borderColor: "var(--linha)" }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileAberto && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setMobileAberto(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 z-50 md:hidden flex flex-col transition-transform duration-200 ease-out border-r ${
          mobileAberto ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          backgroundColor: "var(--panel)",
          borderColor: "var(--linha)",
        }}
      >
        {sidebarContent}
      </aside>

      {/* Main Content Area */}
      <main id="conteudo" className="flex-1 flex flex-col min-w-0 overflow-auto">
        <header
          className="h-16 shrink-0 flex items-center justify-between px-5 md:px-8 sticky top-0 z-20 backdrop-blur-xl border-b shadow-sm"
          style={{
            backgroundColor: "var(--panel)",
            borderColor: "var(--linha)",
          }}
        >
          {/* POLIMENTO shell (2026-09-22): no celular o título quebrava em duas linhas
              ("Visão / Geral") e o seletor de tema passava da tela ("ESCURO" cortado).
              Agora: título numa linha só (trunca se precisar), botões de tema só com
              ícone abaixo de 640px. Antes: gap-3.5 e rótulos CLARO/ESCURO sempre visíveis.
              Reverter: git revert do commit "polimento(shell)" (ver docs/POLIMENTO.md). */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileAberto(true)}
              className="md:hidden p-2 rounded-xl text-[var(--tinta-sub)] hover:bg-[var(--panel-elevated)] border border-[var(--linha)]"
              aria-label="Abrir menu lateral"
            >
              <Menu size={20} strokeWidth={2} />
            </button>
            <h1 className="text-[18px] md:text-[20px] font-black tracking-tight text-[var(--tinta)] truncate">
              {tituloPagina}
            </h1>
          </div>

          {/* POLIMENTO shell: botões de tema e do agente com 44px de altura (antes ~30px),
              alvo de toque do tablet (--alvo-toque, DESIGN.md). */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Botão de Atalho do Agente IA no Cabeçalho */}
            <BotaoAgenteIa variante="cabecalho" />

            {/* Calibração de Modo Claro / Escuro (Segmented Control Grande) */}
            <div
              className="flex items-center p-1 rounded-full border gap-1.5 shadow-sm"
              style={{
                backgroundColor: "var(--panel-elevated)",
                borderColor: "var(--linha-forte)",
              }}
            >
              <button
                onClick={() => alternarTema("light")}
                className={`px-3 sm:px-3.5 min-h-[var(--alvo-toque)] rounded-full text-[12px] md:text-[13px] font-extrabold flex items-center gap-2 transition-all ${
                  tema === "light"
                    ? "bg-[var(--tinta)] text-[var(--panel)] shadow-sm"
                    : "text-[var(--tinta-sub)] hover:text-[var(--tinta)]"
                }`}
                title="Modo Claro"
                aria-label="Modo claro"
                aria-pressed={tema === "light"}
              >
                <Sun size={14} strokeWidth={2} />
                <span className="hidden sm:inline">CLARO</span>
              </button>
              <button
                onClick={() => alternarTema("dark")}
                className={`px-3 sm:px-3.5 min-h-[var(--alvo-toque)] rounded-full text-[12px] md:text-[13px] font-extrabold flex items-center gap-2 transition-all ${
                  tema === "dark"
                    ? "bg-[var(--tinta)] text-[var(--fundo)] shadow-sm"
                    : "text-[var(--tinta-sub)] hover:text-[var(--tinta)]"
                }`}
                title="Modo Escuro"
                aria-label="Modo escuro"
                aria-pressed={tema === "dark"}
              >
                <Moon size={14} strokeWidth={2} />
                <span className="hidden sm:inline">ESCURO</span>
              </button>
            </div>
          </div>
        </header>
        <div className="p-5 md:p-8 flex-1 animate-fade-in">{children}</div>
      </main>
      {/* POLIMENTO shell: saiu o botão flutuante do Agente IA (<BotaoAgenteIa variante="flutuante" />).
          Ele repetia o botão "Agente IA · demo" da barra superior, cobria cards e colunas
          (Perdas no quadro de Produções) e, como as duas variantes escutam o evento
          "abrir-agente-ia", abrir o agente por um botão de tela abria DOIS modais.
          Pra voltar, recoloque a linha acima antes do <ToastContainer />. */}
      <ToastContainer />
    </div>
  );
}
