"use client";

import { useEffect, useState } from "react";
import { Space_Mono } from "next/font/google";
import { Cell, ReferenceLine, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { ChartTooltipCard } from "@/components/charts/ChartTooltipCard";
import { formatBRL } from "@/components/charts/format";
import { CHART_MARGIN } from "@/components/charts/theme";
import { resumoVisaoGeral } from "../_shared/resumoVisaoGeral";
import { NOME_RESTAURANTE, insumos, todasReceitas, processamentos, producoes, fechamentos, margemAlvoCliente } from "../fixtures";

const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"] });

const resumo = resumoVisaoGeral({ margemAlvoCliente, insumos, receitas: todasReceitas, processamentos, producoes, fechamentos });
const nums = { fontVariantNumeric: "tabular-nums" } as const;

const STATUS: Record<string, { rotulo: string; cor: string }> = {
  em_producao: { rotulo: "EM CURSO", cor: "#F0B429" },
  produzido: { rotulo: "OK", cor: "#35D687" },
  perda: { rotulo: "FALHA", cor: "#FF4D4D" },
};

function useRelogio() {
  const [t, setT] = useState("--:--:--");
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString("pt-BR", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

export default function ConceptTelemetria() {
  const relogio = useRelogio();
  const foraDoAlvo = resumo.margemMedia !== null && resumo.margemMedia < resumo.margemAlvoMedia;

  return (
    <div data-tele className={mono.className}>
      <style>{`
        [data-tele] {
          --bg: #06080C; --painel: #0D1219; --linha: #1B2530; --linha-forte: #2C3B4D;
          --texto: #E4EEF5; --sub: #7C93A8; --faint: #4B5D6F;
          --verde: #35D687; --amber: #F0B429; --vermelho: #FF4D4D; --ciano: #34D9E8;
          background: var(--bg); color: var(--texto); min-height: 100vh;
          background-image: repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 3px);
        }

        @keyframes tele-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
        @keyframes tele-varre { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes tele-tick { 0% { text-shadow: 0 0 0 transparent; } 100% { text-shadow: 0 0 16px currentColor; } }

        [data-tele] .t-topo { border-bottom: 1px solid var(--linha-forte); padding: 10px 24px; display: flex; align-items: center; justify-content: space-between; position: relative; overflow: hidden; }
        [data-tele] .t-topo::after { content: ""; position: absolute; bottom: -1px; left: 0; width: 40%; height: 1px; background: linear-gradient(90deg, transparent, var(--ciano), transparent); animation: tele-varre 3.5s linear infinite; }
        [data-tele] .t-marca { font-weight: 700; font-size: 14px; letter-spacing: 0.06em; }
        [data-tele] .t-live { display: flex; align-items: center; gap: 7px; font-size: 11px; color: var(--verde); letter-spacing: 0.1em; }
        [data-tele] .t-live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--verde); box-shadow: 0 0 8px var(--verde); animation: tele-blink 1.4s ease-in-out infinite; }
        [data-tele] .t-relogio { font-size: 12px; color: var(--sub); }

        [data-tele] .t-faixa { display: flex; border-bottom: 1px solid var(--linha-forte); }
        [data-tele] .t-faixa-item { flex: 1; padding: 16px 22px; border-right: 1px solid var(--linha); position: relative; }
        [data-tele] .t-faixa-item:last-child { border-right: none; }
        [data-tele] .t-faixa-item::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--barra-cor, var(--linha-forte)); }
        [data-tele] .t-faixa-rotulo { font-size: 10px; letter-spacing: 0.1em; color: var(--sub); text-transform: uppercase; }
        [data-tele] .t-faixa-valor { font-size: 34px; font-weight: 700; margin-top: 6px; line-height: 1; }
        [data-tele] .t-faixa-valor.t-verde { color: var(--verde); }
        [data-tele] .t-faixa-valor.t-amber { color: var(--amber); }
        [data-tele] .t-faixa-valor.t-vermelho { color: var(--vermelho); animation: tele-tick 700ms ease infinite alternate; }
        [data-tele] .t-faixa-sub { font-size: 10.5px; color: var(--faint); margin-top: 4px; }

        [data-tele] .t-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 1px; background: var(--linha-forte); }
        [data-tele] .t-painel { background: var(--painel); padding: 18px 22px; }
        [data-tele] .t-painel-titulo { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ciano); margin-bottom: 3px; display: flex; align-items: center; gap: 8px; }
        [data-tele] .t-painel-titulo::before { content: "▸"; }
        [data-tele] .t-painel-sub { font-size: 11px; color: var(--faint); margin-bottom: 14px; }

        [data-tele] .t-log { width: 100%; font-size: 11.5px; border-collapse: collapse; }
        [data-tele] .t-log th { text-align: left; font-size: 10px; letter-spacing: 0.06em; color: var(--faint); padding: 4px 8px; border-bottom: 1px solid var(--linha); }
        [data-tele] .t-log td { padding: 7px 8px; border-bottom: 1px solid var(--linha); }
        [data-tele] .t-log tr:hover td { background: rgba(52,217,232,0.05); }

        [data-tele] .t-estacao { border: 1px solid var(--linha); margin-bottom: 10px; }
        [data-tele] .t-estacao-head { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: rgba(255,255,255,0.02); font-size: 10.5px; letter-spacing: 0.06em; }
        [data-tele] .t-estacao-barra { height: 3px; background: var(--linha); position: relative; }
        [data-tele] .t-estacao-barra-fill { position: absolute; inset: 0; }
        [data-tele] .t-item { display: flex; justify-content: space-between; align-items: center; padding: 7px 10px; font-size: 11px; border-top: 1px solid var(--linha); }
        [data-tele] .t-item-status { font-size: 9.5px; font-weight: 700; letter-spacing: 0.05em; padding: 2px 7px; border-radius: 2px; }

        [data-tele] .t-rodape { padding: 10px 24px; border-top: 1px solid var(--linha-forte); font-size: 10.5px; color: var(--faint); display: flex; justify-content: space-between; }
      `}</style>

      <header className="t-topo">
        <div className="t-marca">FICHA://PAINEL <span style={{ color: "var(--faint)", fontWeight: 400 }}>/ {NOME_RESTAURANTE.toUpperCase()}</span></div>
        <div className="t-live"><span className="t-live-dot" />AO VIVO</div>
        <div className="t-relogio">{relogio}</div>
      </header>

      <div className="t-faixa">
        <div className="t-faixa-item" style={{ ["--barra-cor" as string]: "var(--ciano)" }}>
          <div className="t-faixa-rotulo">CMV médio</div>
          <div className="t-faixa-valor" style={nums}>{resumo.cmvMedio !== null ? `${resumo.cmvMedio.toFixed(1)}%` : "—"}</div>
        </div>
        <div className="t-faixa-item" style={{ ["--barra-cor" as string]: foraDoAlvo ? "var(--vermelho)" : "var(--verde)" }}>
          <div className="t-faixa-rotulo">Margem média</div>
          <div className={`t-faixa-valor ${foraDoAlvo ? "t-vermelho" : "t-verde"}`} style={nums}>{resumo.margemMedia !== null ? `${resumo.margemMedia.toFixed(1)}%` : "—"}</div>
          <div className="t-faixa-sub">ALVO {resumo.margemAlvoMedia.toFixed(0)}%</div>
        </div>
        <div className="t-faixa-item" style={{ ["--barra-cor" as string]: resumo.abaixoDoAlvo > 0 ? "var(--amber)" : "var(--verde)" }}>
          <div className="t-faixa-rotulo">Abaixo do alvo</div>
          <div className={`t-faixa-valor ${resumo.abaixoDoAlvo > 0 ? "t-amber" : "t-verde"}`} style={nums}>{resumo.abaixoDoAlvo}<span style={{ fontSize: 15, color: "var(--faint)" }}> / {resumo.comPreco.length}</span></div>
        </div>
        <div className="t-faixa-item" style={{ ["--barra-cor" as string]: resumo.perdaTotalReais > 0 ? "var(--vermelho)" : "var(--verde)" }}>
          <div className="t-faixa-rotulo">Perda · {resumo.nomeMes}</div>
          <div className={`t-faixa-valor ${resumo.perdaTotalReais > 0 ? "t-vermelho" : "t-verde"}`} style={nums}>{formatBRL(resumo.perdaTotalReais)}</div>
        </div>
      </div>

      <div className="t-grid">
        <div className="t-painel">
          <div className="t-painel-titulo">ENGENHARIA_CARDAPIO.STREAM</div>
          <div className="t-painel-sub">margem × volume vendido, tempo real</div>
          <ChartFrame vazio={resumo.comPreco.length === 0} tituloVazio="sem dados" dicaVazio="cadastre preço de venda">
            <ScatterChart margin={CHART_MARGIN}>
              <XAxis type="number" dataKey="qtdVendida" domain={[0, resumo.xMax]} tick={{ fontSize: 10, fill: "var(--faint)", fontFamily: mono.style.fontFamily }} tickLine={false} axisLine={{ stroke: "var(--linha)" }} />
              <YAxis type="number" dataKey="margemPct" domain={[resumo.yMin, resumo.yMax]} tick={{ fontSize: 10, fill: "var(--faint)", fontFamily: mono.style.fontFamily }} tickLine={false} axisLine={{ stroke: "var(--linha)" }} width={34} tickFormatter={(v) => `${v}%`} />
              <ReferenceLine y={resumo.margemAlvoMedia} stroke="var(--ciano)" strokeDasharray="2 3" strokeWidth={1} />
              <Tooltip content={({ payload }) => {
                if (!payload || !payload.length) return null;
                const p = payload[0].payload as (typeof resumo.comPreco)[number];
                return <ChartTooltipCard titulo={p.receita.nomePrato} linhas={[{ rotulo: "Margem", valor: `${(p.margemPct as number).toFixed(1)}%`, cor: p.abaixoDoAlvo ? "var(--vermelho)" : "var(--verde)" }]} />;
              }} />
              <Scatter data={resumo.comPreco} isAnimationActive={false}>
                {resumo.comPreco.map((p) => (
                  <Cell key={p.receita.id} fill={p.abaixoDoAlvo ? "#FF4D4D" : "#35D687"} stroke="var(--painel)" strokeWidth={2} />
                ))}
              </Scatter>
            </ScatterChart>
          </ChartFrame>

          <div style={{ marginTop: 18 }}>
            <div className="t-painel-titulo">PERDAS_RECENTES.LOG</div>
            <table className="t-log">
              <thead><tr><th>LOTE</th><th>PRATO</th><th>QTD</th><th>MOTIVO</th></tr></thead>
              <tbody>
                {resumo.perdasRecentes.map((p) => (
                  <tr key={p.id}>
                    <td style={{ color: "var(--ciano)" }}>{p.lote}</td>
                    <td>{p.nomeReceita}</td>
                    <td style={nums}>{p.quantidade} {p.unidadeRendimento}</td>
                    <td style={{ color: "var(--vermelho)" }}>{p.motivoPerda ?? "—"}</td>
                  </tr>
                ))}
                {resumo.perdasRecentes.length === 0 && (
                  <tr><td colSpan={4} style={{ color: "var(--faint)", textAlign: "center", padding: 14 }}>NENHUM REGISTRO</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="t-painel">
          <div className="t-painel-titulo">PRODUCAO_AGORA.FEED</div>
          <div className="t-painel-sub">estações, nível de carga ao vivo</div>
          {(["em_producao", "produzido", "perda"] as const).map((status) => {
            const itens = producoes.filter((p) => p.status === status);
            const info = STATUS[status];
            const nivel = Math.min(100, (itens.length / 6) * 100);
            return (
              <div key={status} className="t-estacao">
                <div className="t-estacao-head">
                  <span>{info.rotulo}</span>
                  <span style={{ color: info.cor }}>{itens.length}</span>
                </div>
                <div className="t-estacao-barra"><div className="t-estacao-barra-fill" style={{ width: `${nivel}%`, background: info.cor }} /></div>
                {itens.slice(0, 3).map((it) => (
                  <div key={it.id} className="t-item">
                    <div>
                      <div>{it.nomeReceita}</div>
                      <div style={{ color: "var(--faint)", fontSize: 9.5 }}>{it.lote}</div>
                    </div>
                    <span className="t-item-status" style={{ color: info.cor, border: `1px solid ${info.cor}` }}>{info.rotulo}</span>
                  </div>
                ))}
                {itens.length === 0 && <div className="t-item" style={{ color: "var(--faint)" }}>sem lotes</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="t-rodape">
        <span>FICHA-TECNICA-CORE v1 · região sul-1</span>
        <span>última sincronização: {relogio}</span>
      </div>
    </div>
  );
}
