"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Direcao1Precisao } from "./Direcao1Precisao";
import { Direcao2Atelier } from "./Direcao2Atelier";
import { Direcao3Tatico } from "./Direcao3Tatico";
import type { VisaoGeralData } from "./types";
import { Compass, Sun, Moon, Info } from "lucide-react";

export function StudioShowcase({ data }: { data: VisaoGeralData }) {
  return (
    <Suspense fallback={<div className="p-8 text-center font-mono text-[12px] opacity-60">CARREGANDO ESTÚDIO DE DESIGN // 3 DIREÇÕES...</div>}>
      <StudioShowcaseInner data={data} />
    </Suspense>
  );
}

function StudioShowcaseInner({ data }: { data: VisaoGeralData }) {
  const searchParams = useSearchParams();

  const direcaoParam = searchParams.get("direcao");
  const [direcao, setDirecao] = useState<"1" | "2" | "3">(
    direcaoParam === "2" ? "2" : direcaoParam === "3" ? "3" : "1"
  );
  const [tema, setTema] = useState<"light" | "dark">("dark");
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);

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

  const selecionarDirecao = (d: "1" | "2" | "3") => {
    setDirecao(d);
    const url = new URL(window.location.href);
    url.searchParams.set("direcao", d);
    window.history.replaceState({}, "", url.toString());
  };

  const infoDirecoes = {
    "1": {
      nome: "Direção 1: Precisão Cirúrgica (Caliper & Cold Steel)",
      metafora: "Bancada técnica de laboratório culinário, balança analítica Mettler-Toledo e paquímetro digital.",
      paleta: [
        { nome: "Grafite Chassi", hex: tema === "dark" ? "#0A0C0E" : "#F4F5F7" },
        { nome: "Aço Bisotado", hex: tema === "dark" ? "#12151A" : "#FFFFFF" },
        { nome: "Régua Hairline", hex: tema === "dark" ? "#222832" : "#DDE2E8" },
        { nome: "Cobre de Indução", hex: tema === "dark" ? "#FF8843" : "#D95B14" },
        { nome: "Verde Calibrado", hex: tema === "dark" ? "#00D06C" : "#0A8544" },
        { nome: "Sangria / Desvio", hex: tema === "dark" ? "#FF3B30" : "#CF222E" },
      ],
      tipografia: "Monospace técnica tabular pura (Geist Mono / JetBrains) combinada com sans rígida. Números não são texto corrido: são leituras de display digital com alinhamento decimal estrito e marcadores de coordenada técnica [M-01], [M-02].",
      movimento: "Thermal Snap: micro-recuo mecânico imediato (70ms) com feixe óptico de borda ao focar. Sem animações lentas ou decorativas; o cursor responde com a precisão de um visor de pesagem.",
      densidade: "Grade de bancada justaposta: blocos em encaixe contínuo sem 'cards fofos com sombras arredondadas'. Respiro por hairlines milimétricas de 1px e hierarquia dimensional rígida.",
    },
    "2": {
      nome: "Direção 2: Atelier Gastronômico (Caderno de Mise en Place)",
      metafora: "Ficha clássica encadernada, linho, caderno de couro de chef estrelado e clareza aristocrática de receita.",
      paleta: [
        { nome: "Parchment / Osso Cru", hex: tema === "dark" ? "#121110" : "#F7F5EE" },
        { nome: "Carvão Tinta", hex: tema === "dark" ? "#F2EDE4" : "#1C1815" },
        { nome: "Linho Natural", hex: tema === "dark" ? "#2A2622" : "#E8E2D5" },
        { nome: "Oliva Prensada", hex: tema === "dark" ? "#8CAE88" : "#364B34" },
        { nome: "Terracota de Forno", hex: tema === "dark" ? "#E07A5F" : "#9B381E" },
        { nome: "Latão Antigo", hex: tema === "dark" ? "#D4AF37" : "#A67C1E" },
      ],
      tipografia: "Tipografia editorial de livro de ouro. Títulos serenos com nobreza e ritmo de leitura clássico. Numerais proporcionais com entrelinhas generosas que valorizam o restaurante como patrimônio gastronômico.",
      movimento: "Press & Depth: sensação tátil de prensa artesanal ou carimbo sobre papel espesso. Ao clicar, leve recuo tátil (1px) com dissipação orgânica (200ms cubic-bezier).",
      densidade: "Composição por ritmo editorial: espaços negativos calculados e linhas pontilhadas clássicas conectando pratos a valores como em cardápios de alta gastronomia.",
    },
    "3": {
      nome: "Direção 3: Comando Tático (KDS High-Contrast HUD)",
      metafora: "Cockpit de comando de expedição, visor de comanda sob alta velocidade de serviço e visibilidade periférica instantânea.",
      paleta: [
        { nome: "Breu Blindado", hex: tema === "dark" ? "#06080B" : "#EDF1F5" },
        { nome: "Painel Rack", hex: tema === "dark" ? "#0E131A" : "#FFFFFF" },
        { nome: "Cian Laser", hex: tema === "dark" ? "#00E5FF" : "#0284C7" },
        { nome: "Âmbar Piloto", hex: tema === "dark" ? "#FFB300" : "#D97706" },
        { nome: "Verde Sinalizador", hex: tema === "dark" ? "#00E676" : "#059669" },
        { nome: "Vermelho Corte", hex: tema === "dark" ? "#FF1744" : "#DC2626" },
      ],
      tipografia: "Sans geométrica condensada imponente. Numerais gigantescos de até 40px em peso black visíveis a metros de distância sob qualquer ângulo na correria da cozinha.",
      movimento: "Pulse & Calibration: resposta de chave industrial seca (40ms). Indicadores analógicos e barras de calibração que reagem com varredura tática.",
      densidade: "Estrutura em racks operacionais: mini-barrômetros de tolerância embutidos diretamente nos cards substituem parágrafos descritivos. Máxima relação sinal/ruído.",
    },
  };

  const ativa = infoDirecoes[direcao];

  return (
    <div className="space-y-6">
      {/* Barra de Direção de Design do Estúdio */}
      <div
        className="p-4 rounded-xl border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
        style={{
          backgroundColor: tema === "dark" ? "#14171C" : "#FFFFFF",
          borderColor: tema === "dark" ? "#2B323D" : "#E2E8F0",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-md"
            style={{
              background: "linear-gradient(135deg, #FF7A29 0%, #D95B14 100%)",
            }}
          >
            <Compass size={20} />
          </div>
          <div>
            <div className="text-[14px] font-bold tracking-tight">Estúdio de Design // 3 Direções Visuais</div>
            <div className="text-[11.5px] text-[var(--sub)]">
              Propostas genuínas para o SaaS de Ficha Técnica & Controle de Cozinha
            </div>
          </div>
        </div>

        {/* Seletor de Direção e Toggle de Tema */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="p-1 rounded-lg border flex items-center gap-1"
            style={{
              backgroundColor: tema === "dark" ? "#0B0D10" : "#F1F5F9",
              borderColor: tema === "dark" ? "#22272F" : "#CBD5E1",
            }}
          >
            <button
              onClick={() => selecionarDirecao("1")}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded-md transition-all ${
                direcao === "1"
                  ? "bg-[#D95B14] text-white shadow-sm"
                  : "text-[var(--sub)] hover:text-[var(--text)]"
              }`}
            >
              1. Precisão Cirúrgica
            </button>
            <button
              onClick={() => selecionarDirecao("2")}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded-md transition-all ${
                direcao === "2"
                  ? "bg-[#364B34] text-white shadow-sm"
                  : "text-[var(--sub)] hover:text-[var(--text)]"
              }`}
            >
              2. Atelier Gastronômico
            </button>
            <button
              onClick={() => selecionarDirecao("3")}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded-md transition-all ${
                direcao === "3"
                  ? "bg-[#0284C7] text-white shadow-sm"
                  : "text-[var(--sub)] hover:text-[var(--text)]"
              }`}
            >
              3. Comando Tático
            </button>
          </div>

          {/* Toggle Claro / Escuro */}
          <div
            className="p-1 rounded-lg border flex items-center gap-1"
            style={{
              backgroundColor: tema === "dark" ? "#0B0D10" : "#F1F5F9",
              borderColor: tema === "dark" ? "#22272F" : "#CBD5E1",
            }}
          >
            <button
              onClick={() => alternarTema("light")}
              className={`p-1.5 rounded-md text-[12px] flex items-center gap-1 ${
                tema === "light"
                  ? "bg-white text-black shadow-sm font-bold"
                  : "text-[var(--sub)] hover:text-[var(--text)]"
              }`}
              title="Tema Claro"
            >
              <Sun size={15} />
              <span className="hidden sm:inline">Claro</span>
            </button>
            <button
              onClick={() => alternarTema("dark")}
              className={`p-1.5 rounded-md text-[12px] flex items-center gap-1 ${
                tema === "dark"
                  ? "bg-[#20252D] text-white shadow-sm font-bold"
                  : "text-[var(--sub)] hover:text-[var(--text)]"
              }`}
              title="Tema Escuro"
            >
              <Moon size={15} />
              <span className="hidden sm:inline">Escuro</span>
            </button>
          </div>

          <button
            onClick={() => setDetalhesAbertos(!detalhesAbertos)}
            className="p-2 rounded-lg border text-[var(--sub)] hover:text-[var(--text)] transition-colors"
            style={{
              backgroundColor: tema === "dark" ? "#0B0D10" : "#F1F5F9",
              borderColor: tema === "dark" ? "#22272F" : "#CBD5E1",
            }}
            title="Ver Racional de Design desta Direção"
          >
            <Info size={16} />
          </button>
        </div>
      </div>

      {/* Gaveta de Racional de Design Expandida */}
      {detalhesAbertos && (
        <div
          className="p-6 rounded-xl border animate-slide-up space-y-4 shadow-xl"
          style={{
            backgroundColor: tema === "dark" ? "#14171C" : "#FFFFFF",
            borderColor: tema === "dark" ? "#2B323D" : "#E2E8F0",
          }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: tema === "dark" ? "#252B35" : "#E2E8F0" }}>
            <h4 className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
              <span>{ativa.nome}</span>
            </h4>
            <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-black/10 text-[var(--sub)]">
              FICHA TÉCNICA DE IDENTIDADE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12.5px] leading-relaxed">
            <div>
              <div className="font-bold text-[var(--text)] mb-1">Metáfora Central:</div>
              <div className="text-[var(--sub)] mb-3">{ativa.metafora}</div>

              <div className="font-bold text-[var(--text)] mb-1">Princípio de Movimento:</div>
              <div className="text-[var(--sub)] mb-3">{ativa.movimento}</div>

              <div className="font-bold text-[var(--text)] mb-1">Disciplina de Densidade:</div>
              <div className="text-[var(--sub)]">{ativa.densidade}</div>
            </div>

            <div>
              <div className="font-bold text-[var(--text)] mb-1">Papel da Tipografia:</div>
              <div className="text-[var(--sub)] mb-3">{ativa.tipografia}</div>

              <div className="font-bold text-[var(--text)] mb-1.5">Paleta de Cores ({tema === "dark" ? "Modo Escuro" : "Modo Claro"}):</div>
              <div className="grid grid-cols-3 gap-2">
                {ativa.paleta.map((c, i) => (
                  <div
                    key={i}
                    className="p-2 rounded border flex flex-col justify-between"
                    style={{
                      backgroundColor: tema === "dark" ? "#0B0D10" : "#F8FAFC",
                      borderColor: tema === "dark" ? "#22272F" : "#E2E8F0",
                    }}
                  >
                    <div className="w-full h-6 rounded mb-1.5" style={{ backgroundColor: c.hex }} />
                    <div className="text-[10.5px] font-bold truncate text-[var(--text)]">{c.nome}</div>
                    <div className="text-[9.5px] font-mono text-[var(--faint)]">{c.hex}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Renderização da Direção Ativa */}
      {direcao === "1" && <Direcao1Precisao data={data} tema={tema} />}
      {direcao === "2" && <Direcao2Atelier data={data} tema={tema} />}
      {direcao === "3" && <Direcao3Tatico data={data} tema={tema} />}
    </div>
  );
}
