"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ficha/Card";
import { Badge } from "@/components/ficha/Badge";
import { Kpi } from "@/components/ficha/Kpi";
import { inputStyle, nums } from "@/components/ficha/tema";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { ChartTooltipCard } from "@/components/charts/ChartTooltipCard";
import { Donut, type FatiaDonut } from "@/components/charts/Donut";
import { formatBRL, formatBRLEixo, formatPercent, formatPercentEixo, formatNumero } from "@/components/charts/format";
import { CATEGORICAL_PALETTE, CHART_ANIMATION_DURATION, CHART_ANIMATION_EASING, CHART_MARGIN, CHART_MIN_HEIGHT, axisLineStyle, axisTickStyle, chartGridProps } from "@/components/charts/theme";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";
import type { Processamento } from "@/lib/dominio/processamento";
import type { FechamentoCmv, NovoFechamentoInput } from "@/lib/dominio/fechamentoCmv";
import { construirContexto, linhasCustoDetalhado, paraProcessamentoCalc } from "@/lib/dados/adaptadores";
import { calcularCustoPorPorcao } from "@/lib/calculo/cmv";
import { calcularFechamentoCmv } from "@/lib/calculo/fechamentoCmv";
import { acaoCriarFechamento } from "./actions";

const TOP_DONUT = 5;

const GAP_ALERTA_PP = 3;

// CMV real x teorico e uma comparacao de identidade (2 series), nao de
// status -- verde do accent fica proximo demais do preto do texto pra
// distinguir num grafico pequeno, entao usa o primeiro tom categorico
// (mesma paleta validada do donut) pro "real", mantendo o teorico em "var(--text)".
const COR_CMV_REAL = CATEGORICAL_PALETTE[0];

function primeiroDiaDoMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}
function formatarPeriodo(inicio: string, fim: string): string {
  const f = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${d}/${m}`;
  };
  return `${f(inicio)} – ${f(fim)}`;
}

export function CmvClient({
  pratos,
  preparos,
  insumos,
  processamentos,
  fechamentos,
}: {
  pratos: Receita[];
  preparos: Receita[];
  insumos: Insumo[];
  processamentos: Processamento[];
  fechamentos: FechamentoCmv[];
}) {
  const [periodoInicio, setPeriodoInicio] = useState(primeiroDiaDoMes());
  const [periodoFim, setPeriodoFim] = useState(hoje());
  const [textoImportacao, setTextoImportacao] = useState("");
  const [vendasImportadas, setVendasImportadas] = useState<Map<string, number> | null>(null);
  const [erroImportacao, setErroImportacao] = useState("");
  const [estoqueInicial, setEstoqueInicial] = useState("");
  const [compras, setCompras] = useState("");
  const [estoqueFinal, setEstoqueFinal] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [pratoExpandido, setPratoExpandido] = useState<string | null>(null);

  const contexto = useMemo(() => construirContexto(insumos, [...pratos, ...preparos], processamentos), [insumos, pratos, preparos, processamentos]);
  const pratoPorId = useMemo(() => new Map(pratos.map((p) => [p.id, p])), [pratos]);
  const insumoPorId = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);
  const preparoPorId = useMemo(() => new Map(preparos.map((p) => [p.id, p])), [preparos]);
  const lotesProteina = useMemo(() => processamentos.map(paraProcessamentoCalc), [processamentos]);

  const importarVendas = () => {
    const linhas = textoImportacao.split("\n").map((l) => l.trim()).filter(Boolean);
    if (linhas.length === 0) {
      setErroImportacao("Cole os dados antes de importar.");
      return;
    }
    const mapa = new Map<string, number>();
    const naoEncontrados: string[] = [];
    linhas.forEach((linha) => {
      const partes = linha.split(/[,;\t]/).map((p) => p.trim());
      if (partes.length < 2) return;
      const nome = partes[0];
      const qtd = parseInt(partes[partes.length - 1].replace(/\D/g, ""), 10);
      if (!nome || isNaN(qtd)) return;
      const match = pratos.find((p) => p.nomePrato.toLowerCase() === nome.toLowerCase());
      if (match) mapa.set(match.id, qtd);
      else naoEncontrados.push(nome);
    });
    if (mapa.size === 0) {
      setErroImportacao("Nenhum prato reconhecido. O nome precisa bater com o cadastrado no sistema.");
      return;
    }
    setVendasImportadas(mapa);
    setErroImportacao(naoEncontrados.length ? `Importado, mas ${naoEncontrados.length} item não bateu com prato cadastrado: ${naoEncontrados.join(", ")}` : "");
    setTextoImportacao("");
  };

  const linhasCmv = useMemo(
    () =>
      pratos
        .map((p) => {
          const custoPorPorcao = calcularCustoPorPorcao(p.id, contexto);
          const qtdVendida = vendasImportadas?.get(p.id) ?? p.vendasMes ?? 0;
          const precoVenda = p.precoVenda ?? 0;
          return {
            receita: p,
            custoPorPorcao,
            qtdVendida,
            faturamentoPrato: qtdVendida * precoVenda,
            custoTeoricoPrato: qtdVendida * custoPorPorcao,
            lucroPrato: qtdVendida * (precoVenda - custoPorPorcao),
          };
        })
        .sort((a, b) => b.faturamentoPrato - a.faturamentoPrato),
    [pratos, contexto, vendasImportadas],
  );

  const faturamentoPeriodo = linhasCmv.reduce((s, l) => s + l.faturamentoPrato, 0);
  const custoTeoricoPeriodo = linhasCmv.reduce((s, l) => s + l.custoTeoricoPrato, 0);

  const numEstoqueInicial = parseFloat(estoqueInicial) || 0;
  const numCompras = parseFloat(compras) || 0;
  const numEstoqueFinal = parseFloat(estoqueFinal) || 0;

  const resultado =
    faturamentoPeriodo > 0
      ? calcularFechamentoCmv(
          linhasCmv.map((l) => ({ quantidadeVendida: l.qtdVendida, cmvReceita: l.custoPorPorcao })),
          faturamentoPeriodo,
          numEstoqueInicial,
          numCompras,
          numEstoqueFinal,
        )
      : null;

  const cmvTeoricoPct = resultado ? resultado.cmvTeoricoPercentual * 100 : 0;
  const cmvRealPct = resultado ? resultado.cmvRealPercentual * 100 : 0;
  const gapPct = resultado ? resultado.gapPercentual * 100 : 0;
  const gapReais = resultado?.gapReais ?? 0;
  const consumoReal = resultado?.consumoReal ?? 0;

  const salvarFechamento = async () => {
    if (!resultado || periodoFim < periodoInicio) return;
    setSalvando(true);
    setErroSalvar(null);
    setSucesso(false);
    const input: NovoFechamentoInput = {
      periodoInicio,
      periodoFim,
      estoqueInicial: numEstoqueInicial,
      compras: numCompras,
      estoqueFinal: numEstoqueFinal,
      faturamento: faturamentoPeriodo,
      vendas: linhasCmv.filter((l) => l.qtdVendida > 0).map((l) => ({ receitaId: l.receita.id, quantidade: l.qtdVendida })),
    };
    const resposta = await acaoCriarFechamento(input);
    setSalvando(false);
    if (!resposta.ok) {
      setErroSalvar(resposta.erro);
      return;
    }
    setSucesso(true);
  };

  const historico = useMemo(
    () =>
      fechamentos.map((f) => {
        const vendas = f.vendas.map((v) => {
          const p = pratoPorId.get(v.receitaId);
          return { quantidadeVendida: v.quantidade, cmvReceita: p ? calcularCustoPorPorcao(p.id, contexto) : 0 };
        });
        const resultadoHist = calcularFechamentoCmv(vendas, f.faturamento, f.estoqueInicial, f.compras, f.estoqueFinal);
        return {
          fechamento: f,
          cmvRealPctHist: resultadoHist.cmvRealPercentual * 100,
          cmvTeoricoPctHist: resultadoHist.cmvTeoricoPercentual * 100,
          gapPctHist: resultadoHist.gapPercentual * 100,
        };
      }),
    [fechamentos, pratoPorId, contexto],
  );

  // Historico vem do mais recente pro mais antigo (mesma ordem de fechamentos,
  // usada na tabela de auditoria); a evolucao anual precisa de ordem
  // cronologica crescente pra ler da esquerda pra direita.
  const evolucaoCmvAnual = useMemo(
    () =>
      [...historico]
        .sort((a, b) => a.fechamento.periodoInicio.localeCompare(b.fechamento.periodoInicio))
        .map((h) => ({
          periodo: formatarPeriodo(h.fechamento.periodoInicio, h.fechamento.periodoFim),
          cmvReal: h.cmvRealPctHist,
          cmvTeorico: h.cmvTeoricoPctHist,
        })),
    [historico],
  );

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-[16px] font-semibold text-[var(--tinta)] mb-1">Importar vendas do período</h2>
        <p className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>
          Cole o relatório de vendas do iFood ou do seu PDV, um prato por linha, no formato <span style={nums}>nome do prato, quantidade</span>. Enquanto não importar, o sistema usa o número de vendas/mês cadastrado manualmente em cada receita.
        </p>
        <Card className="p-5">
          <textarea
            value={textoImportacao}
            onChange={(e) => {
              setTextoImportacao(e.target.value);
              setErroImportacao("");
            }}
            placeholder={"Pizza Muçarela, 192\nParmegiana de Frango, 141\nLasanha Bolonhesa, 218"}
            className="text-[12.5px] px-3 py-2.5 rounded-lg w-full font-mono"
            style={{ ...inputStyle, minHeight: 110, ...nums }}
          />
          {erroImportacao && <div className="text-[11.5px] mt-2" style={{ color: "var(--danger)" }}>{erroImportacao}</div>}
          <div className="flex items-center gap-2 mt-3">
            <button onClick={importarVendas} className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg" style={{ background: "var(--accent)", color: "var(--accent-contrast, #fff)" }}>
              Importar vendas
            </button>
            {vendasImportadas && (
              <>
                <Badge>usando vendas importadas</Badge>
                <button
                  onClick={() => {
                    setVendasImportadas(null);
                    setErroImportacao("");
                  }}
                  className="text-[11.5px]"
                  style={{ color: "var(--sub)" }}
                >
                  voltar ao manual
                </button>
              </>
            )}
          </div>
        </Card>
      </div>

      <div>
        <h2 className="text-[16px] font-semibold text-[var(--tinta)] mb-1">CMV teórico contra CMV real</h2>
        <p className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>
          Teórico é o que as fichas dizem que devia ter sido gasto pra essas vendas. Real é o padrão do setor: estoque inicial + compras − estoque final, dividido pelo faturamento. A diferença é o que saiu da cozinha sem virar prato vendido. Um gap de 1 a 3 pontos é ruído normal de operação; acima disso vale investigar.
        </p>
        <div className="rounded-lg p-3 mb-3 text-[11.5px]" style={{ background: "var(--bg)", color: "var(--sub)" }}>
          A comparação só fecha quando <b>todo o cardápio</b> está cadastrado com ficha técnica. Se metade dos pratos não tem ficha, o CMV teórico sai menor que a realidade e o gap aparece inflado sem que exista problema nenhum na cozinha.
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11.5px]" style={{ color: "var(--faint)" }}>Período</span>
          <input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} className="text-[12px] px-2 py-1 rounded-md" style={inputStyle} />
          <span className="text-[11.5px]" style={{ color: "var(--faint)" }}>até</span>
          <input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} className="text-[12px] px-2 py-1 rounded-md" style={inputStyle} />
          {periodoFim < periodoInicio && <span className="text-[11.5px]" style={{ color: "var(--danger)" }}>Fim não pode ser antes do início.</span>}
        </div>

        <div className="grid grid-cols-4 gap-3 mb-3">
          <Kpi label="Faturamento do período" value={`R$ ${faturamentoPeriodo.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} sub={`${linhasCmv.reduce((s, l) => s + l.qtdVendida, 0)} pratos vendidos`} />
          <Kpi label="CMV teórico (fichas)" value={`${formatNumero(cmvTeoricoPct, 1)}%`} sub={formatBRLEixo(custoTeoricoPeriodo)} />
          <Kpi label="CMV real (estoque)" value={`${formatNumero(cmvRealPct, 1)}%`} alerta={gapPct > GAP_ALERTA_PP} sub={formatBRLEixo(consumoReal)} />
          <Kpi
            label="Gap não explicado"
            value={`${gapPct > 0 ? "+" : ""}${formatNumero(gapPct, 1)} p.p.`}
            alerta={gapPct > GAP_ALERTA_PP}
            sub={`R$ ${Math.abs(gapReais).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ${gapReais > 0 ? "a mais que o previsto" : "abaixo do previsto"}`}
          />
        </div>

        <Card className="p-5">
          <h3 className="text-[13px] font-semibold mb-1">Base do cálculo real</h3>
          <p className="text-[11.5px] mb-3" style={{ color: "var(--sub)" }}>Valores do inventário do período (contagem física de estoque + notas de compra).</p>
          <div className="grid grid-cols-3 gap-3">
            {([
              ["Estoque inicial", estoqueInicial, setEstoqueInicial],
              ["Compras do período", compras, setCompras],
              ["Estoque final", estoqueFinal, setEstoqueFinal],
            ] as const).map(([label, valor, setValor]) => (
              <div key={label}>
                <div className="text-[11px] mb-1" style={{ color: "var(--faint)" }}>{label}</div>
                <input
                  type="number"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0"
                  className="text-[12.5px] px-2.5 py-1.5 rounded-md w-full text-right"
                  style={{ ...inputStyle, ...nums }}
                />
              </div>
            ))}
          </div>
          <div className="text-[11.5px] mt-3 pt-3" style={{ color: "var(--sub)", borderTop: `1px solid ${"var(--border)"}` }}>
            Consumo real = {numEstoqueInicial.toLocaleString("pt-BR")} + {numCompras.toLocaleString("pt-BR")} − {numEstoqueFinal.toLocaleString("pt-BR")} = <b style={{ color: "var(--text)" }}>R$ {consumoReal.toLocaleString("pt-BR")}</b>
          </div>
        </Card>

        {gapPct > GAP_ALERTA_PP && (
          <div className="rounded-lg p-4 mt-3 text-[12.5px]" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            <b>Gap de {formatNumero(gapPct, 1)} pontos percentuais.</b> Saiu R$ {gapReais.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} a mais de insumo do que as fichas previam. As causas prováveis, em ordem: porção maior que a ficha manda, perda não registrada, rendimento de proteína pior que o cadastrado, ou desvio. As telas de Manipulação de Proteínas e Produções ajudam a isolar qual é.
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={salvarFechamento}
            disabled={salvando || !resultado || periodoFim < periodoInicio}
            className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-lg"
            style={{ background: "var(--accent)", color: "var(--accent-contrast, #fff)", opacity: salvando || !resultado || periodoFim < periodoInicio ? 0.6 : 1 }}
          >
            {salvando ? "Salvando..." : "Salvar fechamento do período"}
          </button>
          {!resultado && <span className="text-[11.5px]" style={{ color: "var(--faint)" }}>Sem faturamento no período (importe vendas ou cadastre vendas/mês nas receitas).</span>}
          {sucesso && <Badge>fechamento salvo</Badge>}
        </div>
        {erroSalvar && (
          <div className="text-[12px] mt-2 rounded-md px-2.5 py-2" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            {erroSalvar}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-[16px] font-semibold text-[var(--tinta)] mb-1">CMV por prato</h2>
        <p className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>Ordenado por faturamento. O que vende muito com margem baixa costuma pesar mais que o que vende pouco com margem ruim. Clique num prato pra ver de onde vem o custo dele.</p>
        <Card>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ color: "var(--faint)" }} className="text-left text-[10.5px] uppercase tracking-wide">
                <th className="py-2.5 px-5 font-medium">Prato</th>
                <th className="py-2.5 px-3 font-medium text-right">Vendidos</th>
                <th className="py-2.5 px-3 font-medium text-right">Preço</th>
                <th className="py-2.5 px-3 font-medium text-right">CMV unit.</th>
                <th className="py-2.5 px-3 font-medium text-right">Faturamento</th>
                <th className="py-2.5 px-3 font-medium text-right">Custo total</th>
                <th className="py-2.5 px-5 font-medium text-right">Lucro bruto</th>
              </tr>
            </thead>
            <tbody>
              {linhasCmv.map((l) => {
                const aberto = pratoExpandido === l.receita.id;
                return (
                  <Fragment key={l.receita.id}>
                    <tr
                      className="cursor-pointer"
                      style={{ borderTop: `1px solid ${"var(--border)"}` }}
                      onClick={() => setPratoExpandido(aberto ? null : l.receita.id)}
                    >
                      <td className="py-2.5 px-5">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          {aberto ? <ChevronDown size={13} style={{ color: "var(--faint)" }} /> : <ChevronRight size={13} style={{ color: "var(--faint)" }} />}
                          {l.receita.nomePrato}
                        </span>
                        {l.qtdVendida === 0 && (
                          <span className="ml-2"><Badge acao>sem vendas cadastradas</Badge></span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right" style={nums}>{l.qtdVendida}</td>
                      <td className="py-2.5 px-3 text-right" style={nums}>{formatBRL((l.receita.precoVenda ?? 0))}</td>
                      <td className="py-2.5 px-3 text-right" style={{ ...nums, color: "var(--sub)" }}>{formatBRL(l.custoPorPorcao)}</td>
                      <td className="py-2.5 px-3 text-right" style={nums}>R$ {l.faturamentoPrato.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                      <td className="py-2.5 px-3 text-right" style={{ ...nums, color: "var(--sub)" }}>R$ {l.custoTeoricoPrato.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                      <td className="py-2.5 px-5 text-right font-medium" style={nums}>R$ {l.lucroPrato.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                    </tr>
                    {aberto && (() => {
                      const linhasComCusto = linhasCustoDetalhado(l.receita, insumoPorId, preparoPorId, lotesProteina, contexto);
                      const ordenadoPorCusto = [...linhasComCusto].filter((c) => c.custo > 0).sort((a, b) => b.custo - a.custo);
                      const restante = ordenadoPorCusto.slice(TOP_DONUT).reduce((s, c) => s + c.custo, 0);
                      const donutDados: FatiaDonut[] = [
                        ...ordenadoPorCusto.slice(0, TOP_DONUT).map((c) => ({ nome: c.nome, valor: c.custo })),
                        ...(restante > 0 ? [{ nome: "Outros", valor: restante, outros: true }] : []),
                      ];
                      return (
                        <tr style={{ background: "var(--bg)" }}>
                          <td colSpan={7} className="px-5 py-4">
                            <h4 className="text-[12px] font-semibold mb-1">Custo por ingrediente · {l.receita.nomePrato}</h4>
                            <p className="text-[11.5px] mb-2" style={{ color: "var(--sub)" }}>
                              {ordenadoPorCusto.length > TOP_DONUT ? `Os ${TOP_DONUT} maiores custos, resto agrupado em "Outros".` : "Participação de cada item no custo total do prato."}
                            </p>
                            <Donut
                              dados={donutDados}
                              altura={CHART_MIN_HEIGHT}
                              tituloVazio="Nenhum custo calculado ainda."
                              dicaVazio="Adicione insumos ou preparos na ficha desse prato pra ver a composição do custo aqui."
                            />
                          </td>
                        </tr>
                      );
                    })()}
                  </Fragment>
                );
              })}
              {linhasCmv.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 px-5 text-center" style={{ color: "var(--faint)" }}>Nenhum prato final cadastrado ainda.</td>
                </tr>
              )}
              {linhasCmv.length > 0 && (
                <tr style={{ borderTop: `1.5px solid ${"var(--border-strong)"}` }}>
                  <td className="py-2.5 px-5 font-semibold" colSpan={4}>Total do período</td>
                  <td className="py-2.5 px-3 text-right font-semibold" style={nums}>R$ {faturamentoPeriodo.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                  <td className="py-2.5 px-3 text-right font-semibold" style={nums}>R$ {custoTeoricoPeriodo.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                  <td className="py-2.5 px-5 text-right font-semibold" style={nums}>R$ {(faturamentoPeriodo - custoTeoricoPeriodo).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <div>
        <h2 className="text-[16px] font-semibold text-[var(--tinta)] mb-1">Histórico de fechamentos</h2>
        <p className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>
          CMV real de um período fechado nunca muda (vem do estoque contado na época). O teórico aqui é recalculado com a ficha técnica atual, então pode se afastar um pouco do teórico do dia do fechamento se preço de insumo ou ficha mudaram desde então.
        </p>

        <Card className="p-5 mb-3">
          <h3 className="text-[13px] font-semibold mb-1">Evolução do CMV real x teórico</h3>
          <p className="text-[11.5px] mb-3" style={{ color: "var(--sub)" }}>Cada ponto é um fechamento salvo, em ordem cronológica.</p>
          <ChartFrame
            vazio={evolucaoCmvAnual.length === 0}
            tituloVazio="Nenhum fechamento salvo ainda."
            dicaVazio="Salve o fechamento do período acima pra esse gráfico começar a preencher."
          >
            <LineChart data={evolucaoCmvAnual} margin={CHART_MARGIN}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="periodo" tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} tickFormatter={formatPercentEixo} />
              <Legend verticalAlign="top" height={28} iconType="circle" iconSize={8} formatter={(value) => <span style={{ color: "var(--sub)", fontSize: 11 }}>{value}</span>} />
              <Tooltip
                content={({ payload, label }) => {
                  if (!payload || !payload.length) return null;
                  const d = payload[0].payload as { periodo: string; cmvReal: number; cmvTeorico: number };
                  return (
                    <ChartTooltipCard
                      titulo={String(label)}
                      linhas={[
                        { rotulo: "CMV real", valor: formatPercent(d.cmvReal), cor: COR_CMV_REAL },
                        { rotulo: "CMV teórico", valor: formatPercent(d.cmvTeorico), cor: "var(--text)" },
                      ]}
                    />
                  );
                }}
              />
              <Line type="monotone" dataKey="cmvTeorico" name="CMV teórico" stroke={"var(--text)"} strokeWidth={2} dot={{ r: 4, fill: "var(--text)" }} isAnimationActive animationDuration={CHART_ANIMATION_DURATION} animationEasing={CHART_ANIMATION_EASING} />
              <Line type="monotone" dataKey="cmvReal" name="CMV real" stroke={COR_CMV_REAL} strokeWidth={2} dot={{ r: 4, fill: COR_CMV_REAL }} isAnimationActive animationDuration={CHART_ANIMATION_DURATION} animationEasing={CHART_ANIMATION_EASING} />
            </LineChart>
          </ChartFrame>
        </Card>

        <Card>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ color: "var(--faint)" }} className="text-left text-[10.5px] uppercase tracking-wide">
                <th className="py-2.5 px-5 font-medium">Período</th>
                <th className="py-2.5 px-3 font-medium text-right">Faturamento</th>
                <th className="py-2.5 px-3 font-medium text-right">CMV teórico</th>
                <th className="py-2.5 px-3 font-medium text-right">CMV real</th>
                <th className="py-2.5 px-5 font-medium text-right">Gap</th>
              </tr>
            </thead>
            <tbody>
              {historico.map(({ fechamento, cmvRealPctHist, cmvTeoricoPctHist, gapPctHist }) => (
                <tr key={fechamento.id} style={{ borderTop: `1px solid ${"var(--border)"}` }}>
                  <td className="py-2.5 px-5 font-medium">{formatarPeriodo(fechamento.periodoInicio, fechamento.periodoFim)}</td>
                  <td className="py-2.5 px-3 text-right" style={nums}>R$ {fechamento.faturamento.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                  <td className="py-2.5 px-3 text-right" style={{ ...nums, color: "var(--sub)" }}>{formatNumero(cmvTeoricoPctHist, 1)}%</td>
                  <td className="py-2.5 px-3 text-right" style={nums}>{formatNumero(cmvRealPctHist, 1)}%</td>
                  <td className="py-2.5 px-5 text-right font-medium" style={{ ...nums, color: gapPctHist > GAP_ALERTA_PP ? "var(--danger)" : "var(--text)" }}>
                    {gapPctHist > 0 ? "+" : ""}{formatNumero(gapPctHist, 1)} p.p.
                  </td>
                </tr>
              ))}
              {historico.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 px-5 text-center" style={{ color: "var(--faint)" }}>Nenhum fechamento salvo ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
