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

function posicao(valor: number, min: number, max: number) {
  return Math.min(100, Math.max(0, ((valor - min) / (max - min)) * 100));
}

/** Régua de calibre: assinatura da direção -- lê o número como leitura de instrumento, não como estatística decorada. */
function ReguaCalibre({ valorPos, alvoPos, foraDeFaixa }: { valorPos: number; alvoPos?: number; foraDeFaixa: boolean }) {
  return (
    <div className="a-regua">
      <div className="a-regua-trilho">
        {[0, 25, 50, 75, 100].map((t) => (
          <span key={t} className="a-regua-tick" style={{ left: `${t}%` }} />
        ))}
        {alvoPos !== undefined && <span className="a-regua-alvo" style={{ left: `${alvoPos}%` }} />}
        <span className={`a-regua-marcador ${foraDeFaixa ? "a-fora" : ""}`} style={{ left: `${valorPos}%` }} />
      </div>
    </div>
  );
}

function KpiCalibre({ label, valor, pos, alvoPos, foraDeFaixa, unidade }: { label: string; valor: string; pos: number | null; alvoPos?: number; foraDeFaixa: boolean; unidade: string }) {
  return (
    <div className="a-kpi">
      <div className="a-kpi-label">{label}</div>
      <div className={`a-kpi-valor ${foraDeFaixa ? "a-fora" : ""}`} style={nums}>{valor}</div>
      <div className="a-kpi-unidade">{unidade}</div>
      {pos !== null && <ReguaCalibre valorPos={pos} alvoPos={alvoPos} foraDeFaixa={foraDeFaixa} />}
    </div>
  );
}

const COLUNAS_KANBAN: { status: "em_producao" | "produzido" | "perda"; rotulo: string }[] = [
  { status: "em_producao", rotulo: "EM PROCESSO" },
  { status: "produzido", rotulo: "CONCLUÍDO" },
  { status: "perda", rotulo: "REJEITADO" },
];

