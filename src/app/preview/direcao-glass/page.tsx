"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatBRL } from "@/components/charts/format";
import { resumoVisaoGeral } from "../_shared/resumoVisaoGeral";
import { NOME_RESTAURANTE, insumos, todasReceitas, processamentos, producoes, fechamentos, margemAlvoCliente } from "../fixtures";

const resumo = resumoVisaoGeral({ margemAlvoCliente, insumos, receitas: todasReceitas, processamentos, producoes, fechamentos });

const nums = { fontVariantNumeric: "tabular-nums" } as const;

function IconGauge({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14a8 8 0 1 1 16 0" />
      <path d="M12 14 16 9" />
    </svg>
  );
}
function IconTrendUp({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17 9 11 13 15 21 7" />
      <path d="M15 7h6v6" />
    </svg>
  );
}
function IconAlert({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9v4" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 17h.01" />
    </svg>
  );
}
function IconBox({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8 12 3 3 8l9 5 9-5Z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </svg>
  );
}
function IconHome({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11 12 4l9 7" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function IconChart({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 15l4-5 3 3 5-7" />
    </svg>
  );
}
function IconGrid({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function IconGear({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

const NAV = [
  { icon: IconGrid, label: "Visão Geral", ativo: true },
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

function KpiGlass({ icon: Icon, cor, label, valor, sub, alerta }: { icon: (p: { size?: number }) => React.ReactElement; cor: string; label: string; valor: string; sub?: string; alerta?: boolean }) {
  return (
    <div className="g-card g-kpi">
      <div className="g-kpi-badge" style={{ background: `color-mix(in srgb, ${cor} 18%, transparent)`, color: cor }}>
        <Icon />
      </div>
      <div className="g-kpi-valor" style={{ ...nums, color: alerta ? "var(--g-vermelho)" : "var(--g-texto)" }}>{valor}</div>
      <div className="g-kpi-label">{label}</div>
      {sub && <div className="g-kpi-sub" style={alerta ? { color: "var(--g-vermelho)" } : undefined}>{sub}</div>}
    </div>
  );
}

export default function DirecaoGlass() {
  const [tema, setTema] = useState<"light" | "dark">("light");

  const chartData = resumo.comPreco.map((p) => ({ nome: p.receita.nomePrato, margem: p.margemPct ?? 0 }));

  return (
    <div data-glass data-theme={tema} className="g-fundo">
      <style>{`
        [data-glass][data-theme="light"] {
          --g-texto: #1B2430; --g-sub: #67728A; --g-faint: #96A0B5;
          --g-verde: #1FAE6B; --g-azul: #2E7FE8; --g-vermelho: #E5484D; --g-ambar: #DA9A1F;
          --g-vidro: rgba(255,255,255,0.62); --g-vidro-borda: rgba(255,255,255,0.55);
          --g-sombra: 0 1px 1px rgba(31,45,80,.04), 0 20px 44px -12px rgba(31,45,80,.22);
          --g-fundo-1: #EAF0FB; --g-fundo-2: #F7ECF6; --g-fundo-3: #E7F6F1;
          --g-side: rgba(22,28,45,0.92); --g-side-texto: #E9EDFB; --g-side-sub: #8D96B8;
        }
        [data-glass][data-theme="dark"] {
          --g-texto: #EEF1FA; --g-sub: #A6AFC7; --g-faint: #737C97;
          --g-verde: #35D687; --g-azul: #5B9BFF; --g-vermelho: #FF6B70; --g-ambar: #F0B429;
          --g-vidro: rgba(30,35,55,0.55); --g-vidro-borda: rgba(255,255,255,0.10);
          --g-sombra: 0 1px 1px rgba(0,0,0,.3), 0 24px 48px -14px rgba(0,0,0,.55);
          --g-fundo-1: #131A33; --g-fundo-2: #1C1533; --g-fundo-3: #0F2A28;
          --g-side: rgba(10,13,26,0.92); --g-side-texto: #EEF1FA; --g-side-sub: #7C87A8;
        }

        .g-fundo {
          min-height: 100vh; color: var(--g-texto); font-family: var(--font-geist-sans), ui-sans-serif, sans-serif;
          background:
            radial-gradient(900px 560px at 8% -8%, var(--g-fundo-1), transparent 60%),
            radial-gradient(800px 520px at 92% 8%, var(--g-fundo-2), transparent 55%),
            radial-gradient(1000px 640px at 50% 105%, var(--g-fundo-3), transparent 60%),
            var(--g-texto-bg, #0000);
          background-color: color-mix(in srgb, var(--g-fundo-1) 25%, white 75%);
        }
        [data-glass][data-theme="dark"].g-fundo, [data-glass][data-theme="dark"] .g-fundo { background-color: #0B0E1C; }

        .g-shell { display: flex; min-height: 100vh; }

        .g-sidebar {
          width: 232px; flex-shrink: 0; margin: 18px 0 18px 18px; border-radius: 26px; padding: 22px 16px;
          background: var(--g-side); color: var(--g-side-texto);
          box-shadow: var(--g-sombra);
          display: flex; flex-direction: column; gap: 26px;
        }
        .g-marca { display: flex; align-items: center; gap: 10px; padding: 0 8px; }
        .g-marca-icone { width: 34px; height: 34px; border-radius: 11px; background: linear-gradient(135deg, var(--g-azul), var(--g-verde)); display: flex; align-items: center; justify-content: center; font-weight: 800; color: white; font-size: 15px; }
        .g-marca-texto { font-weight: 700; font-size: 14.5px; }
        .g-marca-sub { font-size: 10.5px; color: var(--g-side-sub); }
        .g-nav { display: flex; flex-direction: column; gap: 3px; }
        .g-nav-item { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 13px; font-size: 13px; font-weight: 500; color: var(--g-side-sub); transition: background 160ms ease, color 160ms ease; }
        .g-nav-item.ativo { background: rgba(255,255,255,0.12); color: var(--g-side-texto); font-weight: 600; }
        .g-nav-item:not(.ativo):hover { background: rgba(255,255,255,0.06); color: var(--g-side-texto); }
        .g-side-rodape { margin-top: auto; padding: 14px; border-radius: 16px; background: rgba(255,255,255,0.07); font-size: 11.5px; color: var(--g-side-sub); }
        .g-side-rodape b { color: var(--g-side-texto); display: block; font-size: 12.5px; margin-bottom: 2px; }

        .g-main { flex: 1; padding: 28px 32px 40px; max-width: 1080px; }

        .g-topo { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
        .g-titulo { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
        .g-subtitulo { font-size: 13px; color: var(--g-sub); margin-top: 3px; }
        .g-toggle { display: flex; gap: 3px; padding: 4px; border-radius: 999px; background: var(--g-vidro); border: 1px solid var(--g-vidro-borda); backdrop-filter: blur(16px); box-shadow: var(--g-sombra); }
        .g-toggle button { padding: 6px 14px; font-size: 12px; font-weight: 600; border-radius: 999px; color: var(--g-sub); }
        .g-toggle button.ativo { background: var(--g-texto); color: var(--g-vidro); }

        .g-card {
          background: var(--g-vidro); border: 1px solid var(--g-vidro-borda); border-radius: 22px;
          backdrop-filter: blur(20px) saturate(160%); -webkit-backdrop-filter: blur(20px) saturate(160%);
          box-shadow: var(--g-sombra);
        }

        .g-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
        .g-kpi { padding: 20px; }
        .g-kpi-badge { width: 40px; height: 40px; border-radius: 13px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
        .g-kpi-valor { font-size: 27px; font-weight: 700; letter-spacing: -0.02em; line-height: 1; }
        .g-kpi-label { font-size: 12.5px; color: var(--g-sub); margin-top: 6px; font-weight: 500; }
        .g-kpi-sub { font-size: 11px; color: var(--g-faint); margin-top: 3px; }

        .g-grid-2 { display: grid; grid-template-columns: 1.35fr 1fr; gap: 16px; margin-bottom: 16px; }
        .g-secao-titulo { font-size: 14.5px; font-weight: 700; padding: 20px 22px 4px; letter-spacing: -0.01em; }
        .g-secao-sub { font-size: 12px; color: var(--g-sub); padding: 0 22px 14px; }

        .g-tabela { width: 100%; font-size: 12.5px; border-collapse: collapse; }
        .g-tabela th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--g-faint); font-weight: 600; padding: 6px 22px; }
        .g-tabela th:last-child, .g-tabela td:last-child { text-align: right; }
        .g-tabela td { padding: 10px 22px; border-top: 1px solid var(--g-vidro-borda); }
        .g-tabela tr:hover td { background: rgba(120,140,255,0.06); }

        .g-lista { padding: 4px 14px 16px; display: flex; flex-direction: column; gap: 8px; }
        .g-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 14px; transition: background 160ms ease; }
        .g-item:hover { background: rgba(120,140,255,0.07); }
        .g-item-tag { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 0 4px color-mix(in srgb, var(--tag-cor) 18%, transparent); background: var(--tag-cor); }
        .g-item-nome { font-size: 12.5px; font-weight: 600; }
        .g-item-sub { font-size: 10.5px; color: var(--g-faint); margin-top: 1px; }
        .g-item-status { margin-left: auto; font-size: 10.5px; font-weight: 600; padding: 3px 9px; border-radius: 999px; color: var(--tag-cor); background: color-mix(in srgb, var(--tag-cor) 14%, transparent); white-space: nowrap; }

        .g-chart-wrap { padding: 4px 14px 18px; }
      `}</style>

      <div className="g-shell">
        <aside className="g-sidebar">
          <div className="g-marca">
            <div className="g-marca-icone">FT</div>
            <div>
              <div className="g-marca-texto">Ficha Técnica</div>
              <div className="g-marca-sub">{NOME_RESTAURANTE}</div>
            </div>
          </div>
          <nav className="g-nav">
            {NAV.map((n) => (
              <div key={n.label} className={`g-nav-item ${n.ativo ? "ativo" : ""}`}>
                <n.icon size={17} />
                {n.label}
              </div>
            ))}
          </nav>
          <div className="g-side-rodape">
            <b>Margem alvo</b>
            {(margemAlvoCliente * 100).toFixed(0)}% em todo o cardápio
          </div>
        </aside>

        <main className="g-main">
          <div className="g-topo">
            <div>
              <div className="g-titulo">Olá, {NOME_RESTAURANTE.split(" ")[0]} 👋</div>
              <div className="g-subtitulo">Aqui está o desempenho do cardápio agora.</div>
            </div>
            <div className="g-toggle">
              <button className={tema === "light" ? "ativo" : ""} onClick={() => setTema("light")}>Claro</button>
              <button className={tema === "dark" ? "ativo" : ""} onClick={() => setTema("dark")}>Escuro</button>
            </div>
          </div>

          <div className="g-kpis">
            <KpiGlass icon={IconGauge} cor="var(--g-azul)" label="CMV médio dos pratos" valor={resumo.cmvMedio !== null ? `${resumo.cmvMedio.toFixed(1)}%` : "—"} sub="dentro do saudável" />
            <KpiGlass icon={IconTrendUp} cor="var(--g-verde)" label="Margem média atual" valor={resumo.margemMedia !== null ? `${resumo.margemMedia.toFixed(1)}%` : "—"} sub={`alvo ${resumo.margemAlvoMedia.toFixed(0)}%`} />
            <KpiGlass icon={IconAlert} cor={resumo.abaixoDoAlvo > 0 ? "var(--g-ambar)" : "var(--g-verde)"} alerta={resumo.abaixoDoAlvo > 0} label="Abaixo da margem alvo" valor={String(resumo.abaixoDoAlvo)} sub={`de ${resumo.comPreco.length} com preço`} />
            <KpiGlass icon={IconBox} cor={resumo.perdaTotalReais > 0 ? "var(--g-vermelho)" : "var(--g-verde)"} alerta={resumo.perdaTotalReais > 0} label={`Perda em ${resumo.nomeMes}`} valor={formatBRL(resumo.perdaTotalReais)} sub={`${resumo.perdasDoMes.length} lote(s)`} />
          </div>

          <div className="g-card" style={{ marginBottom: 16 }}>
            <div className="g-secao-titulo">Engenharia de cardápio</div>
            <div className="g-secao-sub">Margem por prato, ordenado por venda no período.</div>
            <div className="g-chart-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 24 }}>
                  <defs>
                    <linearGradient id="gGradMargem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--g-azul)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--g-azul)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--g-vidro-borda)" />
                  <XAxis dataKey="nome" tick={{ fontSize: 10.5, fill: "var(--g-faint)" }} tickLine={false} axisLine={false} interval={0} angle={-14} textAnchor="end" height={46} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10.5, fill: "var(--g-faint)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={40} />
                  <Tooltip
                    contentStyle={{ background: "var(--g-vidro)", backdropFilter: "blur(12px)", border: "1px solid var(--g-vidro-borda)", borderRadius: 14, fontSize: 12 }}
                    formatter={(v) => [`${Number(v).toFixed(1)}%`, "Margem"]}
                  />
                  <Area type="monotone" dataKey="margem" stroke="var(--g-azul)" strokeWidth={2.5} fill="url(#gGradMargem)" dot={{ r: 4, fill: "var(--g-azul)", strokeWidth: 2, stroke: "var(--g-vidro)" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="g-grid-2">
            <div className="g-card">
              <div className="g-secao-titulo">Perdas recentes</div>
              <div className="g-secao-sub">Últimos lotes descartados no período.</div>
              {resumo.perdasRecentes.length === 0 ? (
                <div style={{ padding: "24px 22px", color: "var(--g-faint)", fontSize: 12.5 }}>Nenhuma perda registrada ainda.</div>
              ) : (
                <table className="g-tabela">
                  <thead>
                    <tr><th>Lote</th><th>Prato</th><th>Qtd.</th></tr>
                  </thead>
                  <tbody>
                    {resumo.perdasRecentes.map((p) => (
                      <tr key={p.id}>
                        <td style={nums}>{p.lote}</td>
                        <td>{p.nomeReceita}</td>
                        <td style={nums}>{p.quantidade} {p.unidadeRendimento}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="g-card">
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
