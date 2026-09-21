"use client";

import { useState, useRef, type MouseEvent } from "react";
import { Barlow_Semi_Condensed } from "next/font/google";
import { Cell, ReferenceArea, ReferenceLine, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { Card } from "@/components/ficha/Card";
import { nums } from "@/components/ficha/tema";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { ChartTooltipCard } from "@/components/charts/ChartTooltipCard";
import { formatBRL, formatPercentEixo } from "@/components/charts/format";
import { axisLineStyle, axisTickStyle, CHART_MARGIN } from "@/components/charts/theme";
import { resumoVisaoGeral } from "../_shared/resumoVisaoGeral";
import { NOME_RESTAURANTE, insumos, todasReceitas, processamentos, producoes, fechamentos, margemAlvoCliente } from "../fixtures";

const barlow = Barlow_Semi_Condensed({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

const resumo = resumoVisaoGeral({ margemAlvoCliente, insumos, receitas: todasReceitas, processamentos, producoes, fechamentos });

/** Vidro embaçado: o dado fica coberto de condensação até o mouse "limpar" o vidro -- gesto real, não decoração de carregamento. */
function VidroEmbacado({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mover = (e: MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    ref.current!.style.setProperty("--mx", `${e.clientX - r.left}px`);
    ref.current!.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <div ref={ref} className={`b-vidro ${className}`} onMouseMove={mover}>
      {children}
      <div className="b-embacado" />
    </div>
  );
}

const COLUNAS_KANBAN: { status: "em_producao" | "produzido" | "perda"; rotulo: string }[] = [
  { status: "em_producao", rotulo: "EM PREPARO" },
  { status: "produzido", rotulo: "ARMAZENADO" },
  { status: "perda", rotulo: "DESCARTADO" },
];

export default function DirecaoB() {
  const [tema, setTema] = useState<"light" | "dark">("dark");

  return (
    <div data-direcao="b" data-theme={tema} className={barlow.className} style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
      <style>{`
        [data-direcao="b"][data-theme="light"] {
          --bg: #E7EDF0; --panel: #FFFFFF; --border: #CBD9DE; --border-strong: #A6BDC4;
          --text: #10242C; --sub: #45606B; --faint: #5B747F;
          --accent: #0E7BA8; --accent-soft: #DCEEF5; --danger: #B03D28; --danger-soft: #F5E0D8;
          --font-geist-mono: ${barlow.style.fontFamily}; --font-geist-sans: ${barlow.style.fontFamily};
          --shadow: 0 1px 2px rgba(16,36,44,.06), 0 8px 22px rgba(16,36,44,.08);
        }
        [data-direcao="b"][data-theme="dark"] {
          --bg: #0D171C; --panel: #142229; --border: #223640; --border-strong: #304A56;
          --text: #E7F1F4; --sub: #86A3AD; --faint: #6E8791;
          --accent: #35B4E6; --accent-soft: #16303C; --danger: #E6604A; --danger-soft: #3A2119;
          --font-geist-mono: ${barlow.style.fontFamily}; --font-geist-sans: ${barlow.style.fontFamily};
          --shadow: 0 1px 2px rgba(0,0,0,.45), 0 12px 30px rgba(0,0,0,.5);
        }
        [data-direcao="b"] { text-transform: none; }
        [data-direcao="b"] .rounded-2xl { border-radius: 3px; }

        [data-direcao="b"] .b-topo { background: var(--text); color: var(--bg); position: relative; }
        [data-direcao="b"] .b-topo::after {
          content: ""; position: absolute; left: 0; right: 0; bottom: -6px; height: 6px;
          background-image: linear-gradient(135deg, var(--bg) 25%, transparent 25%), linear-gradient(225deg, var(--bg) 25%, transparent 25%);
          background-size: 12px 12px; background-position: 0 0;
        }
        [data-direcao="b"] .b-rotulo { font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
        [data-direcao="b"] .b-etiqueta { border: 1px solid color-mix(in srgb, var(--bg) 35%, transparent); padding: 3px 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
        [data-direcao="b"] .b-toggle button { padding: 5px 12px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: color-mix(in srgb, var(--bg) 60%, transparent); border: 1px solid color-mix(in srgb, var(--bg) 35%, transparent); }
        [data-direcao="b"] .b-toggle button.ativo { background: var(--accent); color: var(--text); border-color: var(--accent); }
        [data-direcao="b"] .b-toggle { display: flex; gap: 6px; }

        [data-direcao="b"] .b-vidro { position: relative; }
        [data-direcao="b"] .b-embacado {
          position: absolute; inset: 0; pointer-events: none;
          background: color-mix(in srgb, var(--panel) 62%, transparent);
          backdrop-filter: blur(2.5px) saturate(0.7);
          -webkit-mask-image: radial-gradient(150px circle at var(--mx, -999px) var(--my, -999px), transparent 0%, transparent 28%, black 60%);
          mask-image: radial-gradient(150px circle at var(--mx, -999px) var(--my, -999px), transparent 0%, transparent 28%, black 60%);
        }

        /* Vidraça gigante -- o momento saturado e sem hesitação da direção:
           janela de câmara fria em tamanho real, não card discreto. */
        [data-direcao="b"] .b-hero { background: var(--panel); border-radius: 4px; box-shadow: var(--shadow); overflow: hidden; position: relative; height: 100%; }
        [data-direcao="b"] .b-hero-vidro .b-embacado { -webkit-mask-image: radial-gradient(260px circle at var(--mx, -999px) var(--my, -999px), transparent 0%, transparent 30%, black 62%); mask-image: radial-gradient(260px circle at var(--mx, -999px) var(--my, -999px), transparent 0%, transparent 30%, black 62%); backdrop-filter: blur(4px) saturate(0.65); }
        [data-direcao="b"] .b-hero-corpo { padding: 34px 36px; display: flex; flex-direction: column; justify-content: center; height: 100%; min-height: 340px; }
        [data-direcao="b"] .b-hero-label { font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; color: var(--faint); }
        [data-direcao="b"] .b-hero-valor { font-size: 128px; font-weight: 700; line-height: 0.95; color: var(--accent); letter-spacing: -0.01em; }
        [data-direcao="b"] .b-hero-sub { font-size: 12.5px; color: var(--sub); margin-top: 10px; max-width: 320px; }
        [data-direcao="b"] .b-hero-placa { position: absolute; bottom: 18px; right: 20px; border: 1px solid var(--border-strong); padding: 3px 10px; font-size: 10.5px; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 700; color: var(--faint); border-radius: 2px; }

        [data-direcao="b"] .b-tira { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        [data-direcao="b"] .b-tira-item { background: var(--panel); border-radius: 3px; box-shadow: var(--shadow); }
        [data-direcao="b"] .b-tira-corpo { padding: 12px 14px; position: relative; }
        [data-direcao="b"] .b-tira-label { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 700; color: var(--faint); }
        [data-direcao="b"] .b-tira-valor { font-size: 21px; font-weight: 700; margin-top: 4px; color: var(--text); white-space: nowrap; }
        [data-direcao="b"] .b-tira-valor.b-alerta { color: var(--danger); }
        [data-direcao="b"] .b-tag { position: absolute; top: 9px; right: 9px; width: 7px; height: 7px; border-radius: 1px; }

        [data-direcao="b"] table tbody tr { position: relative; }
        [data-direcao="b"] table tbody tr:hover { background: color-mix(in srgb, var(--accent) 6%, transparent); }

        [data-direcao="b"] .b-prateleira { background: var(--panel); border-radius: 3px; box-shadow: var(--shadow); position: relative; padding-top: 4px; }
        [data-direcao="b"] .b-prateleira::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--border-strong), var(--border)); border-radius: 3px 3px 0 0; }
        [data-direcao="b"] .b-prateleira-head { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; padding: 10px 12px 8px; color: var(--faint); display: flex; justify-content: space-between; }
        [data-direcao="b"] .b-tray { margin: 0 8px 8px; padding: 9px 10px; background: var(--bg); border-radius: 2px; font-size: 11.5px; position: relative; padding-left: 16px; transition: transform 160ms ease; }
        [data-direcao="b"] .b-tray::before { content: ""; position: absolute; left: 8px; top: 12px; width: 6px; height: 6px; border-radius: 1px; background: var(--tray-cor, var(--border-strong)); }
        [data-direcao="b"] .b-tray:hover { transform: translateY(-1px); }

        @media (prefers-reduced-motion: reduce) {
          [data-direcao="b"] * { transition: none !important; backdrop-filter: none !important; }
          [data-direcao="b"] .b-embacado { display: none; }
        }
      `}</style>

      <header className="b-topo flex items-center justify-between px-8 py-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="b-rotulo text-[13px]">Ficha Técnica · Câmara Fria</div>
          <div className="b-etiqueta">{NOME_RESTAURANTE}</div>
        </div>
        <div className="b-toggle">
          <button className={tema === "light" ? "ativo" : ""} onClick={() => setTema("light")}>Ambiente</button>
          <button className={tema === "dark" ? "ativo" : ""} onClick={() => setTema("dark")}>Congelado</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 pb-10 space-y-6">
        {/* Vidraça + gráfico lado a lado -- primeira coisa da tela */}
        <div className="grid grid-cols-[1.1fr_1fr] gap-4">
          <div className="b-hero">
            <VidroEmbacado className="b-hero-vidro">
              <div className="b-hero-corpo">
                <div className="b-hero-label">Margem média atual</div>
                <div className="b-hero-valor" style={nums}>{resumo.margemMedia !== null ? resumo.margemMedia.toFixed(0) : "—"}<span style={{ fontSize: 48 }}>%</span></div>
                <div className="b-hero-sub">Passe o mouse pra limpar o vidro. Câmara mantida entre {resumo.yMin}% e {resumo.yMax}% de margem no período.</div>
              </div>
            </VidroEmbacado>
            <div className="b-hero-placa">alvo {(margemAlvoCliente * 100).toFixed(0)}%</div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[12.5px] font-bold uppercase tracking-wide">Engenharia de cardápio</h2>
            </div>
            <Card className="p-4" style={{ height: "calc(100% - 22px)" }}>
              <ChartFrame altura={296} vazio={resumo.comPreco.length === 0} tituloVazio="Nenhum prato com preço de venda cadastrado ainda." dicaVazio="Cadastre o preço de venda em Receitas & Fichas pra esse gráfico começar a preencher.">
                <ScatterChart margin={CHART_MARGIN}>
                  <XAxis type="number" dataKey="qtdVendida" name="Vendas" domain={[0, resumo.xMax]} tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} label={{ value: "Vendas no período", position: "insideBottom", offset: -5, fontSize: 10, fill: "var(--faint)" }} />
                  <YAxis type="number" dataKey="margemPct" name="Margem %" domain={[resumo.yMin, resumo.yMax]} tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} width={36} tickFormatter={formatPercentEixo} />
                  <ZAxis type="number" dataKey="qtdVendida" range={[140, 360]} />
                  <ReferenceArea x1={0} x2={resumo.xMax} y1={resumo.yMin} y2={resumo.margemAlvoMedia} fill="var(--danger)" fillOpacity={0.05} />
                  <ReferenceLine y={resumo.margemAlvoMedia} stroke="var(--border-strong)" strokeDasharray="4 4" strokeWidth={1.2} label={{ value: `alvo ${resumo.margemAlvoMedia.toFixed(0)}%`, position: "insideBottomRight", fontSize: 9, fill: "var(--sub)" }} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ payload }) => {
                      if (!payload || !payload.length) return null;
                      const p = payload[0].payload as (typeof resumo.comPreco)[number];
                      return (
                        <ChartTooltipCard
                          titulo={p.receita.nomePrato}
                          linhas={[
                            { rotulo: "Margem", valor: `${(p.margemPct as number).toFixed(1)}%`, cor: p.abaixoDoAlvo ? "var(--danger)" : "var(--accent)", destaque: p.abaixoDoAlvo },
                            { rotulo: "Vendas no período", valor: String(p.qtdVendida) },
                            { rotulo: "CMV", valor: `${(p.cmvPct as number).toFixed(1)}%` },
                          ]}
                        />
                      );
                    }}
                  />
                  <Scatter data={resumo.comPreco}>
                    {resumo.comPreco.map((p) => (
                      <Cell key={p.receita.id} fill={p.abaixoDoAlvo ? "var(--danger)" : "var(--accent)"} stroke="var(--panel)" strokeWidth={2} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ChartFrame>
            </Card>
          </div>
        </div>

        {/* Tira secundária -- deliberadamente pequena, sem competir com a vidraça */}
        <div className="b-tira">
          <div className="b-tira-item">
            <div className="b-tira-corpo">
              <div className="b-tira-label">CMV médio</div>
              <div className="b-tira-valor" style={nums}>{resumo.cmvMedio !== null ? `${resumo.cmvMedio.toFixed(1)}%` : "—"}</div>
            </div>
          </div>
          <div className="b-tira-item">
            <div className="b-tira-corpo">
              {resumo.abaixoDoAlvo > 0 && <span className="b-tag" style={{ background: "var(--danger)" }} />}
              <div className="b-tira-label">Abaixo da margem alvo</div>
              <div className={`b-tira-valor ${resumo.abaixoDoAlvo > 0 ? "b-alerta" : ""}`} style={nums}>{resumo.abaixoDoAlvo} de {resumo.comPreco.length}</div>
            </div>
          </div>
          <div className="b-tira-item">
            <div className="b-tira-corpo">
              {resumo.perdaTotalReais > 0 && <span className="b-tag" style={{ background: "var(--danger)" }} />}
              <div className="b-tira-label">Perda em {resumo.nomeMes}</div>
              <div className={`b-tira-valor ${resumo.perdaTotalReais > 0 ? "b-alerta" : ""}`} style={nums}>{formatBRL(resumo.perdaTotalReais)}</div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-[13.5px] font-bold uppercase tracking-wide mb-1">Produção agora</h2>
          <p className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>Lotes em curso hoje, por prateleira.</p>
          <div className="grid grid-cols-3 gap-2">
            {COLUNAS_KANBAN.map((col) => {
              const itens = producoes.filter((p) => p.status === col.status);
              const cor = col.status === "produzido" ? "var(--accent)" : col.status === "perda" ? "var(--danger)" : "var(--border-strong)";
              return (
                <div key={col.status} className="b-prateleira">
                  <div className="b-prateleira-head"><span>{col.rotulo}</span><span style={nums}>{itens.length}</span></div>
                  {itens.slice(0, 3).map((it) => (
                    <div key={it.id} className="b-tray" style={{ ["--tray-cor" as string]: cor }}>
                      <div style={{ fontWeight: 700 }}>{it.nomeReceita}</div>
                      <div style={{ color: "var(--faint)", fontSize: 10.5, marginTop: 2, ...nums }}>{it.lote} · {it.quantidade} {it.unidadeRendimento}</div>
                    </div>
                  ))}
                  {itens.length === 0 && <div className="px-3 pb-3 text-[11px]" style={{ color: "var(--faint)" }}>vazio</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-[13.5px] font-bold uppercase tracking-wide mb-1">Perdas recentes</h2>
          <p className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>Últimos lotes descartados, com o motivo registrado.</p>
          <Card>
            {resumo.perdasRecentes.length === 0 ? (
              <div className="py-8 text-center text-[12.5px]" style={{ color: "var(--faint)" }}>Nenhuma perda registrada ainda.</div>
            ) : (
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr style={{ color: "var(--faint)" }} className="text-left text-[10.5px] uppercase tracking-wide font-bold">
                    <th className="py-2.5 px-5 font-bold">Lote</th>
                    <th className="py-2.5 px-3 font-bold">Prato/preparo</th>
                    <th className="py-2.5 px-3 font-bold text-right">Quantidade</th>
                    <th className="py-2.5 px-5 font-bold">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.perdasRecentes.map((p) => (
                    <tr key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td className="py-2.5 px-5 font-semibold" style={nums}>{p.lote}</td>
                      <td className="py-2.5 px-3">{p.nomeReceita}</td>
                      <td className="py-2.5 px-3 text-right" style={nums}>{p.quantidade} {p.unidadeRendimento}</td>
                      <td className="py-2.5 px-5" style={{ color: "var(--danger)" }}>{p.motivoPerda ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
