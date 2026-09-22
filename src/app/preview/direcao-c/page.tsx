"use client";

import { useState } from "react";
import { Source_Serif_4, Roboto_Mono } from "next/font/google";
import { Cell, ReferenceLine, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { ChartTooltipCard } from "@/components/charts/ChartTooltipCard";
import { formatBRL, formatPercentEixo } from "@/components/charts/format";
import { axisLineStyle, axisTickStyle } from "@/components/charts/theme";
import { resumoVisaoGeral } from "../_shared/resumoVisaoGeral";
import { NOME_RESTAURANTE, insumos, todasReceitas, processamentos, producoes, fechamentos, margemAlvoCliente } from "../fixtures";

const serif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600", "700"], style: ["normal", "italic"] });
const mono = Roboto_Mono({ subsets: ["latin"], weight: ["400", "500", "700"] });

const resumo = resumoVisaoGeral({ margemAlvoCliente, insumos, receitas: todasReceitas, processamentos, producoes, fechamentos });

const numsC = { fontFamily: mono.style.fontFamily, fontVariantNumeric: "tabular-nums" } as const;

/** Carimbo: assinatura da direção -- clicar "confere" o número, batendo como um carimbo de fechamento, com o eco de carbono da segunda via. */
function ValorCarimbado({ valor, cor, tamanho = 20 }: { valor: string; cor?: string; tamanho?: number }) {
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

  // Momento de confiança total da direção: o selo de fechamento -- um
  // veredito grande e sem hesitação, não um número discreto entre outros.
  const fechaNoAlvo = resumo.margemMedia !== null && resumo.margemMedia >= resumo.margemAlvoMedia;
  const corSelo = fechaNoAlvo ? "var(--accent)" : "var(--danger)";
  const veredito = fechaNoAlvo ? "CONFERE" : "ATENÇÃO";

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

        /* Selo de fechamento -- o momento saturado e sem hesitação da direção. */
        [data-direcao="c"] .c-selo-grande {
          width: 220px; height: 220px; border-radius: 50%; flex-shrink: 0;
          border: 6px double var(--selo-cor); display: flex; flex-direction: column; align-items: center; justify-content: center;
          transform: rotate(-7deg); position: relative; cursor: pointer;
        }
        [data-direcao="c"] .c-selo-veredito { font-family: ${mono.style.fontFamily}; font-weight: 700; font-size: 26px; letter-spacing: 0.03em; color: var(--selo-cor); text-align: center; line-height: 1.15; }
        [data-direcao="c"] .c-selo-numero { font-family: ${mono.style.fontFamily}; font-weight: 700; font-size: 15px; color: var(--selo-cor); margin-top: 6px; opacity: 0.85; }
        [data-direcao="c"] .c-selo-grande.c-bate { animation: c-selo-bate 220ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes c-selo-bate { 0% { transform: rotate(-7deg) scale(1.1); } 60% { transform: rotate(-7deg) scale(0.97); } 100% { transform: rotate(-7deg) scale(1); } }
        [data-direcao="c"] .c-nota { font-style: italic; font-size: 11.5px; color: var(--sub); transform: rotate(-2deg); margin-top: 10px; text-align: center; max-width: 200px; }

        [data-direcao="c"] .c-recibo { flex: 1; }
        [data-direcao="c"] .c-recibo-item { display: flex; align-items: baseline; gap: 8px; padding: 10px 0; border-bottom: 1px dotted var(--border-strong); }
        [data-direcao="c"] .c-recibo-label { font-style: italic; font-size: 13px; color: var(--sub); white-space: nowrap; }
        [data-direcao="c"] .c-recibo-linha { flex: 1; border-bottom: 1px dotted var(--border); transform: translateY(-4px); }
        [data-direcao="c"] .c-recibo-sub { font-family: ${mono.style.fontFamily}; font-size: 10px; color: var(--faint); }

        [data-direcao="c"] .c-carimbo { position: relative; display: inline-block; }
        [data-direcao="c"] .c-carimbo::after { content: attr(data-carbono); position: absolute; inset: 0; color: var(--accent); opacity: 0; }
        [data-direcao="c"] .c-carimbo { animation: c-bate 180ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        [data-direcao="c"] .c-carimbo::after { animation: c-eco 260ms ease-out both; }
        @keyframes c-bate { 0% { transform: scale(1.14) rotate(-1.2deg); } 60% { transform: scale(0.98) rotate(0.3deg); } 100% { transform: scale(1) rotate(0); } }
        @keyframes c-eco { 0% { opacity: 0.5; transform: translate(1.5px, 1.5px); } 100% { opacity: 0; transform: translate(3px, 3px); } }

        [data-direcao="c"] table { border-collapse: collapse; }
        [data-direcao="c"] thead th { border-bottom: 2px solid var(--border-strong); font-style: italic; font-weight: 500; }
        [data-direcao="c"] tbody tr { border-bottom: 1px solid var(--border); }
        [data-direcao="c"] tbody tr:hover { background: color-mix(in srgb, var(--accent) 5%, transparent); }

        [data-direcao="c"] .c-ledger-col { border: 1px solid var(--border); }
        [data-direcao="c"] .c-ledger-head { font-style: italic; font-size: 11px; padding: 6px 10px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; color: var(--sub); }
        [data-direcao="c"] .c-verbete { padding: 6px 30px 6px 10px; border-bottom: 1px solid var(--border); font-size: 11px; position: relative; }
        [data-direcao="c"] .c-verbete:last-child { border-bottom: none; }
        [data-direcao="c"] .c-selo-mini { position: absolute; top: 6px; right: 8px; font-family: ${mono.style.fontFamily}; font-size: 7px; font-weight: 700; letter-spacing: 0.05em; border: 1.5px solid var(--selo-cor, var(--border-strong)); color: var(--selo-cor, var(--faint)); padding: 1px 4px; transform: rotate(-6deg); border-radius: 2px; }

        @media (prefers-reduced-motion: reduce) {
          [data-direcao="c"] .c-carimbo, [data-direcao="c"] .c-carimbo::after, [data-direcao="c"] .c-selo-grande { animation: none !important; }
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
        {/* Selo + recibo vertical -- primeira coisa da tela */}
        <div className="flex gap-10 items-start">
          <div className="flex flex-col items-center">
            <SeloFechamento veredito={veredito} numero={resumo.margemMedia !== null ? `${resumo.margemMedia.toFixed(1)}%` : "—"} cor={corSelo} />
            <div className="c-nota">nota: alvo {(margemAlvoCliente * 100).toFixed(0)}% de margem — {fechaNoAlvo ? "fechamento dentro do esperado" : "abrir exceção no relatório"}</div>
          </div>

          <div className="c-recibo pt-2">
            <div className="c-recibo-item">
              <span className="c-recibo-label">CMV médio dos pratos</span>
              <span className="c-recibo-linha" />
              <ValorCarimbado valor={resumo.cmvMedio !== null ? `${resumo.cmvMedio.toFixed(1)}%` : "—"} />
            </div>
            <div className="c-recibo-item">
              <span className="c-recibo-label">Pratos abaixo da margem alvo</span>
              <span className="c-recibo-linha" />
              <ValorCarimbado valor={String(resumo.abaixoDoAlvo)} cor={resumo.abaixoDoAlvo > 0 ? "var(--danger)" : undefined} />
              <span className="c-recibo-sub">de {resumo.comPreco.length}</span>
            </div>
            <div className="c-recibo-item">
              <span className="c-recibo-label">Perda de estoque em {resumo.nomeMes}</span>
              <span className="c-recibo-linha" />
              <ValorCarimbado valor={formatBRL(resumo.perdaTotalReais)} cor={resumo.perdaTotalReais > 0 ? "var(--danger)" : undefined} />
              <span className="c-recibo-sub">{resumo.perdasDoMes.length} lote(s)</span>
            </div>
          </div>
        </div>

        {/* Livro de perdas -- dominante, não o gráfico */}
        <div>
          <h2 className="text-[16px] font-semibold italic mb-1">Perdas recentes</h2>
          <p className="text-[12px] italic mb-3" style={{ color: "var(--sub)" }}>Últimos lotes descartados, motivo registrado no verbete.</p>
          <div style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
            {resumo.perdasRecentes.length === 0 ? (
              <div className="py-8 text-center text-[12.5px] italic" style={{ color: "var(--faint)" }}>Nenhuma perda registrada ainda.</div>
            ) : (
              <table className="w-full text-[13.5px]">
                <thead>
                  <tr style={{ color: "var(--faint)" }} className="text-left text-[11.5px]">
                    <th className="py-3 px-5 c-mono font-medium not-italic">Lote</th>
                    <th className="py-3 px-3 font-medium">Prato/preparo</th>
                    <th className="py-3 px-3 c-mono font-medium not-italic text-right">Quantidade</th>
                    <th className="py-3 px-5 font-medium">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.perdasRecentes.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 px-5 c-mono font-medium">{p.lote}</td>
                      <td className="py-3 px-3 italic">{p.nomeReceita}</td>
                      <td className="py-3 px-3 c-mono text-right">{p.quantidade} {p.unidadeRendimento}</td>
                      <td className="py-3 px-5" style={{ color: "var(--danger)" }}>{p.motivoPerda ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Gráfico pequeno + produção agora -- demovidos, apoio ao livro acima */}
        <div className="grid grid-cols-[1fr_1.4fr] gap-6">
          <div>
            <h2 className="text-[13px] font-semibold italic mb-1">Produção agora</h2>
            <div className="grid grid-cols-3 gap-1.5">
              {COLUNAS_KANBAN.map((col) => {
                const itens = producoes.filter((p) => p.status === col.status);
                const cor = col.status === "produzido" ? "var(--accent)" : col.status === "perda" ? "var(--danger)" : "var(--faint)";
                const sigla = col.status === "produzido" ? "OK" : col.status === "perda" ? "BX" : "AB";
                return (
                  <div key={col.status} className="c-ledger-col">
                    <div className="c-ledger-head"><span>{col.rotulo}</span><span className="c-mono not-italic">{itens.length}</span></div>
                    {itens.slice(0, 2).map((it) => (
                      <div key={it.id} className="c-verbete">
                        <span className="c-selo-mini" style={{ ["--selo-cor" as string]: cor }}>{sigla}</span>
                        <div style={{ fontWeight: 600 }}>{it.nomeReceita}</div>
                        <div className="c-mono not-italic" style={{ color: "var(--faint)", fontSize: 9.5, marginTop: 2 }}>{it.lote}</div>
                      </div>
                    ))}
                    {itens.length === 0 && <div className="px-2.5 py-2.5 text-[10.5px] italic" style={{ color: "var(--faint)" }}>vazio</div>}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-[13px] font-semibold italic mb-1">Engenharia de cardápio</h2>
            <div className="p-3" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
              <ChartFrame altura={200} vazio={resumo.comPreco.length === 0} tituloVazio="Nenhum prato com preço de venda cadastrado ainda." dicaVazio="Cadastre o preço de venda em Receitas & Fichas.">
                <ScatterChart margin={{ top: 10, right: 14, bottom: 4, left: 4 }}>
                  <XAxis type="number" dataKey="qtdVendida" domain={[0, resumo.xMax]} tick={{ ...axisTickStyle, fontFamily: mono.style.fontFamily, fontSize: 9 }} tickLine={false} axisLine={axisLineStyle} />
                  <YAxis type="number" dataKey="margemPct" domain={[resumo.yMin, resumo.yMax]} tick={{ ...axisTickStyle, fontFamily: mono.style.fontFamily, fontSize: 9 }} tickLine={false} axisLine={axisLineStyle} width={30} tickFormatter={formatPercentEixo} />
                  <ZAxis type="number" dataKey="qtdVendida" range={[70, 200]} />
                  <ReferenceLine y={resumo.margemAlvoMedia} stroke="var(--border-strong)" strokeDasharray="3 3" strokeWidth={1} />
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
                      <Cell key={p.receita.id} fill={p.abaixoDoAlvo ? "var(--danger)" : "var(--accent)"} stroke="var(--panel)" strokeWidth={1.5} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ChartFrame>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SeloFechamento({ veredito, numero, cor }: { veredito: string; numero: string; cor: string }) {
  const [rodada, setRodada] = useState(0);
  return (
    <div
      key={rodada}
      className={`c-selo-grande ${rodada > 0 ? "c-bate" : ""}`}
      style={{ ["--selo-cor" as string]: cor }}
      onClick={() => setRodada((r) => r + 1)}
      title="clique para reconferir o fechamento"
    >
      <div className="c-selo-veredito">{veredito}</div>
      <div className="c-selo-numero">{numero} MARGEM</div>
    </div>
  );
}
