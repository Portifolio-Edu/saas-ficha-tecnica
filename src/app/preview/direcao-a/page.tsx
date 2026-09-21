"use client";

import { useEffect, useRef, useState } from "react";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Cell, ReferenceArea, ReferenceLine, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { ChartTooltipCard } from "@/components/charts/ChartTooltipCard";
import { formatBRL, formatPercentEixo } from "@/components/charts/format";
import { axisLineStyle, axisTickStyle, CHART_MARGIN } from "@/components/charts/theme";
import { resumoVisaoGeral } from "../_shared/resumoVisaoGeral";
import { NOME_RESTAURANTE, insumos, todasReceitas, processamentos, producoes, fechamentos, margemAlvoCliente } from "../fixtures";

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const numsA = { fontFamily: plexMono.style.fontFamily, fontVariantNumeric: "tabular-nums" } as const;

const resumo = resumoVisaoGeral({ margemAlvoCliente, insumos, receitas: todasReceitas, processamentos, producoes, fechamentos });

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/** Ease-out com leve overshoot -- ponteiro físico se assentando, nunca fade, nunca instantâneo. */
function easeBackOut(t: number, s = 1.70158) {
  const p = t - 1;
  return 1 + (s + 1) * p * p * p + s * p * p;
}

function useValorAssentado(alvo: number, ms = 850) {
  const [valor, setValor] = useState(0);
  const reduzido = useRef(false);
  useEffect(() => {
    if (typeof window !== "undefined") reduzido.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduzido.current) {
      setValor(alvo);
      return;
    }
    let raf = 0;
    const inicio = performance.now();
    function tick(agora: number) {
      const t = clamp((agora - inicio) / ms, 0, 1);
      setValor(alvo * easeBackOut(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [alvo, ms]);
  return valor;
}

function IconAlvo({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  );
}

function IconAlerta({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M12 3.5 21.5 20h-19L12 3.5Z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17.3" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Leitura calibrada -- assinatura da direção. Todo valor com meta/faixa é
 * régua, não card com número solto: trilho, zona de risco impressa (só
 * aparece a --sinal onde há risco real), marca de alvo e ponteiro que se
 * assenta com overshoot físico, nunca fade.
 */
function LeituraCalibrada({
  rotulo,
  valor,
  sufixo,
  min,
  max,
  alvo,
  direcaoBoa,
  tamanho = "secundario",
}: {
  rotulo: string;
  valor: number | null;
  sufixo: string;
  min: number;
  max: number;
  alvo: number;
  direcaoBoa: "acima" | "abaixo";
  tamanho?: "hero" | "secundario";
}) {
  const valorSeguro = valor ?? min;
  const foraDeEspec = valor !== null && (direcaoBoa === "acima" ? valor < alvo : valor > alvo);
  const posValor = clamp(((valorSeguro - min) / (max - min)) * 100, 0, 100);
  const posAlvo = clamp(((alvo - min) / (max - min)) * 100, 0, 100);
  const posAnimada = useValorAssentado(posValor);
  const numeroAnimado = useValorAssentado(valor ?? 0);

  const zonaInicio = direcaoBoa === "acima" ? 0 : posAlvo;
  const zonaFim = direcaoBoa === "acima" ? posAlvo : 100;

  return (
    <div className={tamanho === "hero" ? "a-leitura a-leitura-hero" : "a-leitura"}>
      <div className="a-leitura-topo">
        <div className="a-leitura-rotulo">{rotulo}</div>
        <div className={`a-leitura-valor ${foraDeEspec ? "a-sinal" : ""}`} style={numsA}>
          {valor !== null ? numeroAnimado.toFixed(1) : "—"}<span className="a-leitura-sufixo">{sufixo}</span>
        </div>
      </div>
      <div className="a-regua">
        <div className="a-regua-trilho" />
        <div className="a-regua-zona" style={{ left: `${zonaInicio}%`, width: `${zonaFim - zonaInicio}%` }} />
        <div className="a-regua-alvo" style={{ left: `${posAlvo}%` }} />
        <div className={`a-regua-ponteiro ${foraDeEspec ? "a-sinal" : ""}`} style={{ left: `${posAnimada}%` }} />
      </div>
      <div className="a-leitura-legenda">
        <span className="a-leitura-legenda-item"><IconAlvo /> alvo {alvo.toFixed(0)}{sufixo}</span>
      </div>
    </div>
  );
}

const COLUNAS_ESTACAO: { status: "em_producao" | "produzido" | "perda"; rotulo: string; risco: boolean }[] = [
  { status: "em_producao", rotulo: "Em processo", risco: false },
  { status: "produzido", rotulo: "Concluído", risco: false },
  { status: "perda", rotulo: "Rejeitado", risco: true },
];

export default function DirecaoA() {
  const [tema, setTema] = useState<"light" | "dark">("dark");

  const abaixoNum = useValorAssentado(resumo.abaixoDoAlvo);
  const perdaNum = useValorAssentado(resumo.perdaTotalReais);

  return (
    <div data-direcao="a" data-theme={tema} className={plexSans.className} style={{ background: "var(--fundo)", color: "var(--tinta)", minHeight: "100vh" }}>
      <style>{`
        [data-direcao="a"][data-theme="light"] {
          --fundo: #FAFAFA; --tinta: #15161B; --sinal: #FF3B1F;
          --sub: color-mix(in srgb, var(--tinta) 58%, var(--fundo));
          --faint: color-mix(in srgb, var(--tinta) 38%, var(--fundo));
          --painel: color-mix(in srgb, var(--tinta) 2.5%, var(--fundo));
          --linha: color-mix(in srgb, var(--tinta) 10%, transparent);
          --linha-forte: color-mix(in srgb, var(--tinta) 22%, transparent);
        }
        [data-direcao="a"][data-theme="dark"] {
          --fundo: #15161B; --tinta: #FAFAFA; --sinal: #FF3B1F;
          --sub: color-mix(in srgb, var(--tinta) 58%, var(--fundo));
          --faint: color-mix(in srgb, var(--tinta) 38%, var(--fundo));
          --painel: color-mix(in srgb, var(--tinta) 4%, var(--fundo));
          --linha: color-mix(in srgb, var(--tinta) 12%, transparent);
          --linha-forte: color-mix(in srgb, var(--tinta) 24%, transparent);
        }
        [data-direcao="a"] { font-family: ${plexSans.style.fontFamily}; letter-spacing: 0; }
        [data-direcao="a"] .a-mono { font-family: ${plexMono.style.fontFamily}; }

        [data-direcao="a"] .a-topo { border-bottom: 1px solid var(--linha); }
        [data-direcao="a"] .a-marca { font-weight: 600; font-size: 13px; }
        [data-direcao="a"] .a-restaurante { font-family: ${plexMono.style.fontFamily}; font-size: 11px; letter-spacing: 0.04em; color: var(--sub); border: 1px solid var(--linha-forte); padding: 3px 9px; border-radius: 2px; }
        [data-direcao="a"] .a-toggle { display: flex; border: 1px solid var(--linha-forte); border-radius: 2px; overflow: hidden; }
        [data-direcao="a"] .a-toggle button { padding: 5px 11px; font-size: 10.5px; letter-spacing: 0.06em; font-weight: 600; color: var(--faint); }
        [data-direcao="a"] .a-toggle button.ativo { background: var(--tinta); color: var(--fundo); }

        /* Painel: sem sombra -- separação é linha fina, nunca elevação. */
        [data-direcao="a"] .a-painel { background: var(--painel); border: 1px solid var(--linha); border-radius: 2px; }

        /* Leitura calibrada -- a régua é a unidade central da direção. */
        [data-direcao="a"] .a-leitura { padding: 20px 22px; }
        [data-direcao="a"] .a-leitura-topo { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
        [data-direcao="a"] .a-leitura-rotulo { font-size: 12.5px; color: var(--sub); font-weight: 500; }
        [data-direcao="a"] .a-leitura-valor { font-weight: 600; text-align: right; white-space: nowrap; font-size: 26px; }
        [data-direcao="a"] .a-leitura-valor.a-sinal { color: var(--sinal); }
        [data-direcao="a"] .a-leitura-sufixo { font-size: 0.55em; margin-left: 2px; color: var(--faint); }
        [data-direcao="a"] .a-leitura-hero { padding: 30px 32px 26px; }
        [data-direcao="a"] .a-leitura-hero .a-leitura-rotulo { font-size: 14px; }
        [data-direcao="a"] .a-leitura-hero .a-leitura-valor { font-size: 72px; }
        [data-direcao="a"] .a-leitura-hero .a-regua-trilho { height: 3px; }
        [data-direcao="a"] .a-leitura-hero .a-regua { height: 20px; }
        [data-direcao="a"] .a-leitura-hero .a-regua-ponteiro { width: 4px; height: 20px; margin-left: -2px; }

        [data-direcao="a"] .a-regua { position: relative; height: 14px; }
        [data-direcao="a"] .a-regua-trilho { position: absolute; left: 0; right: 0; top: 50%; height: 2px; margin-top: -1px; background: var(--linha-forte); }
        [data-direcao="a"] .a-regua-zona { position: absolute; top: 50%; height: 6px; margin-top: -3px; background: color-mix(in srgb, var(--sinal) 12%, transparent); }
        [data-direcao="a"] .a-regua-alvo { position: absolute; top: -3px; bottom: -3px; width: 1px; background: var(--tinta); }
        [data-direcao="a"] .a-regua-alvo::after { content: ""; position: absolute; top: -3px; left: 50%; width: 5px; height: 5px; margin-left: -2.5px; background: var(--tinta); border-radius: 50%; }
        [data-direcao="a"] .a-regua-ponteiro { position: absolute; top: 50%; width: 3px; height: 14px; margin-top: -7px; margin-left: -1.5px; background: var(--tinta); border-radius: 1px; transition: left 850ms cubic-bezier(0.34, 1.56, 0.64, 1); }
        [data-direcao="a"] .a-regua-ponteiro.a-sinal { background: var(--sinal); }

        [data-direcao="a"] .a-leitura-legenda { margin-top: 10px; display: flex; gap: 14px; }
        [data-direcao="a"] .a-leitura-legenda-item { display: flex; align-items: center; gap: 5px; font-size: 10.5px; letter-spacing: 0.03em; color: var(--faint); }

        /* Leituras secundárias sem faixa contínua -- readout mecânico simples. */
        [data-direcao="a"] .a-readout { padding: 16px 20px; display: flex; align-items: baseline; justify-content: space-between; }
        [data-direcao="a"] .a-readout-rotulo { font-size: 12.5px; color: var(--sub); }
        [data-direcao="a"] .a-readout-valor { font-size: 22px; font-weight: 600; text-align: right; display: flex; align-items: center; gap: 6px; }
        [data-direcao="a"] .a-readout-valor.a-sinal { color: var(--sinal); }
        [data-direcao="a"] .a-readout-sub { font-size: 11px; color: var(--faint); font-weight: 400; margin-left: 4px; }

        [data-direcao="a"] table tr:hover td { background: color-mix(in srgb, var(--tinta) 4%, transparent); }
        [data-direcao="a"] td, [data-direcao="a"] th { border-color: var(--linha); }

        /* Estação (kanban): indicador mecânico de nível, não tag colorida. */
        [data-direcao="a"] .a-estacao-head { padding: 10px 12px; border-bottom: 1px solid var(--linha); display: flex; flex-direction: column; gap: 7px; }
        [data-direcao="a"] .a-estacao-titulo { display: flex; justify-content: space-between; align-items: baseline; font-size: 11.5px; font-weight: 500; }
        [data-direcao="a"] .a-estacao-nivel { display: flex; gap: 2px; }
        [data-direcao="a"] .a-estacao-seg { flex: 1; height: 4px; background: var(--linha-forte); }
        [data-direcao="a"] .a-estacao-seg.a-cheio { background: var(--tinta); }
        [data-direcao="a"] .a-estacao-seg.a-cheio.a-sinal { background: var(--sinal); }
        [data-direcao="a"] .a-estacao-item { padding: 9px 12px; border-bottom: 1px solid var(--linha); font-size: 11.5px; }
        [data-direcao="a"] .a-estacao-item:last-child { border-bottom: none; }

        @media (prefers-reduced-motion: reduce) {
          [data-direcao="a"] * { animation: none !important; transition: none !important; }
        }
      `}</style>

      <header className="a-topo flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-4">
          <div className="a-marca">Ficha Técnica</div>
          <div className="a-restaurante">{NOME_RESTAURANTE.toUpperCase()}</div>
        </div>
        <div className="a-toggle">
          <button className={tema === "light" ? "ativo" : ""} onClick={() => setTema("light")}>Claro</button>
          <button className={tema === "dark" ? "ativo" : ""} onClick={() => setTema("dark")}>Escuro</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-10 space-y-6">
        {/* Uma leitura domina a hierarquia da tela; a outra recebe o mesmo
            tratamento de régua, em escala menor -- nunca duas competindo. */}
        <div className="a-painel">
          <LeituraCalibrada rotulo="Margem média dos pratos" valor={resumo.margemMedia} sufixo="%" min={0} max={100} alvo={resumo.margemAlvoMedia} direcaoBoa="acima" tamanho="hero" />
        </div>
        <div className="a-painel">
          <LeituraCalibrada rotulo="CMV médio dos pratos" valor={resumo.cmvMedio} sufixo="%" min={0} max={60} alvo={35} direcaoBoa="abaixo" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="a-painel a-readout">
            <div className="a-readout-rotulo">Pratos abaixo da margem alvo</div>
            <div className={`a-readout-valor ${resumo.abaixoDoAlvo > 0 ? "a-sinal" : ""}`} style={numsA}>
              {resumo.abaixoDoAlvo > 0 && <IconAlerta />}
              {abaixoNum.toFixed(0)}<span className="a-readout-sub">de {resumo.comPreco.length}</span>
            </div>
          </div>
          <div className="a-painel a-readout">
            <div className="a-readout-rotulo">Perda de estoque em {resumo.nomeMes}</div>
            <div className={`a-readout-valor ${resumo.perdaTotalReais > 0 ? "a-sinal" : ""}`} style={numsA}>
              {resumo.perdaTotalReais > 0 && <IconAlerta />}
              {formatBRL(perdaNum)}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-[13px] font-semibold mb-3">Engenharia de cardápio</h2>
          <div className="a-painel p-6">
            <ChartFrame vazio={resumo.comPreco.length === 0} tituloVazio="Nenhum prato com preço de venda cadastrado ainda." dicaVazio="Cadastre o preço de venda em Receitas & Fichas pra esse gráfico começar a preencher.">
              <ScatterChart margin={CHART_MARGIN}>
                <XAxis type="number" dataKey="qtdVendida" name="Vendas" domain={[0, resumo.xMax]} tick={{ ...axisTickStyle, fontFamily: plexMono.style.fontFamily }} tickLine={false} axisLine={axisLineStyle} label={{ value: "Vendas no período", position: "insideBottom", offset: -5, fontSize: 11, fill: "var(--faint)" }} />
                <YAxis type="number" dataKey="margemPct" name="Margem %" domain={[resumo.yMin, resumo.yMax]} tick={{ ...axisTickStyle, fontFamily: plexMono.style.fontFamily }} tickLine={false} axisLine={axisLineStyle} width={40} tickFormatter={formatPercentEixo} />
                <ZAxis type="number" dataKey="qtdVendida" range={[160, 420]} />
                <ReferenceArea x1={0} x2={resumo.xMax} y1={resumo.yMin} y2={resumo.margemAlvoMedia} fill="var(--sinal)" fillOpacity={0.05} />
                <ReferenceLine y={resumo.margemAlvoMedia} stroke="var(--linha-forte)" strokeDasharray="2 3" strokeWidth={1.2} label={{ value: `ALVO ${resumo.margemAlvoMedia.toFixed(0)}%`, position: "insideBottomRight", fontSize: 10, fill: "var(--sub)" }} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ payload }) => {
                    if (!payload || !payload.length) return null;
                    const p = payload[0].payload as (typeof resumo.comPreco)[number];
                    return (
                      <ChartTooltipCard
                        titulo={p.receita.nomePrato}
                        linhas={[
                          { rotulo: "Margem", valor: `${(p.margemPct as number).toFixed(1)}%`, cor: p.abaixoDoAlvo ? "var(--sinal)" : "var(--tinta)", destaque: p.abaixoDoAlvo },
                          { rotulo: "Vendas no período", valor: String(p.qtdVendida) },
                          { rotulo: "CMV", valor: `${(p.cmvPct as number).toFixed(1)}%` },
                        ]}
                      />
                    );
                  }}
                />
                <Scatter data={resumo.comPreco}>
                  {resumo.comPreco.map((p) => (
                    <Cell key={p.receita.id} fill={p.abaixoDoAlvo ? "var(--sinal)" : "var(--tinta)"} stroke="var(--painel)" strokeWidth={2} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ChartFrame>
          </div>
        </div>

        <div>
          <h2 className="text-[13px] font-semibold mb-1">Perdas recentes</h2>
          <p className="text-[11.5px] mb-3" style={{ color: "var(--sub)" }}>Últimos lotes descartados, motivo registrado no ponto de origem.</p>
          <div className="a-painel">
            {resumo.perdasRecentes.length === 0 ? (
              <div className="py-8 text-center text-[12px]" style={{ color: "var(--faint)" }}>Nenhuma perda registrada ainda.</div>
            ) : (
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ color: "var(--faint)" }} className="text-left text-[10px] uppercase tracking-wide">
                    <th className="py-2.5 px-5 font-medium a-mono">Lote</th>
                    <th className="py-2.5 px-3 font-medium">Prato/preparo</th>
                    <th className="py-2.5 px-3 font-medium text-right a-mono">Qtd.</th>
                    <th className="py-2.5 px-5 font-medium">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.perdasRecentes.map((p) => (
                    <tr key={p.id} style={{ borderTop: "1px solid var(--linha)" }}>
                      <td className="py-2.5 px-5 font-medium a-mono">{p.lote}</td>
                      <td className="py-2.5 px-3">{p.nomeReceita}</td>
                      <td className="py-2.5 px-3 text-right a-mono">{p.quantidade} {p.unidadeRendimento}</td>
                      <td className="py-2.5 px-5" style={{ color: "var(--sinal)" }}>{p.motivoPerda ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-[13px] font-semibold mb-1">Produção agora</h2>
          <p className="text-[11.5px] mb-3" style={{ color: "var(--sub)" }}>Estações em curso hoje, com nível de carga.</p>
          <div className="grid grid-cols-3 gap-4">
            {COLUNAS_ESTACAO.map((col) => {
              const itens = producoes.filter((p) => p.status === col.status);
              const nivel = clamp(itens.length, 0, 5);
              return (
                <div key={col.status} className="a-painel">
                  <div className="a-estacao-head">
                    <div className="a-estacao-titulo">
                      <span>{col.rotulo}</span>
                      <span className="a-mono">{itens.length}</span>
                    </div>
                    <div className="a-estacao-nivel">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={`a-estacao-seg ${i < nivel ? "a-cheio" : ""} ${i < nivel && col.risco ? "a-sinal" : ""}`} />
                      ))}
                    </div>
                  </div>
                  {itens.slice(0, 3).map((it) => (
                    <div key={it.id} className="a-estacao-item">
                      <div style={{ fontWeight: 600 }}>{it.nomeReceita}</div>
                      <div className="a-mono" style={{ color: "var(--faint)", fontSize: 10.5, marginTop: 2 }}>{it.lote} · {it.quantidade} {it.unidadeRendimento}</div>
                    </div>
                  ))}
                  {itens.length === 0 && <div className="px-3 py-3 text-[11px]" style={{ color: "var(--faint)" }}>vazio</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
