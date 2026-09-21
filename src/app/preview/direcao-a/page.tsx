"use client";

import { useState } from "react";
import { IBM_Plex_Mono } from "next/font/google";
import { Cell, LabelList, ReferenceArea, ReferenceLine, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { Card } from "@/components/ficha/Card";
import { nums } from "@/components/ficha/tema";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { ChartTooltipCard } from "@/components/charts/ChartTooltipCard";
import { formatBRL, formatPercentEixo } from "@/components/charts/format";
import { axisLineStyle, axisTickStyle, CHART_MARGIN } from "@/components/charts/theme";
import { resumoVisaoGeral } from "../_shared/resumoVisaoGeral";
import { NOME_RESTAURANTE, insumos, todasReceitas, processamentos, producoes, fechamentos, margemAlvoCliente } from "../fixtures";

const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

const resumo = resumoVisaoGeral({ margemAlvoCliente, insumos, receitas: todasReceitas, processamentos, producoes, fechamentos });

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

const COLUNAS_KANBAN: { status: "em_producao" | "produzido" | "perda"; rotulo: string }[] = [
  { status: "em_producao", rotulo: "EM PROCESSO" },
  { status: "produzido", rotulo: "CONCLUÍDO" },
  { status: "perda", rotulo: "REJEITADO" },
];

export default function DirecaoA() {
  const [tema, setTema] = useState<"light" | "dark">("dark");

  // Momento de confiança total da direção: o mostrador gigante -- a margem
  // média vira leitura de instrumento em escala real, não estatística
  // discreta. É a primeira coisa que a tela mostra.
  const margemDeg = resumo.margemMedia !== null ? clamp(resumo.margemMedia, 0, 100) * 3.6 : 0;
  const alvoDeg = clamp(resumo.margemAlvoMedia, 0, 100) * 3.6;
  const foraDoAlvo = resumo.margemMedia !== null && resumo.margemMedia < resumo.margemAlvoMedia;

  return (
    <div data-direcao="a" data-theme={tema} className={plexMono.className} style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
      <style>{`
        [data-direcao="a"][data-theme="light"] {
          --bg: #EDF1F2; --panel: #FFFFFF; --border: #D7E0E3; --border-strong: #B7C6CB;
          --text: #131A1D; --sub: #4F6167; --faint: #63757B;
          --accent: #0E7D68; --accent-soft: #DCF0EA; --danger: #B23D2A; --danger-soft: #F6E1DA;
          --a-excesso: #96631A; --a-excesso-soft: #F1E4CC;
          --font-geist-mono: ${plexMono.style.fontFamily}; --font-geist-sans: ${plexMono.style.fontFamily};
          --shadow: 0 1px 2px rgba(19,26,29,.06), 0 8px 22px rgba(19,26,29,.07);
        }
        [data-direcao="a"][data-theme="dark"] {
          --bg: #10161A; --panel: #1A2126; --border: #262F35; --border-strong: #37434B;
          --text: #E7EEF1; --sub: #93A4AB; --faint: #71838A;
          --accent: #3ED6B0; --accent-soft: #1B3730; --danger: #E8543F; --danger-soft: #3A231C;
          --a-excesso: #F0A63B; --a-excesso-soft: #3A2E17;
          --font-geist-mono: ${plexMono.style.fontFamily}; --font-geist-sans: ${plexMono.style.fontFamily};
          --shadow: 0 1px 2px rgba(0,0,0,.5), 0 12px 30px rgba(0,0,0,.5);
        }
        [data-direcao="a"] .rounded-2xl { border-radius: 4px; }
        [data-direcao="a"] { letter-spacing: -0.005em; }

        [data-direcao="a"] .a-topo { border-bottom: 1px solid var(--border); }
        [data-direcao="a"] .a-lcd {
          border: 1px solid var(--border-strong); background: var(--bg); color: var(--accent);
          padding: 3px 10px; border-radius: 2px; letter-spacing: 0.12em; font-size: 11px; font-weight: 600;
          text-shadow: 0 0 8px color-mix(in srgb, var(--accent) 55%, transparent);
        }
        [data-direcao="a"] .a-toggle { border: 1px solid var(--border-strong); border-radius: 2px; overflow: hidden; display: flex; }
        [data-direcao="a"] .a-toggle button { padding: 5px 10px; font-size: 10.5px; letter-spacing: 0.08em; font-weight: 600; color: var(--faint); background: transparent; }
        [data-direcao="a"] .a-toggle button.ativo { background: var(--accent); color: var(--bg); }

        /* Mostrador gigante -- o momento saturado e sem hesitação da direção. */
        [data-direcao="a"] .a-mostrador-bloco { display: flex; align-items: center; gap: 40px; padding: 36px 40px; background: var(--panel); border-radius: 8px; box-shadow: var(--shadow); }
        [data-direcao="a"] .a-mostrador { width: 260px; height: 260px; border-radius: 50%; position: relative; flex-shrink: 0; transition: filter 220ms ease; }
        [data-direcao="a"] .a-mostrador::before { content: ""; position: absolute; inset: 22px; border-radius: 50%; background: var(--panel); }
        [data-direcao="a"] .a-mostrador-alvo { position: absolute; top: 6px; left: 50%; width: 3px; height: 20px; background: var(--text); transform-origin: 50% 124px; margin-left: -1.5px; border-radius: 2px; }
        [data-direcao="a"] .a-mostrador-miolo { position: absolute; inset: 22px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        [data-direcao="a"] .a-mostrador-valor { font-size: 64px; font-weight: 700; line-height: 1; color: var(--accent); }
        [data-direcao="a"] .a-mostrador-valor.a-fora { color: var(--a-excesso); }
        [data-direcao="a"] .a-mostrador-rotulo { font-size: 11px; letter-spacing: 0.1em; color: var(--faint); margin-top: 8px; text-align: center; }
        [data-direcao="a"] .a-mostrador-bloco:hover .a-mostrador { filter: drop-shadow(0 0 22px color-mix(in srgb, var(--accent) 45%, transparent)); }
        [data-direcao="a"] .a-mostrador-bloco:hover .a-mostrador-valor { animation: a-settle 420ms cubic-bezier(0.22, 1.6, 0.4, 1); }
        @keyframes a-settle { 0% { transform: scale(1.08); } 55% { transform: scale(0.98); } 100% { transform: scale(1); } }
        [data-direcao="a"] .a-mostrador-legenda { max-width: 260px; }
        [data-direcao="a"] .a-mostrador-legenda-titulo { font-size: 13px; letter-spacing: 0.08em; font-weight: 700; margin-bottom: 6px; }
        [data-direcao="a"] .a-mostrador-legenda-texto { font-size: 12px; color: var(--sub); line-height: 1.5; }
        [data-direcao="a"] .a-mostrador-legenda-alvo { display: flex; align-items: center; gap: 8px; margin-top: 14px; font-size: 11.5px; color: var(--faint); }
        [data-direcao="a"] .a-mostrador-legenda-alvo span.a-marca { width: 3px; height: 14px; background: var(--text); border-radius: 2px; }

        /* Tira compacta de leitura secundária -- deliberadamente menor que o mostrador. */
        [data-direcao="a"] .a-tira { display: flex; background: var(--panel); border-radius: 6px; box-shadow: var(--shadow); overflow: hidden; }
        [data-direcao="a"] .a-tira-item { flex: 1; padding: 14px 18px; border-right: 1px solid var(--border); transition: background 150ms ease; }
        [data-direcao="a"] .a-tira-item:last-child { border-right: none; }
        [data-direcao="a"] .a-tira-item:hover { background: color-mix(in srgb, var(--accent) 5%, transparent); }
        [data-direcao="a"] .a-tira-label { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--faint); }
        [data-direcao="a"] .a-tira-valor { font-size: 20px; font-weight: 700; margin-top: 4px; color: var(--text); white-space: nowrap; }
        [data-direcao="a"] .a-tira-valor.a-fora { color: var(--a-excesso); }
        [data-direcao="a"] .a-tira-item:hover .a-tira-valor { animation: a-tick 220ms ease; }
        @keyframes a-tick { 0% { transform: translateX(0); } 30% { transform: translateX(-1.5px); } 60% { transform: translateX(1px); } 100% { transform: translateX(0); } }

        [data-direcao="a"] table tr:hover td { background: color-mix(in srgb, var(--accent) 6%, transparent); }

        [data-direcao="a"] .a-kanban-col { background: var(--panel); border-radius: 4px; box-shadow: var(--shadow); }
        [data-direcao="a"] .a-kanban-head { font-size: 10px; letter-spacing: 0.1em; padding: 9px 12px; border-bottom: 1px solid var(--border); color: var(--faint); display: flex; justify-content: space-between; }
        [data-direcao="a"] .a-kanban-card { margin: 8px; padding: 9px 10px; border: 1px solid var(--border); border-radius: 3px; border-left: 3px solid var(--card-cor, var(--border-strong)); font-size: 11.5px; transition: border-color 150ms ease, transform 150ms ease; }
        [data-direcao="a"] .a-kanban-card:hover { transform: translateX(2px); }

        @media (prefers-reduced-motion: reduce) {
          [data-direcao="a"] * { animation: none !important; transition: none !important; }
        }
      `}</style>

      <header className="a-topo flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-4">
          <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.02em" }}>FICHA TÉCNICA <span style={{ color: "var(--faint)", fontWeight: 500 }}>/ CALIBRE</span></div>
          <div className="a-lcd">{NOME_RESTAURANTE.toUpperCase()}</div>
        </div>
        <div className="a-toggle">
          <button className={tema === "light" ? "ativo" : ""} onClick={() => setTema("light")}>CLARO</button>
          <button className={tema === "dark" ? "ativo" : ""} onClick={() => setTema("dark")}>ESCURO</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-10 space-y-8">
        {/* Mostrador gigante -- primeira coisa da tela, escala de instrumento real */}
        <div className="a-mostrador-bloco">
          <div className="a-mostrador" style={{ background: `conic-gradient(var(--accent) 0deg ${margemDeg}deg, var(--border) ${margemDeg}deg 360deg)` }}>
            <span className="a-mostrador-alvo" style={{ transform: `rotate(${alvoDeg}deg)` }} />
            <div className="a-mostrador-miolo">
              <div className={`a-mostrador-valor ${foraDoAlvo ? "a-fora" : ""}`} style={nums}>{resumo.margemMedia !== null ? resumo.margemMedia.toFixed(0) : "—"}</div>
              <div className="a-mostrador-rotulo">% MARGEM MÉDIA</div>
            </div>
          </div>
          <div className="a-mostrador-legenda">
            <div className="a-mostrador-legenda-titulo">LEITURA DO CARDÁPIO</div>
            <div className="a-mostrador-legenda-texto">Ponteiro cheio = 100% de margem. O traço marca onde a margem alvo do cliente fica no mostrador.</div>
            <div className="a-mostrador-legenda-alvo"><span className="a-marca" />alvo: {(margemAlvoCliente * 100).toFixed(0)}%</div>
          </div>
        </div>

        <div className="a-tira">
          <div className="a-tira-item">
            <div className="a-tira-label">CMV médio</div>
            <div className="a-tira-valor" style={nums}>{resumo.cmvMedio !== null ? `${resumo.cmvMedio.toFixed(1)}%` : "—"}</div>
          </div>
          <div className="a-tira-item">
            <div className="a-tira-label">Abaixo da margem alvo</div>
            <div className={`a-tira-valor ${resumo.abaixoDoAlvo > 0 ? "a-fora" : ""}`} style={nums}>{resumo.abaixoDoAlvo} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--faint)" }}>de {resumo.comPreco.length}</span></div>
          </div>
          <div className="a-tira-item">
            <div className="a-tira-label">Perda em {resumo.nomeMes}</div>
            <div className={`a-tira-valor ${resumo.perdaTotalReais > 0 ? "a-fora" : ""}`} style={nums}>{formatBRL(resumo.perdaTotalReais)}</div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[13px] font-semibold" style={{ letterSpacing: "0.02em" }}>ENGENHARIA DE CARDÁPIO</h2>
            <div className="flex items-center gap-3 text-[10.5px]" style={{ color: "var(--faint)" }}>
              <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} /> na faixa</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--a-excesso)" }} /> fora da faixa</span>
            </div>
          </div>
          <Card className="p-6">
            <ChartFrame vazio={resumo.comPreco.length === 0} tituloVazio="Nenhum prato com preço de venda cadastrado ainda." dicaVazio="Cadastre o preço de venda em Receitas & Fichas pra esse gráfico começar a preencher.">
              <ScatterChart margin={CHART_MARGIN}>
                <XAxis type="number" dataKey="qtdVendida" name="Vendas" domain={[0, resumo.xMax]} tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} label={{ value: "VENDAS NO PERÍODO", position: "insideBottom", offset: -5, fontSize: 10, fill: "var(--faint)" }} />
                <YAxis type="number" dataKey="margemPct" name="Margem %" domain={[resumo.yMin, resumo.yMax]} tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} width={40} tickFormatter={formatPercentEixo} />
                <ZAxis type="number" dataKey="qtdVendida" range={[160, 420]} />
                <ReferenceArea x1={0} x2={resumo.xMax} y1={resumo.yMin} y2={resumo.margemAlvoMedia} fill="var(--a-excesso)" fillOpacity={0.06} />
                <ReferenceLine y={resumo.margemAlvoMedia} stroke="var(--border-strong)" strokeDasharray="2 3" strokeWidth={1.2} label={{ value: `ALVO ${resumo.margemAlvoMedia.toFixed(0)}%`, position: "insideBottomRight", fontSize: 10, fill: "var(--sub)" }} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ payload }) => {
                    if (!payload || !payload.length) return null;
                    const p = payload[0].payload as (typeof resumo.comPreco)[number];
                    return (
                      <ChartTooltipCard
                        titulo={p.receita.nomePrato}
                        linhas={[
                          { rotulo: "Margem", valor: `${(p.margemPct as number).toFixed(1)}%`, cor: p.abaixoDoAlvo ? "var(--a-excesso)" : "var(--accent)", destaque: p.abaixoDoAlvo },
                          { rotulo: "Vendas no período", valor: String(p.qtdVendida) },
                          { rotulo: "CMV", valor: `${(p.cmvPct as number).toFixed(1)}%` },
                        ]}
                      />
                    );
                  }}
                />
                <Scatter data={resumo.comPreco}>
                  {resumo.comPreco.map((p) => (
                    <Cell key={p.receita.id} fill={p.abaixoDoAlvo ? "var(--a-excesso)" : "var(--accent)"} stroke="var(--panel)" strokeWidth={2} />
                  ))}
                  <LabelList
                    dataKey="receita.nomePrato"
                    content={(props) => {
                      const { x, y, value } = props as { x: number; y: number; value: string };
                      return (
                        <text x={x} y={y - 14} textAnchor="middle" fontSize={10.5} fontWeight={500} fill="var(--text)">
                          {value}
                        </text>
                      );
                    }}
                  />
                </Scatter>
              </ScatterChart>
            </ChartFrame>
          </Card>
        </div>

        <div>
          <h2 className="text-[13px] font-semibold mb-1" style={{ letterSpacing: "0.02em" }}>PERDAS RECENTES</h2>
          <p className="text-[11.5px] mb-3" style={{ color: "var(--sub)" }}>Últimos lotes descartados, motivo registrado no ponto de origem.</p>
          <Card>
            {resumo.perdasRecentes.length === 0 ? (
              <div className="py-8 text-center text-[12px]" style={{ color: "var(--faint)" }}>Nenhuma perda registrada ainda.</div>
            ) : (
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ color: "var(--faint)" }} className="text-left text-[10px] uppercase tracking-wide">
                    <th className="py-2.5 px-5 font-medium">Lote</th>
                    <th className="py-2.5 px-3 font-medium">Prato/preparo</th>
                    <th className="py-2.5 px-3 font-medium text-right">Qtd.</th>
                    <th className="py-2.5 px-5 font-medium">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.perdasRecentes.map((p) => (
                    <tr key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td className="py-2.5 px-5 font-medium" style={nums}>{p.lote}</td>
                      <td className="py-2.5 px-3">{p.nomeReceita}</td>
                      <td className="py-2.5 px-3 text-right" style={nums}>{p.quantidade} {p.unidadeRendimento}</td>
                      <td className="py-2.5 px-5" style={{ color: "var(--a-excesso)" }}>{p.motivoPerda ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div>
          <h2 className="text-[13px] font-semibold mb-1" style={{ letterSpacing: "0.02em" }}>PRODUÇÃO AGORA</h2>
          <p className="text-[11.5px] mb-3" style={{ color: "var(--sub)" }}>Lotes em curso hoje, por estado.</p>
          <div className="grid grid-cols-3 gap-2">
            {COLUNAS_KANBAN.map((col) => {
              const itens = producoes.filter((p) => p.status === col.status);
              const cor = col.status === "produzido" ? "var(--accent)" : col.status === "perda" ? "var(--danger)" : "var(--a-excesso)";
              return (
                <div key={col.status} className="a-kanban-col">
                  <div className="a-kanban-head"><span>{col.rotulo}</span><span style={nums}>{itens.length}</span></div>
                  {itens.slice(0, 3).map((it) => (
                    <div key={it.id} className="a-kanban-card" style={{ ["--card-cor" as string]: cor }}>
                      <div style={{ fontWeight: 600 }}>{it.nomeReceita}</div>
                      <div style={{ color: "var(--faint)", fontSize: 10.5, marginTop: 2, ...nums }}>{it.lote} · {it.quantidade} {it.unidadeRendimento}</div>
                    </div>
                  ))}
                  {itens.length === 0 && <div className="px-3 pb-3 text-[11px]" style={{ color: "var(--faint)" }}>vazio</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
