import Link from "next/link";
import {
  Carrot, ClipboardList, LineChart, AlertTriangle,
  CookingPot, Scale, Thermometer, Apple, Package, ListChecks, Calculator, ChefHat,
} from "lucide-react";
import { C } from "@/components/ficha/tema";
import { NOME_RESTAURANTE } from "./fixtures";

const LINKS = [
  { href: "/preview-tmp/insumos", label: "Insumos", icon: Carrot, descricao: "Cadastro de insumos e preparos-base" },
  { href: "/preview-tmp/cmv", label: "Fechamento de CMV", icon: Calculator, descricao: "Custo, margem e fechamentos de período" },
  { href: "/preview-tmp/producoes", label: "Produções", icon: CookingPot, descricao: "Lotes produzidos por turno" },
  { href: "/preview-tmp/checklists", label: "Checklists de Turno", icon: ListChecks, descricao: "Abertura, praça, processo e fechamento" },
  { href: "/preview-tmp/estoque", label: "Estoque", icon: Package, descricao: "Saldos, movimentações e fornecedores" },
  { href: "/preview-tmp/proteinas", label: "Manipulação de Proteínas", icon: Scale, descricao: "Processamentos e fator de correção" },
  { href: "/preview-tmp/nutricional", label: "Ficha Nutricional", icon: Apple, descricao: "Tabela nutricional e rotulagem" },
  { href: "/preview-tmp/seguranca", label: "Segurança Alimentar", icon: Thermometer, descricao: "Temperaturas por local de armazenamento" },
  { href: "/preview-tmp/receitas", label: "Receitas & Fichas", icon: ClipboardList, descricao: "Fichas técnicas e precificação" },
  { href: "/preview-tmp/relatorios", label: "Relatórios", icon: AlertTriangle, descricao: "Indicadores e alertas consolidados" },
];

export default function PreviewIndexPage() {
  return (
    <div className="w-full min-h-screen" style={{ background: C.bg, color: C.text }}>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 mb-6">
          <ChefHat size={20} />
          <span className="text-[15px] font-semibold" style={{ letterSpacing: "-0.01em" }}>Ficha Técnica</span>
        </div>

        <div
          className="rounded-lg px-5 py-4 mb-8 text-[13px] leading-relaxed"
          style={{ background: C.panel, border: `1px solid ${C.border}`, color: C.sub }}
        >
          <div className="font-semibold mb-1" style={{ color: C.text }}>
            <LineChart size={14} className="inline mr-1.5 -mt-0.5" />
            Demo interativa — dados fictícios
          </div>
          Esta é uma demonstração navegável do produto, usando os mesmos componentes de tela da versão
          real, mas com dados de um restaurante fictício (&ldquo;{NOME_RESTAURANTE}&rdquo;) mantidos em
          memória — nenhuma informação é salva em banco de dados. Filtros, abas, expansão de linhas e
          gráficos funcionam normalmente; ações de salvar/excluir que dependem de login e banco de dados
          não se aplicam aqui.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LINKS.map(({ href, label, icon: Icon, descricao }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg px-4 py-3.5 flex flex-col gap-1.5 transition-colors"
              style={{ background: C.panel, border: `1px solid ${C.border}` }}
            >
              <div className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: C.text }}>
                <Icon size={15} />
                {label}
              </div>
              <div className="text-[12px]" style={{ color: C.faint }}>{descricao}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
