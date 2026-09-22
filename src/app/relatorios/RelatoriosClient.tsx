"use client";

// POLIMENTO relatorios (2026-09-22) -- tela refeita com o usuário ("os dois"):
// em cima, o que decidir agora (estado de hoje); embaixo, o relatório de cada
// fechamento de CMV, com impressão/PDF. Versão anterior inteira:
//   git show 96326ef:src/app/relatorios/RelatoriosClient.tsx
// Pra desfazer: git revert do commit "polimento(relatorios)". Registro em docs/POLIMENTO.md.
//
// Números que estavam errados na versão anterior (corrigidos aqui):
//  1. "Total identificado" somava a quebra de estoque com o custo dos lotes
//     perdidos. O lote descartado já sai do estoque, então já está dentro da
//     quebra: contava duas vezes. Agora a quebra de cada fechamento é aberta em
//     "perda registrada" (lotes descartados no período) + "sem explicação".
//  2. "Último fechamento" era fechamentos[0], mas a demo vinha em ordem crescente
//     (pegava agosto). Agora a tela ordena por periodoFim, qualquer que seja a
//     ordem de entrada.
//  3. A linha de meta do gráfico de margem usava a meta do primeiro prato pra
//     todos. A margem agora é tabela por período, com a meta de cada prato.
//  4. "Quebra acumulada" deixava um período com gap negativo apagar o positivo
//     de outro e não dizia quais períodos somava. Saiu: cada fechamento tem o seu.
//  5. Gráfico de perdas por turno com uma barra só (anti-padrão): virou lista.

import { useCallback, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CheckCircle, Printer } from "lucide-react";
import { formatBRL, formatNumero, formatPercent, formatQtd } from "@/components/charts/format";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";
import type { Processamento } from "@/lib/dominio/processamento";
import type { Producao } from "@/lib/dominio/producao";
import type { FechamentoCmv } from "@/lib/dominio/fechamentoCmv";
import type { LocalArmazenamento, RegistroTemperatura } from "@/lib/dominio/temperatura";
import { construirContexto } from "@/lib/dados/adaptadores";
import { calcularCustoPorPorcao } from "@/lib/calculo/cmv";
import { calcularFechamentoCmv } from "@/lib/calculo/fechamentoCmv";

// Gap de 1 a 3 p.p. é ruído normal de operação (lib/calculo/fechamentoCmv.ts).
const GAP_ALERTA_PP = 3;
// Descarte médio de proteína acima disso aparece em vermelho na tabela por responsável.
const DESCARTE_ALERTA_PCT = 10;
// Abaixo disso de faturamento coberto por ficha, o gap do fechamento vem inflado
// por item sem ficha e a tela avisa.
const COBERTURA_MINIMA_PCT = 95;

// Cores da barra "para onde foi o consumo". Validadas com o validador do skill
// dataviz (separação pra daltonismo ΔE ≥ 19 nos dois temas). O cinza é a base
// prevista; as duas perdas são o mesmo vermelho em claridades diferentes, e cada
// parte tem o valor escrito na legenda (não depende só da cor).
const COR_PREVISTO = "var(--tinta-faint)";
const COR_PERDA_REGISTRADA = "color-mix(in srgb, var(--sinal) 45%, var(--panel))";
const COR_SEM_EXPLICACAO = "var(--sinal)";

const painel = { background: "var(--panel)", borderColor: "var(--linha)", boxShadow: "var(--shadow-card)" } as const;

function dataBR(iso: string, comAno = true): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  if (!a || !m || !d) return iso;
  return comAno ? `${d}/${m}/${a}` : `${d}/${m}`;
}

function dentroDoPeriodo(iso: string, inicio: string, fim: string): boolean {
  const dia = iso.slice(0, 10);
  return dia >= inicio.slice(0, 10) && dia <= fim.slice(0, 10);
}

/** "agosto de 2026" quando o período é o mês cheio; senão "01/09 a 15/09/2026". */
function rotuloPeriodo(f: FechamentoCmv): string {
  const inicio = new Date(`${f.periodoInicio.slice(0, 10)}T12:00:00`);
  const fim = new Date(`${f.periodoFim.slice(0, 10)}T12:00:00`);
  const ultimoDiaDoMes = new Date(fim.getFullYear(), fim.getMonth() + 1, 0).getDate();
  const mesCheio = inicio.getDate() === 1 && fim.getDate() === ultimoDiaDoMes && inicio.getMonth() === fim.getMonth() && inicio.getFullYear() === fim.getFullYear();
  if (mesCheio) return inicio.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return `${dataBR(f.periodoInicio, false)} a ${dataBR(f.periodoFim)}`;
}

function rotuloCurto(f: FechamentoCmv): string {
  const r = rotuloPeriodo(f);
  return r.includes(" de ") ? r.replace(" de ", " ").replace(/^./, (c) => c.toUpperCase()) : r;
}

function pp(valor: number): string {
  return `${valor > 0 ? "+" : valor < 0 ? "−" : ""}${formatNumero(Math.abs(valor), 1)} p.p.`;
}