export default function DirecaoA() {
  const [tema, setTema] = useState<"light" | "dark">("dark");

  const cmvPos = resumo.cmvMedio !== null ? posicao(resumo.cmvMedio, 15, 55) : null;
  const margemPos = resumo.margemMedia !== null ? posicao(resumo.margemMedia, 20, 80) : null;

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

        [data-direcao="a"] .a-kpi { background: var(--panel); border-radius: 4px; padding: 16px 18px 14px; box-shadow: var(--shadow); position: relative; transition: transform 160ms ease; }
        [data-direcao="a"] .a-kpi:hover { transform: translateY(-1px); }
        [data-direcao="a"] .a-kpi-label { font-size: 10.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--faint); }
        [data-direcao="a"] .a-kpi-valor { font-size: 30px; font-weight: 700; margin-top: 6px; line-height: 1; color: var(--accent); white-space: nowrap; }
        [data-direcao="a"] .a-kpi-valor.a-fora { color: var(--a-excesso); }
        [data-direcao="a"] .a-kpi-unidade { font-size: 10px; color: var(--faint); margin-top: 3px; }

        [data-direcao="a"] .a-regua { margin-top: 12px; }
        [data-direcao="a"] .a-regua-trilho { position: relative; height: 3px; background: var(--border); border-radius: 2px; }
        [data-direcao="a"] .a-regua-tick { position: absolute; top: -2px; width: 1px; height: 7px; background: var(--border-strong); }
        [data-direcao="a"] .a-regua-alvo { position: absolute; top: -4px; width: 2px; height: 11px; background: var(--faint); }
        [data-direcao="a"] .a-regua-marcador { position: absolute; top: -3px; width: 9px; height: 9px; margin-left: -4.5px; border-radius: 50%; background: var(--accent); border: 2px solid var(--panel); transition: left 200ms cubic-bezier(0.34, 1.56, 0.64, 1), transform 150ms ease; }
        [data-direcao="a"] .a-regua-marcador.a-fora { background: var(--a-excesso); }
        [data-direcao="a"] .a-kpi:hover .a-regua-marcador { transform: scale(1.35); }
        [data-direcao="a"] .a-kpi:hover .a-regua-tick { animation: a-varredura 500ms ease-out; }
        [data-direcao="a"] .a-regua-tick:nth-child(2) { animation-delay: 40ms; }
        [data-direcao="a"] .a-regua-tick:nth-child(3) { animation-delay: 80ms; }
        [data-direcao="a"] .a-regua-tick:nth-child(4) { animation-delay: 120ms; }
        [data-direcao="a"] .a-regua-tick:nth-child(5) { animation-delay: 160ms; }
        @keyframes a-varredura { 0% { background: var(--accent); height: 11px; top: -4px; } 100% { background: var(--border-strong); height: 7px; top: -2px; } }

        [data-direcao="a"] table tr:hover td { background: color-mix(in srgb, var(--accent) 6%, transparent); }
        [data-direcao="a"] table tr:hover .a-tick-valor { animation: a-tick 220ms ease; }
        @keyframes a-tick { 0% { transform: translateX(0); } 30% { transform: translateX(-1.5px); } 60% { transform: translateX(1px); } 100% { transform: translateX(0); } }

        [data-direcao="a"] .a-kanban-col { background: var(--panel); border-radius: 4px; box-shadow: var(--shadow); }
        [data-direcao="a"] .a-kanban-head { font-size: 10px; letter-spacing: 0.1em; padding: 9px 12px; border-bottom: 1px solid var(--border); color: var(--faint); display: flex; justify-content: space-between; }
        [data-direcao="a"] .a-kanban-card { margin: 8px; padding: 9px 10px; border: 1px solid var(--border); border-radius: 3px; border-left: 3px solid var(--card-cor, var(--border-strong)); font-size: 11.5px; transition: border-color 150ms ease, transform 150ms ease; }
        [data-direcao="a"] .a-kanban-card:hover { transform: translateX(2px); border-color: var(--card-cor, var(--border-strong)); }

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

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-8">
        <div className="text-[12px]" style={{ color: "var(--sub)" }}>
          Margem alvo: <span style={{ ...nums, color: "var(--text)", fontWeight: 600 }}>{(margemAlvoCliente * 100).toFixed(0)}%</span>
          {" · leitura de instrumento, faixa de tolerância marcada na régua abaixo de cada valor"}
        </div>

        <div className="grid grid-cols-4 gap-3">
          <KpiCalibre label="CMV médio dos pratos" valor={resumo.cmvMedio !== null ? `${resumo.cmvMedio.toFixed(1)}` : "—"} unidade="% da receita" pos={cmvPos} alvoPos={posicao(35, 15, 55)} foraDeFaixa={resumo.cmvMedio !== null && resumo.cmvMedio > 35} />
          <KpiCalibre label="Margem média atual" valor={resumo.margemMedia !== null ? `${resumo.margemMedia.toFixed(1)}` : "—"} unidade="%" pos={margemPos} alvoPos={posicao(resumo.margemAlvoMedia, 20, 80)} foraDeFaixa={resumo.margemMedia !== null && resumo.margemMedia < resumo.margemAlvoMedia} />
          <KpiCalibre label="Pratos abaixo da margem alvo" valor={String(resumo.abaixoDoAlvo)} unidade={`de ${resumo.comPreco.length} com preço`} pos={null} foraDeFaixa={resumo.abaixoDoAlvo > 0} />
          <KpiCalibre label={`Perda de estoque em ${resumo.nomeMes}`} valor={formatBRL(resumo.perdaTotalReais)} unidade={`${resumo.perdasDoMes.length} lote(s) no mês`} pos={null} foraDeFaixa={resumo.perdaTotalReais > 0} />
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

        <div className="grid grid-cols-[1.3fr_1fr] gap-6">
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
                        <td className="py-2.5 px-3 text-right a-tick-valor" style={{ ...nums, display: "inline-block" }}>{p.quantidade} {p.unidadeRendimento}</td>
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
    </div>
  );
}
