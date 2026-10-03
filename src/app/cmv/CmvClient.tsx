"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ficha/Card";
import { Badge } from "@/components/ficha/Badge";
import { Kpi } from "@/components/ficha/Kpi";
import { inputStyle, nums } from "@/components/ficha/tema";
import { EspacoDoGrafico } from "@/components/charts/EspacoDoGrafico";
import type { FatiaDonut } from "@/components/charts/Donut";
import { formatBRL, formatBRLEixo, formatNumero } from "@/components/charts/format";
import { CHART_MIN_HEIGHT } from "@/components/charts/theme";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";
import type { Processamento } from "@/lib/dominio/processamento";
import type { FechamentoCmv, NovoFechamentoInput } from "@/lib/dominio/fechamentoCmv";
import { construirContexto, linhasCustoDetalhado, paraProcessamentoCalc } from "@/lib/dados/adaptadores";
import { calcularCustoPorPorcao } from "@/lib/calculo/cmv";
import { calcularFechamentoCmv } from "@/lib/calculo/fechamentoCmv";
import { acaoCriarFechamento } from "./actions";
import { CHAVE_VENDAS_IMPORTADAS, type VendasImportadas } from "@/components/integracoes/ImportadorVendas";
import { ItemMovel, ListaMovel } from "@/components/ficha/ListaMovel";
import { numeroBR } from "@/lib/formato";
import { comprasNoPeriodo, type CompraDoDia } from "@/lib/integracoes/conferenciaNota";

const TOP_DONUT = 5;

const GAP_ALERTA_PP = 3;

