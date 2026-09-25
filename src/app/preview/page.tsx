import Link from "next/link";
import {
  Carrot, ClipboardList, LineChart, AlertTriangle,
  CookingPot, Scale, Thermometer, Apple, Package, ListChecks, Calculator, ChefHat, Settings, Plug, Users, MonitorSmartphone, CalendarDays,
} from "lucide-react";
import { NOME_RESTAURANTE } from "./fixtures";
import { RecomecarDemo } from "./RecomecarDemo";

const LINKS = [
  { href: "/preview/visao-geral", label: "Visão Geral", icon: LineChart, descricao: "KPIs, engenharia de cardápio e perdas do mês" },
  { href: "/preview/insumos", label: "Insumos", icon: Carrot, descricao: "Cadastro de insumos e preparos-base" },
  { href: "/preview/cmv", label: "Fechamento de CMV", icon: Calculator, descricao: "Custo, margem e fechamentos de período" },
  { href: "/preview/producoes", label: "Produções", icon: CookingPot, descricao: "Lotes produzidos por turno" },
  { href: "/preview/checklists", label: "Checklists de Turno", icon: ListChecks, descricao: "Abertura, praça, processo e fechamento" },
  { href: "/preview/estoque", label: "Estoque", icon: Package, descricao: "Saldos, movimentações e fornecedores" },
  { href: "/preview/proteinas", label: "Manipulação de Proteínas", icon: Scale, descricao: "Processamentos e fator de correção" },
  { href: "/preview/nutricional", label: "Ficha Nutricional", icon: Apple, descricao: "Tabela nutricional e rotulagem" },
  { href: "/preview/seguranca", label: "Segurança Alimentar", icon: Thermometer, descricao: "Temperaturas por local de armazenamento" },
  { href: "/preview/receitas", label: "Receitas & Fichas", icon: ClipboardList, descricao: "Fichas técnicas e precificação" },
  { href: "/preview/relatorios", label: "Relatórios", icon: AlertTriangle, descricao: "Indicadores e alertas consolidados" },
  { href: "/preview/integracoes", label: "Integrações", icon: Plug, descricao: "PDVs, iFood e importação por XML fiscal ou planilha" },
  // EQUIPE (2026-09-25)
  { href: "/preview/escalas", label: "Escalas", icon: CalendarDays, descricao: "Escala do mês, folgas, prontuário e alertas de cobertura" },
  { href: "/preview/equipe", label: "Equipe e acessos", icon: Users, descricao: "Dono, gestor, estoquista e cozinha: quem vê o quê" },
  { href: "/preview/cozinha", label: "Modo cozinha", icon: MonitorSmartphone, descricao: "Tablet da cozinha sem senha e sem nenhum valor em R$" },
  { href: "/preview/configuracoes", label: "Configurações", icon: Settings, descricao: "Tema claro, escuro ou sistema" },
];

export default function PreviewIndexPage() {
  return (
    <div className="w-full min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 mb-6">
          <ChefHat size={20} />
          <h1 className="text-[15px] font-semibold" style={{ letterSpacing: "-0.01em" }}>Ficha Técnica</h1>
        </div>

        <div
          className="rounded-lg px-5 py-4 mb-8 text-[13px] leading-relaxed"
          style={{ background: "var(--panel)", border: `1px solid ${"var(--border)"}`, color: "var(--sub)" }}
        >
          <div className="font-semibold mb-1" style={{ color: "var(--text)" }}>
            <LineChart size={14} className="inline mr-1.5 -mt-0.5" />
            Demo interativa — dados fictícios
          </div>
          Esta é uma demonstração navegável do produto, usando os mesmos componentes de tela da versão
          real, mas com dados de um restaurante fictício (&ldquo;{NOME_RESTAURANTE}&rdquo;). Nada vai pra
          banco de dados: o que você registra fica só neste navegador. O que a cozinha registra (produção,
          perda, checklist, temperatura, contagem) aparece no painel do gestor, como no sistema de verdade.
          {/* DEMO (2026-09-25): texto antigo dizia que nada era salvo; agora a demo guarda no navegador. */}
          <div>
            <RecomecarDemo />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LINKS.map(({ href, label, icon: Icon, descricao }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg px-4 py-3.5 flex flex-col gap-1.5 transition-colors"
              style={{ background: "var(--panel)", border: `1px solid ${"var(--border)"}` }}
            >
              <div className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: "var(--text)" }}>
                <Icon size={15} />
                {label}
              </div>
              <div className="text-[12px]" style={{ color: "var(--faint)" }}>{descricao}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
