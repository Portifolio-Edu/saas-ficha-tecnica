"use client";

// SISTEMA premium (2026-09-22) -- casca única da plataforma, usada pelo AppShell
// (app logado) e pelo DemoShell (/preview). Antes cada um desenhava o próprio menu
// e cabeçalho e os dois divergiam. Régua: Stripe/Linear (PRODUCT.md, DESIGN.md).
//
// O que mudou em relação às cascas anteriores (commit 950f86d):
//  - Menu no padrão Linear: fundo papel, grupos em caixa normal ("Operação"),
//    item ativo com fundo sutil e ícone no acento --marca. Saiu o ponto vermelho
//    do item ativo e o selo "PRO" vermelho (vermelho é só risco/perda).
//  - Barra superior de 56px com título de 15px; tema claro/escuro num botão de
//    ícone só (antes um seletor CLARO/ESCURO grande). O app logado ganhou o botão
//    de tema, que antes só existia na demo.
//  - Alvos de toque: itens do menu e botões da barra com 40–44px.
//  - O `tituloPagina` de cada page.tsx (app e /preview) usa o mesmo texto do item
//    do menu, em caixa de frase. Antes: "Visão Geral", "Receitas & Fichas",
//    "Checklists de Turno" etc. (commit "polimento(sistema): títulos iguais ao menu").
// Reverter só a casca: git revert do commit "polimento(shell-premium)"; os
// arquivos AppShell.tsx e DemoShell.tsx voltam a ter o layout próprio.

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChefHat, Carrot, ClipboardList, LineChart, Settings, AlertTriangle,
  CookingPot, Scale, Thermometer, Apple, Package, ListChecks, Calculator,
  Menu, X, Sun, Moon,
} from "lucide-react";
import { ToastContainer } from "./Toast";

interface NavItem {
  id: string;
  label: string;
  icon: typeof LineChart;
  rota: string;
}

