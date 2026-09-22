"use client";

import { useState } from "react";
import { Fraunces, Public_Sans } from "next/font/google";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatBRL } from "@/components/charts/format";
import { resumoVisaoGeral } from "../_shared/resumoVisaoGeral";
import { NOME_RESTAURANTE, insumos, todasReceitas, processamentos, producoes, fechamentos, margemAlvoCliente } from "../fixtures";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"], style: ["normal", "italic"] });
const hanken = Public_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

const resumo = resumoVisaoGeral({ margemAlvoCliente, insumos, receitas: todasReceitas, processamentos, producoes, fechamentos });

const nums = { fontVariantNumeric: "tabular-nums" } as const;

function IconHome({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" />
    </svg>
  );
}
function IconChart({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V9" /><path d="M11 19V5" /><path d="M18 19v-7" />
    </svg>
  );
}
function IconBox({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" />
    </svg>
  );
}
function IconPan({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="10" cy="12" rx="7" ry="4.5" /><path d="M17 10.5h5.5" /><path d="M6.5 12v3" /><path d="M13.5 12v3" />
    </svg>
  );
}
function IconGear({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

const NAV = [
  { icon: IconPan, label: "Visão Geral", ativo: true },
  { icon: IconChart, label: "CMV" },
  { icon: IconBox, label: "Estoque" },
  { icon: IconHome, label: "Produções" },
  { icon: IconGear, label: "Configurações" },
];

const STATUS_INFO: Record<string, { rotulo: string; cor: string }> = {
  em_producao: { rotulo: "Em produção", cor: "var(--g-azul)" },
  produzido: { rotulo: "Produzido", cor: "var(--g-verde)" },
  perda: { rotulo: "Perda", cor: "var(--g-vermelho)" },
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export default function DirecaoGlass() {
  const [tema, setTema] = useState<"light" | "dark">("light");

  const chartData = resumo.comPreco.map((p) => ({ nome: p.receita.nomePrato, margem: p.margemPct ?? 0 }));
  const margemDeg = resumo.margemMedia !== null ? clamp(resumo.margemMedia, 0, 100) * 3.6 : 0;
  const abaixoAlerta = resumo.abaixoDoAlvo > 0;
  const perdaAlerta = resumo.perdaTotalReais > 0;

  return (
    <div data-glass data-theme={tema} className={`g-fundo ${hanken.className}`}>
      <style>{`
        [data-glass][data-theme="light"] {
          --g-texto: #241C15; --g-sub: #7C7061; --g-faint: #A79C8C;
          --g-cobre: #B85E2E; --g-cobre-claro: #E0894F;
          --g-verde: #3C7A54; --g-azul: #3C6E9E; --g-vermelho: #B23F32;
          --g-vidro: rgba(255,250,244,0.58); --g-vidro-borda: rgba(255,255,255,0.6);
          --g-painel: #FBF6EF; --g-painel-borda: #EBE0D2;
          --g-sombra: 0 1px 1px rgba(60,40,20,.04), 0 24px 48px -18px rgba(60,40,20,.28);
          --g-fundo-1: #F6E4CE; --g-fundo-2: #F2D9D2; --g-fundo-3: #E9E4D0;
          --g-side: rgba(36,24,16,0.94); --g-side-texto: #F3E9DD; --g-side-sub: #B3A08C;
        }
        [data-glass][data-theme="dark"] {
          --g-texto: #F3EAE0; --g-sub: #B7AA98; --g-faint: #837565;
          --g-cobre: #E0894F; --g-cobre-claro: #F2AD79;
          --g-verde: #5FAE7C; --g-azul: #6FA0D8; --g-vermelho: #E0685A;
          --g-vidro: rgba(38,28,22,0.55); --g-vidro-borda: rgba(255,255,255,0.09);
          --g-painel: #241A13; --g-painel-borda: #382A1E;
          --g-sombra: 0 1px 1px rgba(0,0,0,.3), 0 28px 52px -18px rgba(0,0,0,.6);
          --g-fundo-1: #2B1B12; --g-fundo-2: #1E1420; --g-fundo-3: #151C1A;
          --g-side: rgba(10,7,5,0.95); --g-side-texto: #F3E9DD; --g-side-sub: #8B7C6B;
        }

        .g-fundo {
          min-height: 100vh; color: var(--g-texto);
          background:
            radial-gradient(1000px 620px at 10% -10%, var(--g-fundo-1), transparent 60%),
            radial-gradient(820px 560px at 95% 0%, var(--g-fundo-2), transparent 55%),
            radial-gradient(1000px 640px at 50% 108%, var(--g-fundo-3), transparent 60%);
          background-color: color-mix(in srgb, var(--g-fundo-1) 18%, white 82%);
        }
        [data-glass][data-theme="dark"].g-fundo { background-color: #0E0906; }

        .g-serif { font-family: ${fraunces.style.fontFamily}; font-optical-sizing: auto; }

        .g-shell { display: flex; min-height: 100vh; }

        .g-sidebar {
          width: 220px; flex-shrink: 0; margin: 18px 0 18px 18px; border-radius: 24px; padding: 22px 14px;
          background: var(--g-side); color: var(--g-side-texto); backdrop-filter: blur(22px);
          box-shadow: var(--g-sombra);
          display: flex; flex-direction: column; gap: 28px;
        }
        .g-marca { padding: 0 10px; }
        .g-marca-texto { font-family: ${fraunces.style.fontFamily}; font-weight: 600; font-size: 19px; font-style: italic; }
        .g-marca-sub { font-size: 10.5px; color: var(--g-side-sub); margin-top: 2px; letter-spacing: 0.02em; }
        .g-nav { display: flex; flex-direction: column; gap: 2px; }
        .g-nav-item { display: flex; align-items: center; gap: 11px; padding: 9px 12px; border-radius: 11px; font-size: 13px; font-weight: 500; color: var(--g-side-sub); transition: background 180ms ease, color 180ms ease, transform 180ms ease; }
        .g-nav-item.ativo { background: var(--g-cobre); color: #fff; font-weight: 600; }
        .g-nav-item:not(.ativo):hover { background: rgba(255,255,255,0.06); color: var(--g-side-texto); transform: translateX(2px); }
        .g-side-rodape { margin-top: auto; padding: 14px 15px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.08); font-size: 11px; color: var(--g-side-sub); line-height: 1.5; }
        .g-side-rodape b { color: var(--g-cobre-claro); display: block; font-family: ${fraunces.style.fontFamily}; font-style: italic; font-size: 15px; font-weight: 600; margin-bottom: 3px; }

        .g-main { flex: 1; padding: 30px 34px 40px; max-width: 1120px; }

        .g-topo { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 26px; }
        .g-titulo { font-family: ${fraunces.style.fontFamily}; font-style: italic; font-weight: 600; font-size: 27px; letter-spacing: -0.01em; }
        .g-subtitulo { font-size: 13px; color: var(--g-sub); margin-top: 4px; }
        .g-toggle { display: flex; gap: 3px; padding: 4px; border-radius: 999px; background: var(--g-vidro); border: 1px solid var(--g-vidro-borda); backdrop-filter: blur(16px); box-shadow: var(--g-sombra); }
        .g-toggle button { padding: 6px 14px; font-size: 12px; font-weight: 600; border-radius: 999px; color: var(--g-sub); transition: background 160ms ease, color 160ms ease; }
        .g-toggle button.ativo { background: var(--g-cobre); color: #fff; }

        /* Hero assimétrico: proporção 3:7, não decoração. O anel carrega 1
           métrica (valor + rótulo + legenda de alvo = 3 unidades de
           informação); a lista carrega 3 métricas em linha (rótulo+valor,
           uma delas com um "de N" extra = 7 unidades). 3:7 é a razão real
           de conteúdo, não 300px escolhido por olho. */
        .g-hero { display: grid; grid-template-columns: 3fr 7fr; gap: 0; margin-bottom: 18px; border-radius: 26px; overflow: hidden; box-shadow: var(--g-sombra); }
        .g-hero-anel-bloco {
          background: var(--g-vidro); border: 1px solid var(--g-vidro-borda); backdrop-filter: blur(20px) saturate(160%);
          padding: 30px 26px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
          position: relative;
        }
        .g-hero-anel-bloco::before {
          content: ""; position: absolute; inset: -30%; z-index: 0;
          background: radial-gradient(circle, color-mix(in srgb, var(--g-cobre) 24%, transparent), transparent 70%);
          filter: blur(6px);
        }
        .g-anel { width: 168px; height: 168px; border-radius: 50%; position: relative; z-index: 1; }
        .g-anel::before { content: ""; position: absolute; inset: 16px; border-radius: 50%; background: var(--g-painel); box-shadow: inset 0 2px 6px rgba(0,0,0,0.12); }
        .g-anel-miolo { position: absolute; inset: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .g-anel-valor { font-family: ${fraunces.style.fontFamily}; font-weight: 600; font-size: 42px; line-height: 1; color: var(--g-cobre); }
        .g-anel-rotulo { font-size: 10.5px; color: var(--g-sub); margin-top: 5px; text-align: center; letter-spacing: 0.03em; }
        .g-hero-legenda { font-size: 11.5px; color: var(--g-faint); text-align: center; position: relative; z-index: 1; max-width: 210px; }
        .g-hero-legenda b { color: var(--g-sub); }

        .g-hero-lista { background: var(--g-painel); border: 1px solid var(--g-painel-borda); border-left: none; padding: 8px 8px; display: flex; flex-direction: column; justify-content: center; }
        .g-hero-item { display: flex; align-items: baseline; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid var(--g-painel-borda); transition: background 160ms ease; }
        .g-hero-item:last-child { border-bottom: none; }
        .g-hero-item:hover { background: color-mix(in srgb, var(--g-cobre) 5%, transparent); }
        .g-hero-item-rotulo { font-size: 13px; color: var(--g-sub); }
        .g-hero-item-valor { font-family: ${fraunces.style.fontFamily}; font-size: 23px; font-weight: 600; color: var(--g-texto); }
        .g-hero-item-valor.g-alerta { color: var(--g-vermelho); }
        .g-hero-item-sub { font-size: 10.5px; color: var(--g-faint); margin-left: 8px; font-family: ${hanken.style.fontFamily}; }

        /* Painéis de conteúdo: superfícies sólidas com cor considerada, não
           vidro repetido -- só o hero e a barra lateral usam blur de verdade. */
        .g-painel { background: var(--g-painel); border: 1px solid var(--g-painel-borda); border-radius: 20px; }

        /* Perdas x Produção não dividem 50/50: perdas tem 4 campos por linha
           e um deles (motivo) é frase livre, sem teto de caracteres --
           precisa de mais coluna pra não quebrar em 3 linhas. Produção tem
           3 campos, todos token curto (nome do prato, lote, status), que
           cabem bem numa coluna mais estreita. 1.5:1 reflete essa largura de
           campo, não a contagem de linhas do dia (que muda todo dia). */
        .g-grid-2 { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; }
        .g-secao-titulo { font-family: ${fraunces.style.fontFamily}; font-style: italic; font-size: 17px; font-weight: 600; padding: 20px 24px 3px; }
        .g-secao-sub { font-size: 12px; color: var(--g-sub); padding: 0 24px 14px; }

        .g-tabela { width: 100%; font-size: 12.5px; border-collapse: collapse; }
        .g-tabela th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--g-faint); font-weight: 600; padding: 6px 24px; }
        .g-tabela th:last-child, .g-tabela td:last-child { text-align: right; }
        .g-tabela td { padding: 11px 24px; border-top: 1px solid var(--g-painel-borda); }
        .g-tabela tr:hover td { background: color-mix(in srgb, var(--g-cobre) 5%, transparent); }

        .g-lista { padding: 2px 14px 18px; display: flex; flex-direction: column; }
        .g-item { display: flex; align-items: center; gap: 12px; padding: 11px 10px; border-bottom: 1px solid var(--g-painel-borda); transition: background 160ms ease; }
        .g-item:last-child { border-bottom: none; }
        .g-item:hover { background: color-mix(in srgb, var(--g-cobre) 5%, transparent); }
        .g-item-tag { width: 7px; height: 7px; border-radius: 2px; flex-shrink: 0; background: var(--tag-cor); }
        .g-item-nome { font-size: 12.5px; font-weight: 600; }
        .g-item-sub { font-size: 10.5px; color: var(--g-faint); margin-top: 1px; }
        .g-item-status { margin-left: auto; font-size: 10.5px; font-weight: 600; color: var(--tag-cor); white-space: nowrap; }

        .g-chart-wrap { padding: 4px 16px 18px; }

        @media (prefers-reduced-motion: reduce) {
          .g-fundo * { transition: none !important; }
        }
      `}</style>

      <div className="g-shell">
        <aside className="g-sidebar">
          <div className="g-marca">
            <div className="g-marca-texto">Ficha Técnica</div>
            <div className="g-marca-sub">{NOME_RESTAURANTE}</div>
          </div>
          <nav className="g-nav">
            {NAV.map((n) => (
              <div key={n.label} className={`g-nav-item ${n.ativo ? "ativo" : ""}`}>
                <n.icon />
                {n.label}
              </div>
            ))}
          </nav>
          <div className="g-side-rodape">
            <b>{(margemAlvoCliente * 100).toFixed(0)}%</b>
            margem alvo em todo o cardápio
          </div>
        </aside>

        <main className="g-main">
          <div className="g-topo">
            <div>
              <div className="g-titulo">Olá, {NOME_RESTAURANTE.split(" ")[0]}</div>
              <div className="g-subtitulo">Desempenho do cardápio agora.</div>
            </div>
            <div className="g-toggle">
              <button className={tema === "light" ? "ativo" : ""} onClick={() => setTema("light")}>Claro</button>
              <button className={tema === "dark" ? "ativo" : ""} onClick={() => setTema("dark")}>Escuro</button>
            </div>
          </div>

          <div className="g-hero">
            <div className="g-hero-anel-bloco">
              <div className="g-anel" style={{ background: `conic-gradient(var(--g-cobre) 0deg ${margemDeg}deg, color-mix(in srgb, var(--g-cobre) 12%, transparent) ${margemDeg}deg 360deg)` }}>
                <div className="g-anel-miolo">
                  <div className="g-anel-valor" style={nums}>{resumo.margemMedia !== null ? resumo.margemMedia.toFixed(0) : "—"}<span style={{ fontSize: 20 }}>%</span></div>
                  <div className="g-anel-rotulo">margem média</div>
                </div>
              </div>
              <div className="g-hero-legenda">alvo <b>{resumo.margemAlvoMedia.toFixed(0)}%</b> em todo o cardápio</div>
            </div>
            <div className="g-hero-lista">
              <div className="g-hero-item">
                <span className="g-hero-item-rotulo">CMV médio dos pratos</span>
                <span className="g-hero-item-valor" style={nums}>{resumo.cmvMedio !== null ? `${resumo.cmvMedio.toFixed(1)}%` : "—"}</span>
              </div>
              <div className="g-hero-item">
                <span className="g-hero-item-rotulo">Pratos abaixo da margem alvo</span>
                <span className={`g-hero-item-valor ${abaixoAlerta ? "g-alerta" : ""}`} style={nums}>{resumo.abaixoDoAlvo}<span className="g-hero-item-sub">de {resumo.comPreco.length}</span></span>
              </div>
              <div className="g-hero-item">
                <span className="g-hero-item-rotulo">Perda de estoque em {resumo.nomeMes}</span>
                <span className={`g-hero-item-valor ${perdaAlerta ? "g-alerta" : ""}`} style={nums}>{formatBRL(resumo.perdaTotalReais)}</span>
              </div>
            </div>
          </div>

          <div className="g-painel" style={{ marginBottom: 16 }}>
            <div className="g-secao-titulo">Engenharia de cardápio</div>
            <div className="g-secao-sub">Margem por prato, ordenado por venda no período.</div>
            <div className="g-chart-wrap">
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 24 }}>
                  <defs>
                    <linearGradient id="gGradMargem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--g-cobre)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--g-cobre)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="nome" tick={{ fontSize: 10.5, fill: "var(--g-faint)" }} tickLine={false} axisLine={{ stroke: "var(--g-painel-borda)" }} interval={0} angle={-14} textAnchor="end" height={46} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10.5, fill: "var(--g-faint)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={40} />
                  <Tooltip
                    contentStyle={{ background: "var(--g-painel)", border: "1px solid var(--g-painel-borda)", borderRadius: 14, fontSize: 12 }}
                    formatter={(v) => [`${Number(v).toFixed(1)}%`, "Margem"]}
                  />
                  <Area type="monotone" dataKey="margem" stroke="var(--g-cobre)" strokeWidth={2.5} fill="url(#gGradMargem)" dot={{ r: 4, fill: "var(--g-cobre)", strokeWidth: 2, stroke: "var(--g-painel)" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="g-grid-2">
            <div className="g-painel">
              <div className="g-secao-titulo">Perdas recentes</div>
              <div className="g-secao-sub">Últimos lotes descartados no período.</div>
              {resumo.perdasRecentes.length === 0 ? (
                <div style={{ padding: "24px 24px", color: "var(--g-faint)", fontSize: 12.5 }}>Nenhuma perda registrada ainda.</div>
              ) : (
                <table className="g-tabela">
                  <thead>
                    <tr><th>Lote</th><th>Prato</th><th>Qtd.</th><th style={{ textAlign: "left" }}>Motivo</th></tr>
                  </thead>
                  <tbody>
                    {resumo.perdasRecentes.map((p) => (
                      <tr key={p.id}>
                        <td style={nums}>{p.lote}</td>
                        <td>{p.nomeReceita}</td>
                        <td style={nums}>{p.quantidade} {p.unidadeRendimento}</td>
                        <td style={{ color: "var(--g-vermelho)", textAlign: "left" }}>{p.motivoPerda ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="g-painel">
              <div className="g-secao-titulo">Produção agora</div>
              <div className="g-secao-sub">Lotes em curso hoje.</div>
              <div className="g-lista">
                {producoes.slice(0, 6).map((it) => {
                  const info = STATUS_INFO[it.status];
                  return (
                    <div key={it.id} className="g-item" style={{ ["--tag-cor" as string]: info.cor }}>
                      <span className="g-item-tag" />
                      <div>
                        <div className="g-item-nome">{it.nomeReceita}</div>
                        <div className="g-item-sub">{it.lote} · {it.quantidade} {it.unidadeRendimento}</div>
                      </div>
                      <span className="g-item-status">{info.rotulo}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
