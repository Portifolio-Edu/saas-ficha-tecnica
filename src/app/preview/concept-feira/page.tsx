"use client";

import { Baloo_2 } from "next/font/google";
import { Cell, ReferenceLine, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { ChartTooltipCard } from "@/components/charts/ChartTooltipCard";
import { formatBRL } from "@/components/charts/format";
import { CHART_MARGIN } from "@/components/charts/theme";
import { resumoVisaoGeral } from "../_shared/resumoVisaoGeral";
import { NOME_RESTAURANTE, insumos, todasReceitas, processamentos, producoes, fechamentos, margemAlvoCliente } from "../fixtures";

const baloo = Baloo_2({ subsets: ["latin"], weight: ["500", "600", "700", "800"] });

const resumo = resumoVisaoGeral({ margemAlvoCliente, insumos, receitas: todasReceitas, processamentos, producoes, fechamentos });
const nums = { fontVariantNumeric: "tabular-nums" } as const;

/** Tomate desenhado à mão -- personalidade, não ícone de linha neutro. */
function IlustraTomate({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path d="M32 12c2-4 6-6 10-5-2 3-3 5-3 7 4-1 8 0 10 3-3 1-5 2-6 4 6 3 9 9 9 16 0 12-9 21-22 21S8 49 8 37c0-7 3-13 9-16-1-2-3-3-6-4 2-3 6-4 10-3 0-2-1-4-3-7 4-1 8 1 10 5 1 0 3 0 4 0Z" fill="#C1442D" stroke="#7A2717" strokeWidth="2" strokeLinejoin="round" />
      <path d="M32 12v9" stroke="#4B7A2E" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 14c-3-3-7-4-10-2 2 3 5 4 8 4M32 14c3-3 7-4 10-2-2 3-5 4-8 4" stroke="#4B7A2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="#6FA349" />
      <ellipse cx="24" cy="34" rx="4" ry="3" fill="#E36A4E" opacity="0.7" />
    </svg>
  );
}
/** Chapéu de chef desenhado à mão. */
function IlustraChape({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path d="M18 30c-6 0-10-5-10-10s4-9 8-9c1-5 6-9 12-9s10 3 12 6c1-1 3-2 5-2 6 0 10 5 10 10 0 4-2 7-5 9 1 2 2 4 2 6 0 3-2 5-5 5H21c-3 0-5-2-5-5 0-1 0-2 1-3Z" fill="#F7F4EC" stroke="#2A2118" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M18 36h28l1 12a3 3 0 0 1-3 3H20a3 3 0 0 1-3-3Z" fill="#F7F4EC" stroke="#2A2118" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}
/** Faca e tábua desenhadas à mão. */
function IlustraFaca({ size = 46 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <rect x="8" y="30" width="48" height="20" rx="4" fill="#C68A4E" stroke="#7A5230" strokeWidth="2.2" />
      <path d="M14 30c2-10 10-18 22-20l16 8-8 12Z" fill="#D7DBDD" stroke="#4A5052" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M14 30 36 10" stroke="#4A5052" strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}

const COLUNAS_BANCA: { status: "em_producao" | "produzido" | "perda"; rotulo: string; cor: string; bg: string }[] = [
  { status: "em_producao", rotulo: "No fogo", cor: "#8A5A00", bg: "#FCEACB" },
  { status: "produzido", rotulo: "Pronto", cor: "#2D6A34", bg: "#DCF0DC" },
  { status: "perda", rotulo: "Descartado", cor: "#A3312B", bg: "#F7DAD6" },
];

export default function ConceptFeira() {
  return (
    <div data-feira className={baloo.className}>
      <style>{`
        [data-feira] {
          --azul: #1E5FA8; --azul-escuro: #123C6E; --creme: #FBF4E4; --branco: #FFFFFF;
          --mostarda: #E0A21A; --tomate: #C1442D; --oliva: #5C7A3A; --tinta: #2A2118;
          --sub: #6B5F4C;
          background: var(--creme); color: var(--tinta); min-height: 100vh;
        }
        [data-feira] .f-sans { font-family: var(--font-geist-sans), ui-sans-serif, sans-serif; }
        [data-feira] .f-mono { font-family: var(--font-geist-mono), ui-monospace, monospace; }

        /* Azulejo português -- textura real de identidade, não decoração vaga. */
        [data-feira] .f-azulejo {
          background-color: var(--azul);
          background-image:
            radial-gradient(circle at 0 0, transparent 18px, var(--azul) 19px),
            radial-gradient(circle at 40px 40px, transparent 18px, var(--azul) 19px),
            linear-gradient(45deg, var(--azul-escuro) 25%, transparent 25%, transparent 75%, var(--azul-escuro) 75%),
            linear-gradient(45deg, var(--azul-escuro) 25%, transparent 25%, transparent 75%, var(--azul-escuro) 75%);
          background-size: 40px 40px, 40px 40px, 40px 40px, 40px 40px;
          background-position: 0 0, 20px 20px, 0 0, 20px 20px;
        }

        [data-feira] .f-topo { background: var(--azul); color: var(--branco); border-bottom: 6px solid var(--mostarda); }
        [data-feira] .f-marca { font-weight: 800; font-size: 22px; letter-spacing: -0.01em; }
        [data-feira] .f-selo {
          background: var(--mostarda); color: var(--tinta); font-weight: 700; font-size: 12px;
          padding: 5px 14px; border-radius: 999px; transform: rotate(-3deg); display: inline-block;
          border: 2px solid var(--tinta);
        }

        /* Banca de feira -- toldo escalopado no topo do painel, não retângulo puro. */
        [data-feira] .f-banca {
          background: var(--branco); position: relative; border-radius: 4px 4px 18px 18px;
          box-shadow: 6px 6px 0 rgba(42,33,24,0.08);
          border: 3px solid var(--tinta);
        }
        [data-feira] .f-toldo {
          height: 26px; margin: -3px -3px 0;
          background-image: repeating-linear-gradient(90deg, var(--tomate) 0 32px, var(--branco) 32px 64px);
          clip-path: polygon(0% 0%, 100% 0%, 100% 55%, 93.75% 100%, 87.5% 55%, 81.25% 100%, 75% 55%, 68.75% 100%, 62.5% 55%, 56.25% 100%, 50% 55%, 43.75% 100%, 37.5% 55%, 31.25% 100%, 25% 55%, 18.75% 100%, 12.5% 55%, 6.25% 100%, 0% 55%);
          border-top: 3px solid var(--tinta);
        }
        [data-feira] .f-banca-corpo { padding: 22px 24px; }

        [data-feira] .f-medalha {
          width: 152px; height: 152px; border-radius: 50%; flex-shrink: 0;
          background: radial-gradient(circle at 35% 30%, #FFF6E0, var(--mostarda) 75%);
          border: 5px solid var(--tinta); display: flex; flex-direction: column; align-items: center; justify-content: center;
          box-shadow: inset 0 0 0 3px rgba(255,255,255,0.5);
        }
        [data-feira] .f-medalha-valor { font-weight: 800; font-size: 38px; line-height: 1; color: var(--tinta); }
        [data-feira] .f-medalha-rotulo { font-size: 11px; font-weight: 600; color: var(--azul-escuro); margin-top: 4px; text-align: center; max-width: 100px; }

        [data-feira] .f-placa {
          background: var(--branco); border: 3px solid var(--tinta); border-radius: 14px; padding: 14px 18px;
          box-shadow: 4px 4px 0 var(--tinta);
        }
        [data-feira] .f-placa-rotulo { font-size: 11.5px; font-weight: 600; color: var(--sub); }
        [data-feira] .f-placa-valor { font-weight: 800; font-size: 26px; margin-top: 2px; }
        [data-feira] .f-placa-valor.f-alerta { color: var(--tomate); }

        [data-feira] .f-tabela { width: 100%; font-family: var(--font-geist-sans), sans-serif; font-size: 13px; }
        [data-feira] .f-tabela th { text-align: left; font-size: 11px; text-transform: uppercase; color: var(--sub); font-weight: 700; padding: 6px 10px; }
        [data-feira] .f-tabela td { padding: 9px 10px; border-top: 2px dashed #E4D9BF; }

        [data-feira] .f-banca-mini { background: var(--branco); border: 3px solid var(--tinta); border-radius: 16px; overflow: hidden; }
        [data-feira] .f-banca-mini-head { padding: 8px 12px; font-weight: 700; font-size: 12.5px; display: flex; justify-content: space-between; align-items: center; }
        [data-feira] .f-item { margin: 8px; padding: 8px 10px; border-radius: 10px; font-family: var(--font-geist-sans), sans-serif; font-size: 11.5px; }

        [data-feira] .f-selo-pequeno { transform: rotate(-4deg); display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; border: 1.5px solid currentColor; }
      `}</style>

      <header className="f-topo flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-4">
          <div className="f-marca">🍅 Feira da Cozinha</div>
          <span className="f-selo">{NOME_RESTAURANTE}</span>
        </div>
        <div className="f-sans text-[12px]" style={{ opacity: 0.85 }}>hoje na banca</div>
      </header>

      <div className="f-azulejo px-8 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="f-banca">
            <div className="f-toldo" />
            <div className="f-banca-corpo flex items-center gap-8">
              <div className="f-medalha">
                <div className="f-medalha-valor f-sans" style={nums}>{resumo.margemMedia !== null ? `${resumo.margemMedia.toFixed(0)}%` : "—"}</div>
                <div className="f-medalha-rotulo">margem média do cardápio</div>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-3">
                <div className="f-placa">
                  <div className="f-placa-rotulo">CMV médio</div>
                  <div className="f-placa-valor f-sans" style={nums}>{resumo.cmvMedio !== null ? `${resumo.cmvMedio.toFixed(1)}%` : "—"}</div>
                </div>
                <div className="f-placa">
                  <div className="f-placa-rotulo">Abaixo do alvo</div>
                  <div className={`f-placa-valor f-sans ${resumo.abaixoDoAlvo > 0 ? "f-alerta" : ""}`} style={nums}>{resumo.abaixoDoAlvo}</div>
                </div>
                <div className="f-placa">
                  <div className="f-placa-rotulo">Perda em {resumo.nomeMes}</div>
                  <div className={`f-placa-valor f-sans ${resumo.perdaTotalReais > 0 ? "f-alerta" : ""}`} style={nums}>{formatBRL(resumo.perdaTotalReais)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-8">
        <div className="flex items-start gap-6">
          <IlustraTomate />
          <div className="flex-1">
            <h2 className="text-[19px] font-extrabold mb-1">Engenharia de cardápio</h2>
            <p className="f-sans text-[12.5px] mb-3" style={{ color: "var(--sub)" }}>Margem por prato contra volume vendido. Cada bolinha é um prato na banca.</p>
            <div className="f-placa" style={{ padding: 16 }}>
              <ChartFrame vazio={resumo.comPreco.length === 0} tituloVazio="Nenhum prato com preço cadastrado." dicaVazio="Cadastre o preço de venda.">
                <ScatterChart margin={CHART_MARGIN}>
                  <XAxis type="number" dataKey="qtdVendida" domain={[0, resumo.xMax]} tick={{ fontSize: 10.5, fill: "var(--sub)" }} tickLine={false} axisLine={{ stroke: "#E4D9BF" }} />
                  <YAxis type="number" dataKey="margemPct" domain={[resumo.yMin, resumo.yMax]} tick={{ fontSize: 10.5, fill: "var(--sub)" }} tickLine={false} axisLine={{ stroke: "#E4D9BF" }} width={36} tickFormatter={(v) => `${v}%`} />
                  <ReferenceLine y={resumo.margemAlvoMedia} stroke="var(--tomate)" strokeDasharray="4 4" strokeWidth={1.5} />
                  <Tooltip content={({ payload }) => {
                    if (!payload || !payload.length) return null;
                    const p = payload[0].payload as (typeof resumo.comPreco)[number];
                    return <ChartTooltipCard titulo={p.receita.nomePrato} linhas={[{ rotulo: "Margem", valor: `${(p.margemPct as number).toFixed(1)}%`, cor: p.abaixoDoAlvo ? "var(--tomate)" : "var(--oliva)" }]} />;
                  }} />
                  <Scatter data={resumo.comPreco} isAnimationActive={false}>
                    {resumo.comPreco.map((p, i) => (
                      <Cell key={p.receita.id} fill={p.abaixoDoAlvo ? "#C1442D" : ["#1E5FA8", "#E0A21A", "#5C7A3A", "#B0562F"][i % 4]} stroke="#2A2118" strokeWidth={1.5} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ChartFrame>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-6">
          <IlustraFaca />
          <div className="flex-1">
            <h2 className="text-[19px] font-extrabold mb-1">Perdas recentes</h2>
            <p className="f-sans text-[12.5px] mb-3" style={{ color: "var(--sub)" }}>O que caiu da banca no período.</p>
            <div className="f-placa" style={{ padding: 0, overflow: "hidden" }}>
              <table className="f-tabela">
                <thead><tr><th>Lote</th><th>Prato</th><th>Qtd.</th><th>Motivo</th></tr></thead>
                <tbody>
                  {resumo.perdasRecentes.map((p) => (
                    <tr key={p.id}>
                      <td className="f-mono">{p.lote}</td>
                      <td>{p.nomeReceita}</td>
                      <td className="f-mono">{p.quantidade} {p.unidadeRendimento}</td>
                      <td style={{ color: "var(--tomate)" }}>{p.motivoPerda ?? "—"}</td>
                    </tr>
                  ))}
                  {resumo.perdasRecentes.length === 0 && (
                    <tr><td colSpan={4} style={{ color: "var(--sub)", textAlign: "center", padding: 20 }}>Nenhuma perda registrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-6">
          <IlustraChape />
          <div className="flex-1">
            <h2 className="text-[19px] font-extrabold mb-1">Produção agora</h2>
            <p className="f-sans text-[12.5px] mb-3" style={{ color: "var(--sub)" }}>O que está na banca, no fogo e descartado.</p>
            <div className="grid grid-cols-3 gap-3">
              {COLUNAS_BANCA.map((col) => {
                const itens = producoes.filter((p) => p.status === col.status);
                return (
                  <div key={col.status} className="f-banca-mini">
                    <div className="f-banca-mini-head" style={{ background: col.bg, color: col.cor }}>
                      <span>{col.rotulo}</span><span className="f-sans" style={nums}>{itens.length}</span>
                    </div>
                    {itens.slice(0, 3).map((it) => (
                      <div key={it.id} className="f-item" style={{ background: "#FBF4E4" }}>
                        <div style={{ fontWeight: 700 }}>{it.nomeReceita}</div>
                        <div className="f-mono" style={{ color: "var(--sub)", fontSize: 10.5, marginTop: 2 }}>{it.lote} · {it.quantidade} {it.unidadeRendimento}</div>
                      </div>
                    ))}
                    {itens.length === 0 && <div className="f-item f-sans" style={{ color: "var(--sub)" }}>vazio</div>}
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
