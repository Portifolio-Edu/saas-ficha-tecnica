"use client";

import { Newsreader } from "next/font/google";
import { Cell, ReferenceLine, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltipCard } from "@/components/charts/ChartTooltipCard";
import { formatBRL } from "@/components/charts/format";
import { CHART_MARGIN } from "@/components/charts/theme";
import { resumoVisaoGeral } from "../_shared/resumoVisaoGeral";
import { NOME_RESTAURANTE, insumos, todasReceitas, processamentos, producoes, fechamentos, margemAlvoCliente } from "../fixtures";

const newsreader = Newsreader({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"] });

const resumo = resumoVisaoGeral({ margemAlvoCliente, insumos, receitas: todasReceitas, processamentos, producoes, fechamentos });
const nums = { fontVariantNumeric: "tabular-nums" } as const;

const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

export default function ConceptEditorial() {
  const foraDoAlvo = resumo.margemMedia !== null && resumo.margemMedia < resumo.margemAlvoMedia;

  return (
    <div data-editorial className={newsreader.className}>
      <style>{`
        [data-editorial] {
          --papel: #F7F4EC; --tinta: #1A1712; --sub: #746A58; --linha: #D8CFBC;
          --vinho: #6B2028; --oliva: #4C5B34; --mostarda: #A6791E;
          background: var(--papel); color: var(--tinta); min-height: 100vh;
        }
        [data-editorial] .e-sans { font-family: var(--font-geist-sans), ui-sans-serif, sans-serif; }
        [data-editorial] .e-mono { font-family: var(--font-geist-mono), ui-monospace, monospace; }

        [data-editorial] .e-masthead { border-bottom: 4px solid var(--tinta); padding: 18px 48px 14px; display: flex; align-items: baseline; justify-content: space-between; }
        [data-editorial] .e-titulo-revista { font-size: 30px; font-weight: 600; font-style: italic; letter-spacing: -0.01em; }
        [data-editorial] .e-kicker { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--sub); }

        [data-editorial] .e-capa { position: relative; padding: 0 48px; margin-top: 30px; min-height: 420px; }
        [data-editorial] .e-manchete {
          font-size: 168px; font-weight: 600; line-height: 0.82; letter-spacing: -0.04em; color: var(--vinho);
          position: relative; z-index: 2;
        }
        [data-editorial] .e-manchete-sufixo { font-size: 0.32em; font-style: italic; color: var(--tinta); margin-left: 6px; }
        [data-editorial] .e-manchete-legenda { font-size: 15px; font-style: italic; color: var(--sub); max-width: 260px; margin-top: 6px; }

        [data-editorial] .e-foto {
          position: absolute; top: -18px; right: 48px; width: 300px; height: 380px; z-index: 1;
          background: linear-gradient(160deg, var(--mostarda), var(--vinho) 85%);
          border-radius: 2px; box-shadow: 10px 14px 0 rgba(26,23,18,0.12);
          display: flex; align-items: flex-end; padding: 18px; transform: rotate(2deg);
        }
        [data-editorial] .e-foto-legenda { color: #F7F4EC; font-size: 12.5px; font-style: italic; line-height: 1.4; }

        [data-editorial] .e-flutuante {
          position: absolute; left: 48px; top: 340px; z-index: 3; background: var(--papel); border: 1.5px solid var(--tinta);
          padding: 16px 20px; max-width: 230px;
          box-shadow: 6px 6px 0 var(--mostarda);
        }
        [data-editorial] .e-flutuante-rotulo { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--sub); }
        [data-editorial] .e-flutuante-valor { font-size: 34px; font-weight: 600; margin-top: 2px; }
        [data-editorial] .e-flutuante-valor.e-alerta { color: var(--vinho); }

        [data-editorial] .e-corpo { padding: 20px 48px 60px; display: grid; grid-template-columns: 1fr 260px; gap: 40px; margin-top: 40px; }
        [data-editorial] .e-coluna h2 { font-size: 21px; font-weight: 600; font-style: italic; margin-bottom: 4px; }
        [data-editorial] .e-coluna p.e-legenda { font-size: 13px; color: var(--sub); font-style: italic; margin-bottom: 14px; max-width: 46ch; }
        [data-editorial] .e-dropcap::first-letter { font-size: 52px; float: left; line-height: 0.8; padding-right: 6px; padding-top: 4px; color: var(--vinho); font-weight: 600; }

        [data-editorial] .e-sidebar { border-left: 3px double var(--tinta); padding-left: 22px; }
        [data-editorial] .e-sidebar-titulo { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; margin-bottom: 10px; font-family: var(--font-geist-sans), sans-serif; }
        [data-editorial] .e-nota { display: flex; justify-content: space-between; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--linha); font-size: 12.5px; }
        [data-editorial] .e-nota:last-child { border-bottom: none; }
        [data-editorial] .e-nota-valor { font-family: var(--font-geist-mono), monospace; font-weight: 600; }

        [data-editorial] .e-errata { margin-top: 24px; }
        [data-editorial] .e-errata-titulo { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--sub); font-family: var(--font-geist-sans), sans-serif; margin-bottom: 8px; }
        [data-editorial] .e-errata-item { font-family: var(--font-geist-mono), monospace; font-size: 11.5px; padding: 7px 0; border-top: 1px dotted var(--linha); }
        [data-editorial] .e-errata-item b { color: var(--vinho); font-weight: 700; }

        [data-editorial] .e-producao { margin-top: 40px; padding: 0 48px 50px; }
        [data-editorial] .e-producao-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; border-top: 1.5px solid var(--tinta); border-bottom: 1.5px solid var(--tinta); }
        [data-editorial] .e-producao-col { padding: 14px 18px; border-right: 1px solid var(--linha); }
        [data-editorial] .e-producao-col:last-child { border-right: none; }
        [data-editorial] .e-producao-col-titulo { font-family: var(--font-geist-sans), sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--sub); margin-bottom: 8px; }
        [data-editorial] .e-producao-item { font-size: 13px; padding: 5px 0; }
        [data-editorial] .e-producao-item i { color: var(--sub); font-size: 11px; display: block; font-family: var(--font-geist-mono), monospace; font-style: normal; }
      `}</style>

      <header className="e-masthead">
        <div>
          <div className="e-kicker">Edição de cozinha · {hoje}</div>
          <div className="e-titulo-revista">Sala &amp; Fogão</div>
        </div>
        <div className="e-sans text-[11px]" style={{ color: "var(--sub)" }}>{NOME_RESTAURANTE}</div>
      </header>

      <div className="e-capa">
        <div className="e-manchete">
          {resumo.margemMedia !== null ? resumo.margemMedia.toFixed(0) : "—"}<span className="e-manchete-sufixo">% de margem</span>
        </div>
        <div className="e-manchete-legenda">A margem média do cardápio segue {foraDoAlvo ? "abaixo" : "acima"} do alvo de {resumo.margemAlvoMedia.toFixed(0)}% neste fechamento.</div>

        <div className="e-foto">
          <div className="e-foto-legenda">Prato de maior faturamento do período, direto da cozinha.</div>
        </div>

        <div className="e-flutuante">
          <div className="e-flutuante-rotulo">CMV médio</div>
          <div className="e-flutuante-valor e-sans" style={nums}>{resumo.cmvMedio !== null ? `${resumo.cmvMedio.toFixed(1)}%` : "—"}</div>
        </div>
      </div>

      <div className="e-corpo">
        <div className="e-coluna">
          <h2>Engenharia de cardápio</h2>
          <p className="e-legenda">Margem por prato contra volume vendido no período — cada ponto, um prato do cardápio atual.</p>
          <ScatterChart width={560} height={280} margin={CHART_MARGIN}>
            <XAxis type="number" dataKey="qtdVendida" domain={[0, resumo.xMax]} tick={{ fontSize: 10.5, fill: "var(--sub)" }} tickLine={false} axisLine={{ stroke: "var(--linha)" }} />
            <YAxis type="number" dataKey="margemPct" domain={[resumo.yMin, resumo.yMax]} tick={{ fontSize: 10.5, fill: "var(--sub)" }} tickLine={false} axisLine={{ stroke: "var(--linha)" }} width={36} tickFormatter={(v) => `${v}%`} />
            <ReferenceLine y={resumo.margemAlvoMedia} stroke="var(--vinho)" strokeDasharray="3 3" strokeWidth={1.2} />
            <Tooltip content={({ payload }) => {
              if (!payload || !payload.length) return null;
              const p = payload[0].payload as (typeof resumo.comPreco)[number];
              return <ChartTooltipCard titulo={p.receita.nomePrato} linhas={[{ rotulo: "Margem", valor: `${(p.margemPct as number).toFixed(1)}%`, cor: p.abaixoDoAlvo ? "var(--vinho)" : "var(--oliva)" }]} />;
            }} />
            <Scatter data={resumo.comPreco} isAnimationActive={false}>
              {resumo.comPreco.map((p) => (
                <Cell key={p.receita.id} fill={p.abaixoDoAlvo ? "#6B2028" : "#4C5B34"} stroke="var(--papel)" strokeWidth={2} />
              ))}
            </Scatter>
          </ScatterChart>

          {resumo.perdasRecentes[0] && (
            <p className="e-dropcap" style={{ fontSize: 15, lineHeight: 1.6, marginTop: 18, maxWidth: "60ch" }}>
              O lote {resumo.perdasRecentes[0].lote} de {resumo.perdasRecentes[0].nomeReceita} foi descartado por completo neste mês — {resumo.perdasRecentes[0].motivoPerda ?? "motivo não registrado"} Uma perda que soma {formatBRL(resumo.perdaTotalReais)} no período, e é o tipo de número que a cozinha sente antes de ver na planilha.
            </p>
          )}
        </div>

        <div className="e-sidebar">
          <div className="e-sidebar-titulo">Em números</div>
          <div className="e-nota"><span>Abaixo da margem alvo</span><span className="e-nota-valor" style={{ color: resumo.abaixoDoAlvo > 0 ? "var(--vinho)" : undefined }}>{resumo.abaixoDoAlvo} de {resumo.comPreco.length}</span></div>
          <div className="e-nota"><span>Perda em {resumo.nomeMes}</span><span className="e-nota-valor" style={{ color: resumo.perdaTotalReais > 0 ? "var(--vinho)" : undefined }}>{formatBRL(resumo.perdaTotalReais)}</span></div>
          <div className="e-nota"><span>Pratos precificados</span><span className="e-nota-valor">{resumo.comPreco.length}</span></div>

          <div className="e-errata">
            <div className="e-errata-titulo">Perdas recentes</div>
            {resumo.perdasRecentes.length === 0 && <div style={{ color: "var(--sub)", fontSize: 12.5 }}>Nenhuma perda registrada.</div>}
            {resumo.perdasRecentes.map((p) => (
              <div key={p.id} className="e-errata-item">
                <b>{p.lote}</b> — {p.nomeReceita}, {p.quantidade} {p.unidadeRendimento}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="e-producao">
        <h2 style={{ fontSize: 21, fontWeight: 600, fontStyle: "italic", marginBottom: 14 }}>Produção agora</h2>
        <div className="e-producao-grid">
          {([
            { status: "em_producao" as const, rotulo: "Em produção" },
            { status: "produzido" as const, rotulo: "Produzido" },
            { status: "perda" as const, rotulo: "Perda" },
          ]).map((col) => {
            const itens = producoes.filter((p) => p.status === col.status);
            return (
              <div key={col.status} className="e-producao-col">
                <div className="e-producao-col-titulo">{col.rotulo} · {itens.length}</div>
                {itens.slice(0, 4).map((it) => (
                  <div key={it.id} className="e-producao-item">
                    {it.nomeReceita}
                    <i>{it.lote} · {it.quantidade} {it.unidadeRendimento}</i>
                  </div>
                ))}
                {itens.length === 0 && <div className="e-producao-item" style={{ color: "var(--sub)" }}>—</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