function plural(n: number, um: string, varios: string): string {
  return `${n.toLocaleString("pt-BR")} ${n === 1 ? um : varios}`;
}

type TipoPendencia = "Temperatura" | "CMV" | "Margem" | "Estoque" | "Rendimento";

interface Pendencia {
  tipo: TipoPendencia;
  titulo: string;
  detalhe: string;
  /** R$ em jogo quando dá pra calcular sem inventar (margem, gap). */
  reais: number | null;
  rotuloReais?: string;
  acao: string;
  rota: string;
}

// Ordem de urgência: segurança do alimento primeiro, depois o que tem R$, depois o resto.
const PESO_TIPO: Record<TipoPendencia, number> = { Temperatura: 0, CMV: 1, Margem: 1, Estoque: 2, Rendimento: 3 };
const COR_TIPO: Record<TipoPendencia, string> = {
  Temperatura: "var(--sinal)",
  CMV: "var(--sinal)",
  Margem: "var(--sinal)",
  Estoque: "var(--aviso)",
  Rendimento: "var(--tinta-sub)",
};

export function RelatoriosClient({
  insumos,
  receitas,
  processamentos,
  producoes,
  fechamentos,
  locais,
  registrosTemperatura,
  margemAlvoCliente,
  nomeRestaurante,
}: {
  insumos: Insumo[];
  receitas: Receita[];
  processamentos: Processamento[];
  producoes: Producao[];
  fechamentos: FechamentoCmv[];
  locais: LocalArmazenamento[];
  registrosTemperatura: RegistroTemperatura[];
  margemAlvoCliente: number;
  nomeRestaurante?: string;
}) {
  const basePath = usePathname()?.startsWith("/preview") ? "/preview" : "";
  const contexto = useMemo(() => construirContexto(insumos, receitas, processamentos), [insumos, receitas, processamentos]);
  const receitaPorId = useMemo(() => new Map(receitas.map((r) => [r.id, r])), [receitas]);

  const custoPorcao = useMemo(() => {
    const cache = new Map<string, number>();
    return (receitaId: string): number => {
      if (!receitaPorId.has(receitaId)) return 0;
      if (!cache.has(receitaId)) cache.set(receitaId, calcularCustoPorPorcao(receitaId, contexto));
      return cache.get(receitaId) as number;
    };
  }, [receitaPorId, contexto]);

  const metaDoPrato = useCallback((r: Receita) => (r.margemAlvo ?? margemAlvoCliente) * 100, [margemAlvoCliente]);

  // Mais recente primeiro, independente da ordem que chegou (ver nota 2 no topo).
  const fechamentosOrdenados = useMemo(() => [...fechamentos].sort((a, b) => b.periodoFim.localeCompare(a.periodoFim)), [fechamentos]);

  // ---------- Relatório de cada fechamento ----------
  const relatorios = useMemo(
    () =>
      fechamentosOrdenados.map((f) => {
        const vendas = f.vendas.map((v) => ({ quantidadeVendida: v.quantidade, cmvReceita: custoPorcao(v.receitaId) }));
        const r = calcularFechamentoCmv(vendas, f.faturamento, f.estoqueInicial, f.compras, f.estoqueFinal);
        const custoTeorico = vendas.reduce((s, v) => s + v.quantidadeVendida * v.cmvReceita, 0);

        const perdas = producoes
          .filter((p) => p.status === "perda" && dentroDoPeriodo(p.criadoEm, f.periodoInicio, f.periodoFim))
          .map((p) => ({ producao: p, custo: p.quantidade * custoPorcao(p.receitaId) }))
          .sort((a, b) => b.custo - a.custo);
        const perdaRegistrada = perdas.reduce((s, p) => s + p.custo, 0);

        // Quanto do consumo acima das fichas tem causa registrada. Nunca passa do gap.
        const gapPositivo = Math.max(0, r.gapReais);
        const explicado = Math.min(perdaRegistrada, gapPositivo);
        const semExplicacao = gapPositivo - explicado;

        const pratos = f.vendas
          .map((v) => {
            const receita = receitaPorId.get(v.receitaId);
            const preco = receita?.precoVenda ?? null;
            const custo = custoPorcao(v.receitaId);
            const margemPct = preco ? ((preco - custo) / preco) * 100 : null;
            const meta = receita ? metaDoPrato(receita) : margemAlvoCliente * 100;
            const faturamentoPrato = preco ? preco * v.quantidade : null;
            const abaixo = margemPct !== null && preco ? Math.max(0, ((meta - margemPct) / 100) * preco * v.quantidade) : 0;
            return { receitaId: v.receitaId, nome: receita?.nomePrato ?? v.nomePrato, vendidos: v.quantidade, faturamentoPrato, margemPct, meta, abaixo };
          })
          .sort((a, b) => (b.faturamentoPrato ?? 0) - (a.faturamentoPrato ?? 0));

        // Parte do faturamento que vem de pratos com ficha e preço. O resto (bebida,
        // sobremesa, item sem ficha) consome estoque mas não entra no previsto, e
        // infla o "sem explicação" (lib/calculo/fechamentoCmv.ts, nota da seção 5.7).
        const faturamentoComFicha = pratos.reduce((s, p) => s + (p.faturamentoPrato ?? 0), 0);
        const faturamentoSemFicha = Math.max(0, f.faturamento - faturamentoComFicha);

        return {
          fechamento: f,
          faturamento: f.faturamento,
          faturamentoSemFicha,
          coberturaPct: f.faturamento > 0 ? (faturamentoComFicha / f.faturamento) * 100 : 100,
          pratosVendidos: f.vendas.reduce((s, v) => s + v.quantidade, 0),
          cmvTeoricoPct: r.cmvTeoricoPercentual * 100,
          cmvRealPct: r.cmvRealPercentual * 100,
          gapPct: r.gapPercentual * 100,
          gapReais: r.gapReais,
          custoTeorico,
          consumoReal: r.consumoReal,
          perdas,
          explicado,
          semExplicacao,
          pratos,
        };
      }),
    [fechamentosOrdenados, producoes, custoPorcao, receitaPorId, metaDoPrato, margemAlvoCliente],
  );

  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const relatorio = relatorios.find((r) => r.fechamento.id === selecionadoId) ?? relatorios[0] ?? null;
  const ultimo = relatorios[0] ?? null;

  // ---------- O que decidir agora ----------
  const pendencias = useMemo(() => {
    const lista: Pendencia[] = [];

    for (const local of locais) {
      const ultima = registrosTemperatura
        .filter((r) => r.localArmazenamentoId === local.id)
        .sort((a, b) => b.registradoEm.localeCompare(a.registradoEm))[0];
      if (!ultima) continue;
      const abaixo = local.temperaturaMinC != null && ultima.temperaturaC < local.temperaturaMinC;
      const acima = local.temperaturaMaxC != null && ultima.temperaturaC > local.temperaturaMaxC;
      if (abaixo || acima) {
        const faixa = `${local.temperaturaMinC != null ? formatQtd(local.temperaturaMinC) : "—"} a ${local.temperaturaMaxC != null ? formatQtd(local.temperaturaMaxC) : "—"} °C`;
        lista.push({
          tipo: "Temperatura",
          titulo: `${local.nome} a ${formatQtd(ultima.temperaturaC)} °C`,
          detalhe: `Faixa ${faixa}. Última leitura em ${dataBR(ultima.registradoEm, false)}, por ${ultima.responsavel}.`,
          reais: null,
          acao: "Verificar o equipamento",
          rota: "/seguranca",
        });
      }
    }

    if (ultimo && ultimo.gapPct > GAP_ALERTA_PP) {
      lista.push({
        tipo: "CMV",
        titulo: `Consumo ${pp(ultimo.gapPct)} acima das fichas no fechamento de ${rotuloPeriodo(ultimo.fechamento)}`,
        detalhe: [
          ultimo.explicado > 0
            ? `${formatBRL(ultimo.explicado)} são lotes perdidos registrados; ${formatBRL(ultimo.semExplicacao)} não têm causa registrada.`
            : "Nenhuma perda registrada no período explica a diferença.",
          ultimo.coberturaPct < COBERTURA_MINIMA_PCT
            ? `${formatPercent(100 - ultimo.coberturaPct, 0)} do faturamento vem de itens sem ficha, o que infla esse valor.`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
        reais: ultimo.semExplicacao > 0 ? ultimo.semExplicacao : ultimo.gapReais,
        rotuloReais: ultimo.semExplicacao > 0 ? "sem explicação" : "acima das fichas",
        acao: "Abrir o fechamento",
        rota: "/cmv",
      });
    }

    const vendasUltimo = new Map((ultimo?.fechamento.vendas ?? []).map((v) => [v.receitaId, v.quantidade]));
    for (const receita of receitas) {
      if (receita.tipo !== "prato_final" || !receita.precoVenda) continue;
      const custo = custoPorcao(receita.id);
      const margemPct = ((receita.precoVenda - custo) / receita.precoVenda) * 100;
      const meta = metaDoPrato(receita);
      if (margemPct >= meta) continue;
      const vendidos = vendasUltimo.get(receita.id) ?? receita.vendasMes ?? 0;
      const precoParaMeta = custo / (1 - meta / 100);
      lista.push({
        tipo: "Margem",
        titulo: `${receita.nomePrato} com margem de ${formatPercent(margemPct)}, meta ${formatPercent(meta, 0)}`,
        detalhe: `Pra bater a meta, o preço seria ${formatBRL(precoParaMeta)} (hoje ${formatBRL(receita.precoVenda)}), ou o custo da porção cai pra ${formatBRL(receita.precoVenda * (1 - meta / 100))}.`,
        reais: vendidos > 0 ? ((meta - margemPct) / 100) * receita.precoVenda * vendidos : null,
        rotuloReais: vendasUltimo.has(receita.id) ? "no último fechamento" : "por mês",
        acao: "Rever a ficha ou o preço",
        rota: "/receitas",
      });
    }

    for (const insumo of insumos) {
      if (insumo.estoque && insumo.estoque.saldoAtual < insumo.estoque.estoqueMinimo) {
        lista.push({
          tipo: "Estoque",
          titulo: `${insumo.nome} abaixo do mínimo`,
          detalhe: `${formatQtd(insumo.estoque.saldoAtual)} ${insumo.unidadeMedida} em estoque, mínimo de ${formatQtd(insumo.estoque.estoqueMinimo)} ${insumo.unidadeMedida}.`,
          reais: null,
          acao: "Repor",
          rota: "/estoque",
        });
      }
    }

    const fcPorInsumo = new Map<string, number[]>();
    for (const p of processamentos) fcPorInsumo.set(p.insumoId, [...(fcPorInsumo.get(p.insumoId) ?? []), p.fcObservado]);
    for (const insumo of insumos) {
      const fcs = fcPorInsumo.get(insumo.id);
      if (!fcs?.length) continue;
      const fcObs = fcs.reduce((s, v) => s + v, 0) / fcs.length;
      const diferenca = ((fcObs - insumo.fatorCorrecao) / insumo.fatorCorrecao) * 100;
      if (diferenca > 2) {
        lista.push({
          tipo: "Rendimento",
          titulo: `${insumo.nome} rende menos que o cadastrado`,
          detalhe: `FC medido ${formatNumero(fcObs, 2)} contra ${formatNumero(insumo.fatorCorrecao, 2)} no cadastro (${plural(fcs.length, "lote", "lotes")}). O custo das fichas já usa o FC medido; vale conversar com o fornecedor ou rever o corte.`,
          reais: null,
          acao: "Ver os lotes",
          rota: "/proteinas",
        });
      }
    }

    return lista.sort((a, b) => PESO_TIPO[a.tipo] - PESO_TIPO[b.tipo] || (b.reais ?? -1) - (a.reais ?? -1));
  }, [locais, registrosTemperatura, ultimo, receitas, insumos, processamentos, custoPorcao, metaDoPrato]);

  // ---------- Por responsável, dentro do período selecionado ----------
  const porResponsavel = useMemo(() => {
    if (!relatorio) return [];
    const { periodoInicio: ini, periodoFim: fim } = relatorio.fechamento;
    const lotes = processamentos.filter((p) => dentroDoPeriodo(p.processadoEm, ini, fim));
    const prods = producoes.filter((p) => dentroDoPeriodo(p.criadoEm, ini, fim));
    const temps = registrosTemperatura.filter((r) => dentroDoPeriodo(r.registradoEm, ini, fim));
    const nomes = new Set<string>([...lotes.map((p) => p.responsavel), ...prods.map((p) => p.responsavel), ...temps.map((r) => r.responsavel)]);
    return [...nomes]
      .filter((n) => n && n !== "A definir")
      .map((nome) => {
        const seus = lotes.filter((p) => p.responsavel === nome);
        const descarteMedio = seus.length ? (seus.reduce((s, p) => s + p.pesoDescartePuro / p.pesoBrutoRecebido, 0) / seus.length) * 100 : null;
        const perdas = prods.filter((p) => p.status === "perda" && p.responsavel === nome).length;
        const foraDaFaixa = temps.filter((r) => {
          if (r.responsavel !== nome) return false;
          const local = locais.find((l) => l.id === r.localArmazenamentoId);
          return !!local && ((local.temperaturaMinC != null && r.temperaturaC < local.temperaturaMinC) || (local.temperaturaMaxC != null && r.temperaturaC > local.temperaturaMaxC));
        }).length;
        return { nome, producoes: prods.filter((p) => p.responsavel === nome).length, lotesProteina: seus.length, descarteMedio, perdas, foraDaFaixa };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [relatorio, processamentos, producoes, registrosTemperatura, locais]);

  const [destaque, setDestaque] = useState<"previsto" | "registrada" | "sem" | null>(null);

  // Imprime sempre no tema claro (PDF escuro gasta tinta e fica ilegível no papel).
  const imprimir = () => {
    const raiz = document.documentElement;
    const temaAntes = raiz.getAttribute("data-theme");
    raiz.setAttribute("data-theme", "light");
    const restaurar = () => {
      if (temaAntes) raiz.setAttribute("data-theme", temaAntes);
      window.removeEventListener("afterprint", restaurar);
    };
    window.addEventListener("afterprint", restaurar);
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-12">
      {/* ================= O que decidir agora ================= */}
      <section aria-labelledby="titulo-agora" className="space-y-4 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="titulo-agora" className="text-[22px] font-semibold tracking-tight text-[var(--tinta)]">O que decidir agora</h2>
            <p className="text-[14px] text-[var(--tinta-sub)] mt-1">
              Estado de hoje, a partir do que já está cadastrado nas outras telas. Muda sozinho, sem esperar o fechamento.
            </p>
          </div>
          <span className="text-[13px] text-[var(--tinta-faint)]">{plural(pendencias.length, "pendência", "pendências")}</span>
        </div>

        <div className="rounded-xl border overflow-hidden" style={painel}>
          {pendencias.length === 0 ? (
            <div className="px-5 py-8 flex items-center gap-3 text-[14px] text-[var(--tinta-sub)]">
              <CheckCircle size={18} style={{ color: "var(--sucesso)" }} />
              Nada pendente: temperaturas na faixa, pratos na meta, estoque acima do mínimo e rendimento dentro do cadastrado.
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--linha)" }}>
              {pendencias.map((p, i) => (
                <li key={i}>
                  <Link
                    href={`${basePath}${p.rota}`}
                    className="group grid grid-cols-[auto_minmax(0,1fr)_auto] md:grid-cols-[112px_minmax(0,1fr)_auto_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 min-h-[var(--alvo-toque)] transition-colors hover:bg-[var(--panel-hover)]"
                  >
                    <span className="flex items-center gap-2 text-[13px] font-medium" style={{ color: COR_TIPO[p.tipo] }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: COR_TIPO[p.tipo] }} aria-hidden />
                      {p.tipo}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-medium text-[var(--tinta)]">{p.titulo}</span>
                      <span className="block text-[13px] text-[var(--tinta-sub)] mt-0.5">{p.detalhe}</span>
                    </span>
                    <span className="text-right whitespace-nowrap">
                      {p.reais !== null ? (
                        <>
                          <span className="block text-[15px] font-semibold" style={{ color: "var(--sinal)" }}>{formatBRL(p.reais)}</span>
                          <span className="block text-[12px] text-[var(--tinta-faint)]">{p.rotuloReais}</span>
                        </>
                      ) : null}
                    </span>
                    <span className="hidden md:flex items-center gap-1.5 text-[13px] text-[var(--tinta-sub)] group-hover:text-[var(--tinta)] whitespace-nowrap">
                      {p.acao}
                      <ArrowRight size={14} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ================= Relatório do fechamento ================= */}
      <section aria-labelledby="titulo-fechamento" className="space-y-5">
        {/* Cabeçalho que só aparece no papel/PDF. */}
        <div className="hidden print:block pb-3 mb-2 border-b" style={{ borderColor: "var(--linha-forte)" }}>
          <div className="text-[12px] text-[var(--tinta-faint)]">Ficha Técnica{nomeRestaurante ? ` · ${nomeRestaurante}` : ""}</div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="titulo-fechamento" className="text-[22px] font-semibold tracking-tight text-[var(--tinta)]">
              Relatório do fechamento{relatorio ? <span className="hidden print:inline"> · {rotuloPeriodo(relatorio.fechamento)}</span> : null}
            </h2>
            <p className="text-[14px] text-[var(--tinta-sub)] mt-1">
              {relatorio
                ? `${dataBR(relatorio.fechamento.periodoInicio)} a ${dataBR(relatorio.fechamento.periodoFim)}, fechado em ${dataBR(relatorio.fechamento.fechadoEm)}. Custos com as fichas de hoje.`
                : "Aparece depois do primeiro fechamento de CMV."}
            </p>
          </div>

          {relatorios.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <div className="inline-flex p-0.5 rounded-lg border max-w-full overflow-x-auto" style={{ background: "var(--panel-elevated)", borderColor: "var(--linha)" }} role="tablist" aria-label="Fechamento">
                {relatorios.map((r) => {
                  const ativo = r.fechamento.id === relatorio?.fechamento.id;
                  return (
                    <button
                      key={r.fechamento.id}
                      role="tab"
                      aria-selected={ativo}
                      onClick={() => setSelecionadoId(r.fechamento.id)}
                      className="px-3 min-h-10 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors"
                      style={{
                        background: ativo ? "var(--panel)" : "transparent",
                        color: ativo ? "var(--tinta)" : "var(--tinta-sub)",
                        boxShadow: ativo ? "var(--shadow-sm)" : "none",
                      }}
                    >
                      {rotuloCurto(r.fechamento)}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={imprimir}
                className="inline-flex items-center gap-2 px-3.5 min-h-10 rounded-lg border text-[13px] font-medium text-[var(--tinta)] hover:bg-[var(--panel-hover)]"
                style={{ borderColor: "var(--linha-forte)", background: "var(--panel)" }}
              >
                <Printer size={15} />
                Imprimir ou salvar PDF
              </button>
            </div>
          )}
        </div>

        {!relatorio ? (
          <div className="rounded-xl border px-5 py-8 text-[14px] text-[var(--tinta-sub)]" style={painel}>
            Nenhum fechamento de CMV ainda. Feche o primeiro período em{" "}
            <Link href={`${basePath}/cmv`} className="font-medium text-[var(--tinta)] underline underline-offset-2">
              Fechamento de CMV
            </Link>{" "}
            pra ver aqui quanto a cozinha gastou além das fichas e por quê.
          </div>
        ) : (
          <>
            {/* Faixa de métricas do período (mesmo padrão da Visão Geral). */}
            <div className="rounded-xl border grid grid-cols-2 lg:grid-cols-4 break-inside-avoid" style={painel}>
              {[
                { rotulo: "Faturamento", valor: formatBRL(relatorio.faturamento), detalhe: plural(relatorio.pratosVendidos, "prato vendido", "pratos vendidos"), risco: false },
                { rotulo: "CMV pelas fichas", valor: formatPercent(relatorio.cmvTeoricoPct), detalhe: formatBRL(relatorio.custoTeorico), risco: false },
                { rotulo: "CMV pelo estoque", valor: formatPercent(relatorio.cmvRealPct), detalhe: formatBRL(relatorio.consumoReal), risco: relatorio.gapPct > GAP_ALERTA_PP },
                {
                  rotulo: "Diferença",
                  valor: pp(relatorio.gapPct),
                  detalhe: relatorio.gapPct > GAP_ALERTA_PP ? `acima de ${GAP_ALERTA_PP} p.p. vale investigar` : "dentro do ruído normal",
                  risco: relatorio.gapPct > GAP_ALERTA_PP,
                },
              ].map((m, i) => (
                <div
                  key={m.rotulo}
                  className={`p-5 ${i > 0 ? "lg:border-l" : ""} ${i % 2 === 1 ? "border-l lg:border-l" : ""} ${i >= 2 ? "border-t lg:border-t-0" : ""}`}
                  style={{ borderColor: "var(--linha)" }}
                >
                  <div className="text-[13px] text-[var(--tinta-sub)]">{m.rotulo}</div>
                  <div className="text-[28px] font-semibold tracking-tight leading-none mt-2" style={{ color: m.risco ? "var(--sinal)" : "var(--tinta)" }}>
                    {m.valor}
                  </div>
                  <div className="text-[12px] mt-2.5 text-[var(--tinta-faint)]">{m.detalhe}</div>
                </div>
              ))}
            </div>

            {/* Para onde foi o consumo: a quebra aberta em partes. */}
            <Bloco
              titulo="Para onde foi o dinheiro do estoque"
              subtitulo="Tudo o que saiu do estoque no período, separado entre o que as fichas previam e o que passou disso."
            >
              {relatorio.coberturaPct < COBERTURA_MINIMA_PCT && (
                <div className="mx-5 mb-4 rounded-lg px-4 py-3 text-[13px] break-inside-avoid" style={{ background: "color-mix(in srgb, var(--aviso) 10%, transparent)", color: "var(--tinta-sub)" }}>
                  <span className="font-medium" style={{ color: "var(--aviso)" }}>
                    {formatBRL(relatorio.faturamentoSemFicha)} do faturamento ({formatPercent(100 - relatorio.coberturaPct, 0)}) vem de itens sem ficha técnica.{" "}
                  </span>
                  Bebidas, sobremesas e o que mais não tem ficha consomem estoque sem entrar no previsto, então parte do valor sem explicação é isso.
                  Cadastre as fichas que faltam em{" "}
                  <Link href={`${basePath}/receitas`} className="font-medium text-[var(--tinta)] underline underline-offset-2 print:no-underline">
                    Receitas e fichas
                  </Link>{" "}
                  pra este número ficar exato.
                </div>
              )}
              {relatorio.gapReais > 0 ? (
                <div className="px-5 pb-5 space-y-4">
                  <div
                    className="flex h-3 w-full rounded-[4px] overflow-hidden gap-[2px]"
                    role="img"
                    aria-label={`Consumo do estoque ${formatBRL(relatorio.consumoReal)}: ${formatBRL(relatorio.custoTeorico)} previsto pelas fichas, ${formatBRL(relatorio.explicado)} em perdas registradas e ${formatBRL(relatorio.semExplicacao)} sem explicação.`}
                  >
                    {[
                      { chave: "previsto" as const, valor: relatorio.custoTeorico, cor: COR_PREVISTO },
                      { chave: "registrada" as const, valor: relatorio.explicado, cor: COR_PERDA_REGISTRADA },
                      { chave: "sem" as const, valor: relatorio.semExplicacao, cor: COR_SEM_EXPLICACAO },
                    ]
                      .filter((s) => s.valor > 0)
                      .map((s) => (
                        <div
                          key={s.chave}
                          className="h-full transition-opacity"
                          style={{ width: `${(s.valor / relatorio.consumoReal) * 100}%`, background: s.cor, opacity: destaque && destaque !== s.chave ? 0.35 : 1, minWidth: 4 }}
                          onMouseEnter={() => setDestaque(s.chave)}
                          onMouseLeave={() => setDestaque(null)}
                        />
                      ))}
                  </div>

                  <table className="w-full text-[14px]">
                    <thead className="sr-only">
                      <tr>
                        <th>Parte</th>
                        <th>Valor</th>
                        <th>Do faturamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { chave: "previsto" as const, cor: COR_PREVISTO, rotulo: "Previsto pelas fichas", nota: "o que os pratos vendidos deviam consumir", valor: relatorio.custoTeorico },
                        {
                          chave: "registrada" as const,
                          cor: COR_PERDA_REGISTRADA,
                          rotulo: "Perda registrada",
                          nota: relatorio.perdas.length ? plural(relatorio.perdas.length, "lote descartado no quadro de produção", "lotes descartados no quadro de produção") : "nenhum lote descartado no período",
                          valor: relatorio.explicado,
                        },
                        { chave: "sem" as const, cor: COR_SEM_EXPLICACAO, rotulo: "Sem explicação", nota: "saiu do estoque sem virar prato vendido nem perda registrada", valor: relatorio.semExplicacao },
                      ].map((l) => (
                        <tr
                          key={l.chave}
                          className="border-t transition-colors"
                          style={{ borderColor: "var(--linha)", background: destaque === l.chave ? "var(--panel-hover)" : undefined }}
                          onMouseEnter={() => setDestaque(l.chave)}
                          onMouseLeave={() => setDestaque(null)}
                        >
                          <td className="py-2.5 pr-3">
                            <span className="flex items-start gap-2.5">
                              <span className="mt-1.5 w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: l.cor }} aria-hidden />
                              <span>
                                <span className="block font-medium text-[var(--tinta)]">{l.rotulo}</span>
                                <span className="block text-[13px] text-[var(--tinta-faint)]">{l.nota}</span>
                              </span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium whitespace-nowrap" style={{ color: l.chave === "sem" && l.valor > 0 ? "var(--sinal)" : "var(--tinta)" }}>
                            {formatBRL(l.valor)}
                          </td>
                          <td className="py-2.5 pl-3 text-right text-[13px] text-[var(--tinta-faint)] whitespace-nowrap w-28">
                            {relatorio.faturamento > 0 ? `${formatPercent((l.valor / relatorio.faturamento) * 100)} do fat.` : "—"}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t" style={{ borderColor: "var(--linha-forte)" }}>
                        <td className="pt-2.5 pr-3 font-medium text-[var(--tinta)] pl-5">Saiu do estoque</td>
                        <td className="pt-2.5 px-3 text-right font-semibold text-[var(--tinta)] whitespace-nowrap">{formatBRL(relatorio.consumoReal)}</td>
                        <td className="pt-2.5 pl-3 text-right text-[13px] text-[var(--tinta-faint)] whitespace-nowrap">
                          {relatorio.faturamento > 0 ? `${formatPercent(relatorio.cmvRealPct)} do fat.` : "—"}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {relatorio.semExplicacao > 0 && (
                    <div className="rounded-lg px-4 py-3 text-[13px] text-[var(--tinta-sub)] break-inside-avoid" style={{ background: "var(--panel-elevated)" }}>
                      <span className="font-medium text-[var(--tinta)]">Onde costuma estar o que não tem explicação: </span>
                      porção servida maior que a da ficha, perda que ninguém registrou no quadro, proteína rendendo menos que o cadastro, nota de compra lançada no
                      período errado, contagem de estoque incompleta ou desvio.
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-5 pb-5 text-[14px] text-[var(--tinta-sub)]">
                  O estoque consumiu {formatBRL(Math.abs(relatorio.gapReais))} {relatorio.gapReais < 0 ? "a menos" : "a mais"} do que as fichas previam (
                  {formatBRL(relatorio.consumoReal)} contra {formatBRL(relatorio.custoTeorico)}).{" "}
                  {relatorio.gapReais < 0 &&
                    "Consumo abaixo das fichas costuma ser contagem de estoque final alta, compra que ainda não foi lançada ou ficha com porção maior que a servida."}
                </div>
              )}
            </Bloco>

            {/* Pratos do período. */}
            <Bloco
              titulo="Pratos vendidos no período"
              subtitulo="Ordenados por faturamento. A última coluna é quanto faltou pra cada prato bater a própria meta de margem."
            >
              <div className="overflow-x-auto">
                <table className="w-full text-[14px] min-w-[640px]">
                  <thead>
                    <tr className="text-left">
                      <th className="py-2.5 px-5">Prato</th>
                      <th className="py-2.5 px-3 text-right">Vendidos</th>
                      <th className="py-2.5 px-3 text-right">Faturamento</th>
                      <th className="py-2.5 px-3 text-right">Margem</th>
                      <th className="py-2.5 px-3 text-right">Meta</th>
                      <th className="py-2.5 px-5 text-right">Abaixo da meta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.pratos.map((p) => {
                      const abaixo = p.margemPct !== null && p.margemPct < p.meta;
                      return (
                        <tr key={p.receitaId} className="border-t" style={{ borderColor: "var(--linha)" }}>
                          <td className="py-3 px-5 font-medium text-[var(--tinta)]">{p.nome}</td>
                          <td className="py-3 px-3 text-right text-[var(--tinta-sub)]">{p.vendidos.toLocaleString("pt-BR")}</td>
                          <td className="py-3 px-3 text-right">{p.faturamentoPrato !== null ? formatBRL(p.faturamentoPrato) : "sem preço"}</td>
                          <td className="py-3 px-3 text-right font-medium" style={{ color: abaixo ? "var(--sinal)" : "var(--tinta)" }}>
                            {p.margemPct !== null ? formatPercent(p.margemPct) : "—"}
                          </td>
                          <td className="py-3 px-3 text-right text-[var(--tinta-faint)]">{formatPercent(p.meta, 0)}</td>
                          <td className="py-3 px-5 text-right whitespace-nowrap" style={{ color: p.abaixo > 0 ? "var(--sinal)" : "var(--tinta-faint)" }}>
                            {p.abaixo > 0 ? formatBRL(p.abaixo) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Bloco>

            {/* Perdas do período. */}
            <Bloco
              titulo="Lotes perdidos no período"
              subtitulo={
                relatorio.perdas.length
                  ? `${plural(relatorio.perdas.length, "lote descartado", "lotes descartados")}, ${formatBRL(relatorio.explicado)} a preço de ficha.`
                  : "Descartes registrados no quadro de produção."
              }
            >
              {relatorio.perdas.length === 0 ? (
                <p className="px-5 pb-5 text-[14px] text-[var(--tinta-sub)]">
                  Nenhum lote descartado entre {dataBR(relatorio.fechamento.periodoInicio, false)} e {dataBR(relatorio.fechamento.periodoFim, false)}.
                </p>
              ) : (
                <ul>
                  {relatorio.perdas.map(({ producao: p, custo }) => (
                    <li
                      key={p.id}
                      className="px-5 py-3.5 border-t grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)_auto] gap-x-6 gap-y-1 items-center"
                      style={{ borderColor: "var(--linha)" }}
                    >
                      <div className="min-w-0">
                        <div className="text-[14px] font-medium text-[var(--tinta)]">{receitaPorId.get(p.receitaId)?.nomePrato ?? p.nomeReceita}</div>
                        <div className="text-[12px] text-[var(--tinta-faint)]">
                          {formatQtd(p.quantidade)} {p.quantidade !== 1 && p.unidadeRendimento === "porção" ? "porções" : p.unidadeRendimento} · {dataBR(p.criadoEm, false)}
                          {p.nomeTurno ? ` · ${p.nomeTurno}` : ""} · {p.responsavel}
                        </div>
                      </div>
                      <div className="col-span-2 md:col-span-1 order-3 md:order-none text-[13px] text-[var(--tinta-sub)]">{p.motivoPerda || "Sem motivo registrado"}</div>
                      <div className="text-[15px] font-semibold text-right whitespace-nowrap" style={{ color: "var(--sinal)" }}>{formatBRL(custo)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Bloco>

            {/* Por responsável no período. */}
            <Bloco
              titulo="Por responsável"
              subtitulo="O que cada pessoa registrou no período. Serve pra treinar quem precisa, não pra punir: descarte alto pode ser técnica de corte, mas também pode ser matéria-prima ruim do fornecedor."
            >
              {porResponsavel.length === 0 ? (
                <p className="px-5 pb-5 text-[14px] text-[var(--tinta-sub)]">Ninguém registrou produção, lote de proteína ou temperatura neste período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[14px] min-w-[640px]">
                    <thead>
                      <tr className="text-left">
                        <th className="py-2.5 px-5">Responsável</th>
                        <th className="py-2.5 px-3 text-right">Produções</th>
                        <th className="py-2.5 px-3 text-right">Lotes de proteína</th>
                        <th className="py-2.5 px-3 text-right">Descarte médio</th>
                        <th className="py-2.5 px-3 text-right">Lotes perdidos</th>
                        <th className="py-2.5 px-5 text-right">Temperatura fora da faixa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {porResponsavel.map((d) => (
                        <tr key={d.nome} className="border-t" style={{ borderColor: "var(--linha)" }}>
                          <td className="py-3 px-5 font-medium text-[var(--tinta)]">{d.nome}</td>
                          <td className="py-3 px-3 text-right text-[var(--tinta-sub)]">{d.producoes || "—"}</td>
                          <td className="py-3 px-3 text-right text-[var(--tinta-sub)]">{d.lotesProteina || "—"}</td>
                          <td className="py-3 px-3 text-right" style={{ color: d.descarteMedio !== null && d.descarteMedio > DESCARTE_ALERTA_PCT ? "var(--sinal)" : "var(--tinta)" }}>
                            {d.descarteMedio !== null ? formatPercent(d.descarteMedio) : "—"}
                          </td>
                          <td className="py-3 px-3 text-right" style={{ color: d.perdas > 0 ? "var(--sinal)" : "var(--tinta-faint)" }}>{d.perdas || "—"}</td>
                          <td className="py-3 px-5 text-right" style={{ color: d.foraDaFaixa > 0 ? "var(--sinal)" : "var(--tinta-faint)" }}>{d.foraDaFaixa || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Bloco>
          </>
        )}
      </section>
    </div>
  );
}

function Bloco({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border overflow-hidden break-inside-avoid" style={painel}>
      <div className="px-5 pt-4 pb-3">
        <h3 className="text-[16px] font-semibold text-[var(--tinta)]">{titulo}</h3>
        <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5">{subtitulo}</p>
      </div>
      {children}
    </section>
  );
}