// Mesmas rotas e grupos do hub que o usuário montou; só o rótulo dos grupos saiu
// da caixa alta. O prefixo ("/preview" na demo) vem por prop.
const GRUPOS: { titulo?: string; itens: NavItem[] }[] = [
  { itens: [{ id: "visao-geral", label: "Visão geral", icon: LineChart, rota: "/visao-geral" }] },
  {
    titulo: "Operação",
    itens: [
      { id: "insumos", label: "Insumos", icon: Carrot, rota: "/insumos" },
      { id: "receitas", label: "Receitas e fichas", icon: ClipboardList, rota: "/receitas" },
      { id: "producoes", label: "Produções", icon: CookingPot, rota: "/producoes" },
      { id: "estoque", label: "Estoque", icon: Package, rota: "/estoque" },
      { id: "cmv", label: "Fechamento de CMV", icon: Calculator, rota: "/cmv" },
    ],
  },
  {
    titulo: "Qualidade e controle",
    itens: [
      { id: "checklists", label: "Checklists de turno", icon: ListChecks, rota: "/checklists" },
      { id: "proteinas", label: "Manipulação de proteínas", icon: Scale, rota: "/proteinas" },
      { id: "nutricional", label: "Ficha nutricional", icon: Apple, rota: "/nutricional" },
      { id: "seguranca", label: "Segurança alimentar", icon: Thermometer, rota: "/seguranca" },
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

export function ShellPremium({
  prefixoRotas = "",
  nomeRestaurante,
  subtituloRestaurante,
  tituloPagina,
  acaoRodape,
  extrasCabecalho,
  children,
}: {
  prefixoRotas?: string;
  nomeRestaurante: string;
  /** Linha abaixo do nome do restaurante no rodapé do menu (ex.: "Modo demonstração"). */
  subtituloRestaurante?: ReactNode;
  tituloPagina: string;
  /** Botão de ícone no rodapé do menu (sair da conta / voltar ao índice da demo). */
  acaoRodape: { rotulo: string; icone: ReactNode; onClick: () => void };
  /** Itens extras à direita da barra superior (ex.: botão do agente IA na demo). */
  extrasCabecalho?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const [mobileAberto, setMobileAberto] = useState(false);
  const [tema, setTema] = useState<"light" | "dark">("light");

  useEffect(() => {
    const atual = document.documentElement.getAttribute("data-theme");
    if (atual === "light" || atual === "dark") setTema(atual);
  }, []);

  const alternarTema = () => {
    const novo = tema === "dark" ? "light" : "dark";
    setTema(novo);
    document.documentElement.setAttribute("data-theme", novo);
    try {
      localStorage.setItem("tema", novo);
    } catch {}
  };

  const iniciais = (nomeRestaurante || "FT")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const menu = (
    <div className="flex flex-col h-full">
      {/* Marca */}
      <div className="px-4 h-14 flex items-center justify-between border-b" style={{ borderColor: "var(--linha)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
            <ChefHat size={16} strokeWidth={2} />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--tinta)]">Ficha Técnica</span>
        </div>
        <button
          onClick={() => setMobileAberto(false)}
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-[var(--tinta-sub)] hover:bg-[var(--panel-elevated)]"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto" aria-label="Seções">
        {GRUPOS.map((grupo, i) => (
          <div key={i}>
            {grupo.titulo && <div className="px-2.5 pb-1.5 text-[12px] font-medium text-[var(--tinta-faint)]">{grupo.titulo}</div>}
            <div className="space-y-0.5">
              {grupo.itens.map((n) => {
                const href = `${prefixoRotas}${n.rota}`;
                const ativo = pathname.startsWith(href);
                const Icone = n.icon;
                return (
                  <Link
                    key={n.id}
                    href={href}
                    onClick={() => setMobileAberto(false)}
                    aria-current={ativo ? "page" : undefined}
                    className={`flex items-center gap-2.5 px-2.5 min-h-10 rounded-lg text-[14px] transition-colors ${
                      ativo ? "font-medium" : "hover:bg-[var(--panel-hover)]"
                    }`}
                    style={{
                      color: ativo ? "var(--tinta)" : "var(--tinta-sub)",
                      backgroundColor: ativo ? "var(--panel-elevated)" : undefined,
                    }}
                  >
                    <Icone size={17} strokeWidth={1.8} style={{ color: ativo ? "var(--marca)" : "var(--tinta-faint)" }} />
                    {n.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Restaurante */}
      <div className="p-3 border-t flex items-center gap-2.5" style={{ borderColor: "var(--linha)" }}>
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center text-[12px] font-semibold shrink-0 border"
          style={{ borderColor: "var(--linha-forte)", background: "var(--panel-elevated)", color: "var(--tinta)" }}
        >
          {iniciais}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-[var(--tinta)] leading-tight line-clamp-2">{nomeRestaurante}</div>
          {subtituloRestaurante && <div className="text-[12px] text-[var(--tinta-faint)] mt-0.5 whitespace-nowrap">{subtituloRestaurante}</div>}
        </div>
        <button
          onClick={acaoRodape.onClick}
          title={acaoRodape.rotulo}
          aria-label={acaoRodape.rotulo}
          className="w-10 h-10 flex items-center justify-center rounded-lg shrink-0 text-[var(--tinta-sub)] hover:text-[var(--tinta)] hover:bg-[var(--panel-hover)]"
        >
          {acaoRodape.icone}
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-screen flex" style={{ background: "var(--fundo)", color: "var(--tinta)" }}>
      <aside className="hidden md:flex w-60 shrink-0 flex-col sticky top-0 h-screen border-r" style={{ backgroundColor: "var(--panel)", borderColor: "var(--linha)" }}>
        {menu}
      </aside>

      {mobileAberto && <div className="fixed inset-0 z-40 md:hidden" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setMobileAberto(false)} />}
      <aside
        className={`fixed inset-y-0 left-0 w-72 z-50 md:hidden flex flex-col transition-transform duration-200 ease-out border-r ${
          mobileAberto ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: "var(--panel)", borderColor: "var(--linha)" }}
        aria-hidden={!mobileAberto}
      >
        {menu}
      </aside>

      <main id="conteudo" className="flex-1 flex flex-col min-w-0">
        <header
          className="h-14 shrink-0 flex items-center justify-between gap-3 px-4 md:px-8 sticky top-0 z-20 border-b"
          style={{ backgroundColor: "color-mix(in srgb, var(--fundo) 88%, transparent)", borderColor: "var(--linha)", backdropFilter: "blur(8px)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMobileAberto(true)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-[var(--tinta-sub)] hover:bg-[var(--panel-hover)]"
              aria-label="Abrir menu"
            >
              <Menu size={19} />
            </button>
            <h1 className="text-[15px] font-semibold tracking-tight text-[var(--tinta)] truncate">{tituloPagina}</h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {extrasCabecalho}
            <button
              onClick={alternarTema}
              className="w-10 h-10 flex items-center justify-center rounded-lg border text-[var(--tinta-sub)] hover:text-[var(--tinta)] hover:bg-[var(--panel-hover)]"
              style={{ borderColor: "var(--linha)", background: "var(--panel)" }}
              aria-label={tema === "dark" ? "Usar tema claro" : "Usar tema escuro"}
              title={tema === "dark" ? "Tema claro" : "Tema escuro"}
            >
              {tema === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>
        <div className="p-4 md:p-8 flex-1 animate-fade-in">{children}</div>
      </main>
      <ToastContainer />
    </div>
  );
}