// DESEMPENHO (2026-10-02): gráficos (Recharts, ~290 KB) sob demanda — a
// tela abre e responde ao toque antes deles. Reverter: importar Donut de
// "@/components/charts/Donut" e colar o JSX de GraficoEvolucaoCmv.tsx de volta.
const GraficoEvolucaoCmv = dynamic(() => import("./GraficoEvolucaoCmv").then((m) => m.GraficoEvolucaoCmv), { ssr: false, loading: () => <EspacoDoGrafico /> });
const Donut = dynamic(() => import("@/components/charts/Donut").then((m) => m.Donut), { ssr: false, loading: () => <EspacoDoGrafico /> });

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
  comprasNotas,
}: {
  pratos: Receita[];
  preparos: Receita[];
  insumos: Insumo[];
  processamentos: Processamento[];
  fechamentos: FechamentoCmv[];
  /** Só no app: custo das NF-e de compra lançadas, por dia de emissão. */
  comprasNotas?: CompraDoDia[];
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
  // INTEGRACOES (2026-09-23): vendas vindas de Integrações (XML fiscal ou planilha
  // do PDV). Trazem o faturamento real, com bebida e o que mais não tem ficha, em
  // vez de só preço × quantidade dos pratos. Reverter: apagar este estado, o
  // useEffect abaixo e voltar faturamentoPeriodo a só a soma das linhas.
  const [importacao, setImportacao] = useState<VendasImportadas | null>(null);
  const basePath = usePathname()?.startsWith("/preview") ? "/preview" : "";
  // NF-e DE COMPRA (2026-10-03): o que as notas lançadas somam no período, pra
  // "Compras do período" sair do custo real em vez de digitado de cabeça.
  const notasNoPeriodo = comprasNotas ? comprasNoPeriodo(comprasNotas, periodoInicio, periodoFim) : null;

  useEffect(() => {
    let pacote: VendasImportadas | null = null;
    try {
      const bruto = sessionStorage.getItem(CHAVE_VENDAS_IMPORTADAS);
      if (bruto) {
        pacote = JSON.parse(bruto) as VendasImportadas;
        sessionStorage.removeItem(CHAVE_VENDAS_IMPORTADAS);
      }
    } catch {}
    if (!pacote) return;
    setImportacao(pacote);
    setVendasImportadas(new Map(pacote.vendas.map((v) => [v.receitaId, v.quantidade])));
    if (pacote.inicio) setPeriodoInicio(pacote.inicio);
    if (pacote.fim) setPeriodoFim(pacote.fim);
  }, []);

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

  const faturamentoDasFichas = linhasCmv.reduce((s, l) => s + l.faturamentoPrato, 0);
  // Com importação de XML/planilha com valor, vale o faturamento real do período.
  const faturamentoPeriodo = importacao && importacao.faturamento > 0 ? importacao.faturamento : faturamentoDasFichas;
  const custoTeoricoPeriodo = linhasCmv.reduce((s, l) => s + l.custoTeoricoPrato, 0);

  const numEstoqueInicial = parseFloat(estoqueInicial) || 0;
  const numCompras = parseFloat(compras) || 0;
  const numEstoqueFinal = parseFloat(estoqueFinal) || 0;
  // SISTEMA premium: nada preenchido na base do cálculo real = ainda não há CMV real.
  const semBaseReal = numEstoqueInicial === 0 && numCompras === 0 && numEstoqueFinal === 0;

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

  // CELULAR (2026-09-26): mesma composição do custo na tabela (computador) e na lista (celular).
  const composicaoDoCusto = (receita: (typeof linhasCmv)[number]["receita"]) => {
    const linhasComCusto = linhasCustoDetalhado(receita, insumoPorId, preparoPorId, lotesProteina, contexto);
    const ordenadoPorCusto = [...linhasComCusto].filter((c) => c.custo > 0).sort((a, b) => b.custo - a.custo);
    const restante = ordenadoPorCusto.slice(TOP_DONUT).reduce((s, c) => s + c.custo, 0);
    const donutDados: FatiaDonut[] = [
      ...ordenadoPorCusto.slice(0, TOP_DONUT).map((c) => ({ nome: c.nome, valor: c.custo })),
      ...(restante > 0 ? [{ nome: "Outros", valor: restante, outros: true }] : []),
    ];
    return (
      <>
        <h4 className="text-[12px] font-semibold mb-1">Custo por ingrediente · {receita.nomePrato}</h4>
        <p className="text-[11.5px] mb-2" style={{ color: "var(--sub)" }}>
          {ordenadoPorCusto.length > TOP_DONUT ? `Os ${TOP_DONUT} maiores custos, resto agrupado em "Outros".` : "Participação de cada item no custo total do prato."}
        </p>
        <Donut
          dados={donutDados}
          altura={CHART_MIN_HEIGHT}
          tituloVazio="Nenhum custo calculado ainda."
          dicaVazio="Adicione insumos ou preparos na ficha desse prato pra ver a composição do custo aqui."
        />
      </>
    );
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-[16px] font-semibold text-[var(--tinta)] mb-1">Importar vendas do período</h2>
        <p className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>
          Cole o relatório de vendas do iFood ou do seu PDV, um prato por linha, no formato <span style={nums}>nome do prato, quantidade</span>. Enquanto não importar, o sistema usa o número de vendas/mês cadastrado manualmente em cada receita.{" "}
          Tem o XML das notas de venda ou a planilha do PDV?{" "}
          <Link href={`${basePath}/integracoes`} className="font-medium text-[var(--tinta)] underline underline-offset-2">
            Importe em Integrações
          </Link>
          .
        </p>
        {importacao && (
          <div className="mb-3 rounded-lg px-4 py-3 text-[13px] flex flex-wrap items-center justify-between gap-3" style={{ background: "color-mix(in srgb, var(--sucesso) 8%, transparent)", color: "var(--tinta-sub)" }}>
            <span>
              <span className="font-medium text-[var(--tinta)]">Vendas importadas de {importacao.descricao}.</span>{" "}
              {importacao.faturamento > 0
                ? `Faturamento ${formatBRL(importacao.faturamento)}, dos quais ${formatBRL(importacao.faturamentoSemFicha)} em itens sem ficha.`
                : "Planilha sem valor: o faturamento é o preço das fichas × quantidade."}
            </span>
            <button
              onClick={() => {
                setImportacao(null);
                setVendasImportadas(null);
              }}
              className="text-[13px] font-medium min-h-10 px-3 rounded-md border"
              style={{ borderColor: "var(--linha-forte)", color: "var(--tinta-sub)" }}
            >
              Desfazer importação
            </button>
          </div>
        )}
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
                    setImportacao(null);
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

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[11.5px]" style={{ color: "var(--faint)" }}>Período</span>
          <input type="date" aria-label="Início do período" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} className="text-[12px] px-2 py-1 rounded-md" style={inputStyle} />
          <span className="text-[11.5px]" style={{ color: "var(--faint)" }}>até</span>
          <input type="date" aria-label="Fim do período" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} className="text-[12px] px-2 py-1 rounded-md" style={inputStyle} />
          {periodoFim < periodoInicio && <span className="text-[11.5px]" style={{ color: "var(--danger)" }}>Fim não pode ser antes do início.</span>}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <Kpi label="Faturamento do período" value={`R$ ${numeroBR(faturamentoPeriodo, { maximumFractionDigits: 0 })}`} sub={`${linhasCmv.reduce((s, l) => s + l.qtdVendida, 0)} pratos vendidos`} />
          <Kpi label="CMV teórico (fichas)" value={`${formatNumero(cmvTeoricoPct, 1)}%`} sub={formatBRLEixo(custoTeoricoPeriodo)} />
          {/* SISTEMA premium: sem base de estoque preenchida, CMV real e gap mostram "—"
              em vez de "0,0%" e "-21,8 p.p." (número inventado; PRODUCT.md, princípio 2).
              Reverter: trocar `semBaseReal ? ... :` pelos valores de antes (git revert do commit). */}
          <Kpi label="CMV real (estoque)" value={semBaseReal ? "—" : `${formatNumero(cmvRealPct, 1)}%`} alerta={!semBaseReal && gapPct > GAP_ALERTA_PP} sub={semBaseReal ? "preencha a base do cálculo" : formatBRLEixo(consumoReal)} />
          <Kpi
            label="Gap não explicado"
            value={semBaseReal ? "—" : `${gapPct > 0 ? "+" : ""}${formatNumero(gapPct, 1)} p.p.`}
            alerta={!semBaseReal && gapPct > GAP_ALERTA_PP}
            sub={semBaseReal ? "aparece com o estoque contado" : `R$ ${numeroBR(Math.abs(gapReais), { maximumFractionDigits: 0 })} ${gapReais > 0 ? "a mais que o previsto" : "abaixo do previsto"}`}
          />
        </div>

        <Card className="p-5">
          <h3 className="text-[13px] font-semibold mb-1">Base do cálculo real</h3>
          <p className="text-[11.5px] mb-3" style={{ color: "var(--sub)" }}>Valores do inventário do período (contagem física de estoque + notas de compra).</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  inputMode="decimal"
                  aria-label={label}
                  className="text-[12.5px] px-2.5 py-1.5 rounded-md w-full text-right"
                  style={{ ...inputStyle, ...nums }}
                />
              </div>
            ))}
          </div>
          {notasNoPeriodo && notasNoPeriodo.notas > 0 && (
            <div className="text-[11.5px] mt-2 flex flex-wrap items-center gap-x-2 gap-y-1" style={{ color: "var(--sub)" }}>
              <span>
                {notasNoPeriodo.notas} {notasNoPeriodo.notas === 1 ? "NF-e de compra lançada" : "NF-e de compra lançadas"} no período: <b style={{ color: "var(--text)" }}>{formatBRL(notasNoPeriodo.custo)}</b>
              </span>
              {numCompras !== notasNoPeriodo.custo && (
                <button type="button" onClick={() => setCompras(String(notasNoPeriodo.custo))} className="underline underline-offset-2 min-h-8" style={{ color: "var(--text)" }}>
                  Usar em Compras do período
                </button>
              )}
            </div>
          )}
          <div className="text-[11.5px] mt-3 pt-3" style={{ color: "var(--sub)", borderTop: `1px solid ${"var(--border)"}` }}>
            Consumo real = {numeroBR(numEstoqueInicial)} + {numeroBR(numCompras)} − {numeroBR(numEstoqueFinal)} = <b style={{ color: "var(--text)" }}>R$ {numeroBR(consumoReal)}</b>
          </div>
        </Card>

        {gapPct > GAP_ALERTA_PP && (
          <div className="rounded-lg p-4 mt-3 text-[12.5px]" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            <b>Gap de {formatNumero(gapPct, 1)} pontos percentuais.</b> Saiu R$ {numeroBR(gapReais, { maximumFractionDigits: 0 })} a mais de insumo do que as fichas previam. As causas prováveis, em ordem: porção maior que a ficha manda, perda não registrada, rendimento de proteína pior que o cadastrado, ou desvio. As telas de Manipulação de Proteínas e Produções ajudam a isolar qual é.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button
            onClick={salvarFechamento}
            disabled={salvando || !resultado || periodoFim < periodoInicio}
            className="text-[13px] md:text-[12.5px] font-medium px-3.5 min-h-11 md:min-h-0 md:py-1.5 rounded-lg"
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
          <ListaMovel rotulo="CMV por prato">
            {linhasCmv.map((l) => {
              const aberto = pratoExpandido === l.receita.id;
              return (
                <ItemMovel
                  key={l.receita.id}
                  titulo={l.receita.nomePrato}
                  subtitulo={`${l.qtdVendida} vendidos · custo ${formatBRL(l.custoPorPorcao)} de ${formatBRL(l.receita.precoVenda ?? 0)}`}
                  valor={`R$ ${numeroBR(l.lucroPrato, { maximumFractionDigits: 0 })}`}
                  detalhe="lucro bruto"
                  selo={l.qtdVendida === 0 ? <Badge acao>sem vendas cadastradas</Badge> : undefined}
                  aberto={aberto}
                  aoTocar={() => setPratoExpandido(aberto ? null : l.receita.id)}
                >
                  {composicaoDoCusto(l.receita)}
                </ItemMovel>
              );
            })}
            {linhasCmv.length === 0 && <li className="py-6 px-4 text-center text-[14px]" style={{ color: "var(--faint)" }}>Nenhum prato final cadastrado ainda.</li>}
            {linhasCmv.length > 0 && (
              <li className="px-4 py-3 border-t flex justify-between text-[14px] font-semibold" style={{ borderColor: "var(--border-strong)", ...nums }}>
                <span>Lucro bruto do período</span>
                <span>R$ {numeroBR(faturamentoDasFichas - custoTeoricoPeriodo, { maximumFractionDigits: 0 })}</span>
              </li>
            )}
          </ListaMovel>
          <table className="hidden md:table w-full text-[12.5px]">
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
                      <td className="py-2.5 px-3 text-right" style={nums}>R$ {numeroBR(l.faturamentoPrato, { maximumFractionDigits: 0 })}</td>
                      <td className="py-2.5 px-3 text-right" style={{ ...nums, color: "var(--sub)" }}>R$ {numeroBR(l.custoTeoricoPrato, { maximumFractionDigits: 0 })}</td>
                      <td className="py-2.5 px-5 text-right font-medium" style={nums}>R$ {numeroBR(l.lucroPrato, { maximumFractionDigits: 0 })}</td>
                    </tr>
                    {aberto && (
                      <tr style={{ background: "var(--bg)" }}>
                        <td colSpan={7} className="px-5 py-4">
                          {composicaoDoCusto(l.receita)}
                        </td>
                      </tr>
                    )}
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
                  <td className="py-2.5 px-3 text-right font-semibold" style={nums}>R$ {numeroBR(faturamentoDasFichas, { maximumFractionDigits: 0 })}</td>
                  <td className="py-2.5 px-3 text-right font-semibold" style={nums}>R$ {numeroBR(custoTeoricoPeriodo, { maximumFractionDigits: 0 })}</td>
                  <td className="py-2.5 px-5 text-right font-semibold" style={nums}>R$ {numeroBR(faturamentoDasFichas - custoTeoricoPeriodo, { maximumFractionDigits: 0 })}</td>
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
          <GraficoEvolucaoCmv dados={evolucaoCmvAnual} />
        </Card>

        <Card>
          <ListaMovel rotulo="Histórico de fechamentos">
            {historico.map(({ fechamento, cmvRealPctHist, cmvTeoricoPctHist, gapPctHist }) => (
              <ItemMovel
                key={fechamento.id}
                titulo={formatarPeriodo(fechamento.periodoInicio, fechamento.periodoFim)}
                subtitulo={`R$ ${numeroBR(fechamento.faturamento, { maximumFractionDigits: 0 })} · teórico ${formatNumero(cmvTeoricoPctHist, 1)}% · real ${formatNumero(cmvRealPctHist, 1)}%`}
                valor={`${gapPctHist > 0 ? "+" : ""}${formatNumero(gapPctHist, 1)} p.p.`}
                corValor={gapPctHist > GAP_ALERTA_PP ? "var(--danger)" : undefined}
                detalhe="gap"
              />
            ))}
            {historico.length === 0 && <li className="py-6 px-4 text-center text-[14px]" style={{ color: "var(--faint)" }}>Nenhum fechamento salvo ainda.</li>}
          </ListaMovel>
          <table className="hidden md:table w-full text-[12.5px]">
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
                  <td className="py-2.5 px-3 text-right" style={nums}>R$ {numeroBR(fechamento.faturamento, { maximumFractionDigits: 0 })}</td>
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
