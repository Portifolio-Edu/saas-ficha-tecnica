"use client";

import { useState } from "react";
import { Source_Serif_4, Roboto_Mono } from "next/font/google";
import { Cell, LabelList, ReferenceArea, ReferenceLine, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { ChartTooltipCard } from "@/components/charts/ChartTooltipCard";
import { formatBRL, formatPercentEixo } from "@/components/charts/format";
import { axisLineStyle, axisTickStyle, CHART_MARGIN } from "@/components/charts/theme";
import { resumoVisaoGeral } from "../_shared/resumoVisaoGeral";
import { NOME_RESTAURANTE, insumos, todasReceitas, processamentos, producoes, fechamentos, margemAlvoCliente } from "../fixtures";

const serif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600", "700"], style: ["normal", "italic"] });
const mono = Roboto_Mono({ subsets: ["latin"], weight: ["400", "500", "700"] });

const resumo = resumoVisaoGeral({ margemAlvoCliente, insumos, receitas: todasReceitas, processamentos, producoes, fechamentos });

const numsC = { fontFamily: mono.style.fontFamily, fontVariantNumeric: "tabular-nums" } as const;

/** Carimbo: assinatura da direção -- clicar "confere" o número, batendo como um carimbo de fechamento, com o eco de carbono da segunda via. */
function ValorCarimbado({ valor, cor, tamanho = 30 }: { valor: string; cor?: string; tamanho?: number }) {
  const [rodada, setRodada] = useState(0);
  return (
    <span
      key={rodada}
      className="c-carimbo"
      data-carbono={valor}
      style={{ ...numsC, fontSize: tamanho, fontWeight: 700, color: cor ?? "var(--text)", cursor: "pointer" }}
      onClick={() => setRodada((r) => r + 1)}
      title="clique para conferir"
    >
      {valor}
    </span>
  );
}

const COLUNAS_KANBAN: { status: "em_producao" | "produzido" | "perda"; rotulo: string }[] = [
  { status: "em_producao", rotulo: "Em aberto" },
  { status: "produzido", rotulo: "Conferido" },
  { status: "perda", rotulo: "Baixado" },
];

export default function DirecaoC() {
  const [tema, setTema] = useState<"light" | "dark">("light");
  const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div data-direcao="c" data-theme={tema} className={serif.className} style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
      <style>{`
        [data-direcao="c"][data-theme="light"] {
          --bg: #E7E4D8; --panel: #F2F0E5; --border: #C9C4B0; --border-strong: #A69F87;
          --text: #1C1D18; --sub: #565946; --faint: #6B6E5B;
          --accent: #1F6A4C; --accent-soft: #DEE7DD; --danger: #A3312B; --danger-soft: #EFDAD3;
          --shadow: none;
        }
        [data-direcao="c"][data-theme="dark"] {
          --bg: #15140E; --panel: #1D1B13; --border: #322F22; --border-strong: #4A4632;
          --text: #EDE9DA; --sub: #A8A38D; --faint: #8C876F;
          --accent: #3FA57B; --accent-soft: #1E3226; --danger: #D46257; --danger-soft: #3A211B;
          --shadow: none;
        }
        [data-direcao="c"] { letter-spacing: 0; }
        [data-direcao="c"] .rounded-2xl { border-radius: 0 !important; }
        [data-direcao="c"] .c-mono { font-family: ${mono.style.fontFamily}; }

        [data-direcao="c"] .c-topo { border-top: 3px double var(--border-strong); border-bottom: 3px double var(--border-strong); }
        [data-direcao="c"] .c-marca { font-style: italic; font-weight: 600; font-size: 15px; }
        [data-direcao="c"] .c-restaurante { font-style: italic; color: var(--sub); font-size: 13px; }
        [data-direcao="c"] .c-data { font-family: ${mono.style.fontFamily}; font-size: 11px; color: var(--faint); letter-spacing: 0.04em; }
        [data-direcao="c"] .c-toggle a { font-style: italic; font-size: 12px; text-decoration: underline; text-underline-offset: 3px; color: var(--faint); cursor: pointer; }
        [data-direcao="c"] .c-toggle a.ativo { color: var(--text); font-weight: 600; }

        [data-direcao="c"] .c-linha-total { border-top: 1px solid var(--border-strong); border-bottom: 3px double var(--border-strong); background: var(--panel); }
        [data-direcao="c"] .c-kpi { padding: 16px 20px; border-right: 1px solid var(--border); }
        [data-direcao="c"] .c-kpi:last-child { border-right: none; }
        [data-direcao="c"] .c-kpi-label { font-style: italic; font-size: 12px; color: var(--sub); }
        [data-direcao="c"] .c-kpi-sub { font-family: ${mono.style.fontFamily}; font-size: 10px; color: var(--faint); margin-top: 4px; }

        [data-direcao="c"] .c-carimbo { position: relative; display: inline-block; }
        [data-direcao="c"] .c-carimbo::after {
          content: attr(data-carbono); position: absolute; inset: 0; color: var(--accent); opacity: 0;
        }
        [data-direcao="c"] .c-carimbo { animation: c-bate 180ms cubic-bezier(0.2, 1.6, 0.4, 1) both; }
        [data-direcao="c"] .c-carimbo::after { animation: c-eco 260ms ease-out both; }
        @keyframes c-bate { 0% { transform: scale(1.14) rotate(-1.2deg); } 60% { transform: scale(0.98) rotate(0.3deg); } 100% { transform: scale(1) rotate(0); } }
        @keyframes c-eco { 0% { opacity: 0.5; transform: translate(1.5px, 1.5px); } 100% { opacity: 0; transform: translate(3px, 3px); } }

        [data-direcao="c"] table { border-collapse: collapse; }
        [data-direcao="c"] thead th { border-bottom: 2px solid var(--border-strong); font-style: italic; font-weight: 500; }
        [data-direcao="c"] tbody tr { border-bottom: 1px solid var(--border); }
        [data-direcao="c"] tbody tr:hover { background: color-mix(in srgb, var(--accent) 5%, transparent); }

        [data-direcao="c"] .c-ledger-col { border: 1px solid var(--border); }
        [data-direcao="c"] .c-ledger-head { font-style: italic; font-size: 12px; padding: 8px 12px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; color: var(--sub); }
        [data-direcao="c"] .c-verbete { padding: 8px 34px 8px 12px; border-bottom: 1px solid var(--border); font-size: 12.5px; position: relative; }
        [data-direcao="c"] .c-verbete:last-child { border-bottom: none; }
        [data-direcao="c"] .c-selo { position: absolute; top: 8px; right: 10px; font-family: ${mono.style.fontFamily}; font-size: 8px; font-weight: 700; letter-spacing: 0.05em; border: 1.5px solid var(--selo-cor, var(--border-strong)); color: var(--selo-cor, var(--faint)); padding: 1px 4px; transform: rotate(-6deg); border-radius: 2px; }

        @media (prefers-reduced-motion: reduce) {
          [data-direcao="c"] .c-carimbo, [data-direcao="c"] .c-carimbo::after { animation: none !important; }
        }
      `}</style>

      <header className="c-topo flex items-center justify-between px-8 py-3">
        <div className="flex items-center gap-4">
          <span className="c-marca">Fechamento — Ficha Técnica</span>
          <span className="c-restaurante">{NOME_RESTAURANTE}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="c-data">{hoje}</span>
          <div className="c-toggle flex items-center gap-3">
            <a className={tema === "light" ? "ativo" : ""} onClick={() => setTema("light")}>Diurno</a>
            <a className={tema === "dark" ? "ativo" : ""} onClick={() => setTema("dark")}>Noturno</a>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-9">
        <div className="text-[12.5px] italic" style={{ color: "var(--sub)" }}>
          Margem alvo: <span className="c-mono not-italic" style={{ color: "var(--text)", fontWeight: 700 }}>{(margemAlvoCliente * 100).toFixed(0)}%</span>
          {" — clique em qualquer valor pra conferi-lo, como quem carimba uma linha do livro"}
        </div>

        <div className="c-linha-total grid grid-cols-4">
          <div className="c-kpi">
            <div className="c-kpi-label">CMV médio dos pratos</div>
            <div className="mt-1.5"><ValorCarimbado valor={resumo.cmvMedio !== null ? `${resumo.cmvMedio.toFixed(1)}%` : "—"} /></div>
          </div>
          <div className="c-kpi">
            <div className="c-kpi-label">Margem média atual</div>
            <div className="mt-1.5"><ValorCarimbado valor={resumo.margemMedia !== null ? `${resumo.margemMedia.toFixed(1)}%` : "—"} /></div>
          </div>
          <div className="c-kpi">
            <div className="c-kpi-label">Pratos abaixo da margem alvo</div>
            <div className="mt-1.5"><ValorCarimbado valor={String(resumo.abaixoDoAlvo)} cor={resumo.abaixoDoAlvo > 0 ? "var(--danger)" : undefined} /></div>
            <div className="c-kpi-sub">de {resumo.comPreco.length} com preço cadastrado</div>
          </div>
          <div className="c-kpi">
            <div className="c-kpi-label">Perda de estoque em {resumo.nomeMes}</div>
            <div className="mt-1.5"><ValorCarimbado valor={formatBRL(resumo.perdaTotalReais)} cor={resumo.perdaTotalReais > 0 ? "var(--danger)" : undefined} tamanho={26} /></div>
            <div className="c-kpi-sub">{resumo.perdasDoMes.length} lote(s) no mês</div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[15px] font-semibold italic">Engenharia de cardápio</h2>
            <div className="flex items-center gap-3 text-[11px] italic" style={{ color: "var(--faint)" }}>
              <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2" style={{ background: "var(--accent)" }} /> na margem alvo</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2" style={{ background: "var(--danger)" }} /> abaixo do alvo</span>
            </div>
          </div>
          <div className="p-6" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
            <ChartFrame vazio={resumo.comPreco.length === 0} tituloVazio="Nenhum prato com preço de venda cadastrado ainda." dicaVazio="Cadastre o preço de venda em Receitas & Fichas pra esse gráfico começar a preencher.">
              <ScatterChart margin={CHART_MARGIN}>
                <XAxis type="number" dataKey="qtdVendida" name="Vendas" domain={[0, resumo.xMax]} tick={{ ...axisTickStyle, fontFamily: mono.style.fontFamily }} tickLine={false} axisLine={axisLineStyle} label={{ value: "Vendas no período", position: "insideBottom", offset: -5, fontSize: 11, fill: "var(--faint)" }} />
                <YAxis type="number" dataKey="margemPct" name="Margem %" domain={[resumo.yMin, resumo.yMax]} tick={{ ...axisTickStyle, fontFamily: mono.style.fontFamily }} tickLine={false} axisLine={axisLineStyle} width={40} tickFormatter={formatPercentEixo} />
                <ZAxis type="number" dataKey="qtdVendida" range={[180, 480]} />
                <ReferenceArea x1={0} x2={resumo.xMax} y1={resumo.yMin} y2={resumo.margemAlvoMedia} fill="var(--danger)" fillOpacity={0.05} />
                <ReferenceLine y={resumo.margemAlvoMedia} stroke="var(--border-strong)" strokeDasharray="4 4" strokeWidth={1.2} label={{ value: `margem alvo ${resumo.margemAlvoMedia.toFixed(0)}%`, position: "insideBottomRight", fontSize: 10, fill: "var(--sub)" }} />
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
                  <LabelList
                    dataKey="receita.nomePrato"
                    content={(props) => {
                      const { x, y, value } = props as { x: number; y: number; value: string };
                      return (
                        <text x={x} y={y - 14} textAnchor="middle" fontSize={11} fontStyle="italic" fill="var(--text)">
                          {value}
                        </text>
                      );
                    }}
                  />
                </Scatter>
              </ScatterChart>
            </ChartFrame>
          </div>
        </div>

        <div className="grid grid-cols-[1.3fr_1fr] gap-6">
          <div>
            <h2 className="text-[15px] font-semibold italic mb-1">Perdas recentes</h2>
            <p className="text-[12px] italic mb-3" style={{ color: "var(--sub)" }}>Últimos lotes descartados, motivo registrado no verbete.</p>
            <div style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
              {resumo.perdasRecentes.length === 0 ? (
                <div className="py-8 text-center text-[12.5px] italic" style={{ color: "var(--faint)" }}>Nenhuma perda registrada ainda.</div>
              ) : (
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr style={{ color: "var(--faint)" }} className="text-left text-[11px]">
                      <th className="py-2.5 px-5 c-mono font-medium not-italic">Lote</th>
                      <th className="py-2.5 px-3 font-medium">Prato/preparo</th>
                      <th className="py-2.5 px-3 c-mono font-medium not-italic text-right">Quantidade</th>
                      <th className="py-2.5 px-5 font-medium">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumo.perdasRecentes.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 px-5 c-mono font-medium">{p.lote}</td>
                        <td className="py-2.5 px-3 italic">{p.nomeReceita}</td>
                        <td className="py-2.5 px-3 c-mono text-right">{p.quantidade} {p.unidadeRendimento}</td>
                        <td className="py-2.5 px-5" style={{ color: "var(--danger)" }}>{p.motivoPerda ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-[15px] font-semibold italic mb-1">Produção agora</h2>
            <p className="text-[12px] italic mb-3" style={{ color: "var(--sub)" }}>Lotes em curso hoje, por situação no livro.</p>
            <div className="grid grid-cols-3 gap-2">
              {COLUNAS_KANBAN.map((col) => {
                const itens = producoes.filter((p) => p.status === col.status);
                const cor = col.status === "produzido" ? "var(--accent)" : col.status === "perda" ? "var(--danger)" : "var(--faint)";
                const sigla = col.status === "produzido" ? "OK" : col.status === "perda" ? "BX" : "AB";
                return (
                  <div key={col.status} className="c-ledger-col">
                    <div className="c-ledger-head"><span>{col.rotulo}</span><span className="c-mono not-italic">{itens.length}</span></div>
                    {itens.slice(0, 3).map((it) => (
                      <div key={it.id} className="c-verbete">
                        <span className="c-selo" style={{ ["--selo-cor" as string]: cor }}>{sigla}</span>
                        <div style={{ fontWeight: 600 }}>{it.nomeReceita}</div>
                        <div className="c-mono not-italic" style={{ color: "var(--faint)", fontSize: 10, marginTop: 2 }}>{it.lote} · {it.quantidade} {it.unidadeRendimento}</div>
                      </div>
                    ))}
                    {itens.length === 0 && <div className="px-3 py-3 text-[11px] italic" style={{ color: "var(--faint)" }}>vazio</div>}
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
