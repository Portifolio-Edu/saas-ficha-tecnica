"use client";

// POLIMENTO visao-geral (2026-09-22) -- passe do Impeccable (polish) nesta tela.
// Cada mudança está marcada com "POLIMENTO visao-geral" e diz como era antes.
// Versão anterior inteira: commit e5e84b8. Pra desfazer só esta tela:
//   git revert <commit "Polimento visao-geral">   (desfaz a tela + réguas + estações)
// ou, arquivo a arquivo:
//   git checkout e5e84b8 -- src/app/visao-geral/VisaoGeralClient.tsx \
//     src/components/instrumentos/ReguaCalibrada.tsx src/components/instrumentos/MostradorNivel.tsx
// Registro geral dos polimentos: docs/POLIMENTO.md
//
// SISTEMA premium (2026-09-22) -- redesenho no padrão premium de SaaS (Stripe/
// Linear/Toast, contrato em .impeccable/surfaces). A tela passou a responder
// "onde a margem está vazando": faixa única de métricas, bloco de vazamentos
// ordenado em R$, tabela de margem por prato e carga das estações. Saíram o card-
// herói "Centro de Inteligência & Calibração Operacional", o selo "Motor
// operacional ativo" (status que não existe) e as 4 réguas calibradas em cards
// separados. A versão com réguas: `git show 32e3e97:src/app/visao-geral/VisaoGeralClient.tsx`
// (o componente ReguaCalibrada continua no repo, sem uso).

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { construirContexto, linhasCustoDetalhado } from "@/lib/dados/adaptadores";
import { calcularCmvReceita, calcularCustoPorPorcao } from "@/lib/calculo/cmv";
import { MostradorNivel } from "@/components/instrumentos/MostradorNivel";
import { formatBRL, formatPercent } from "@/components/charts/format";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";
import type { Processamento } from "@/lib/dominio/processamento";
import type { Producao } from "@/lib/dominio/producao";
import type { FechamentoCmv } from "@/lib/dominio/fechamentoCmv";
import { AlertTriangle, ChevronDown, ChevronUp, RotateCcw, CheckCircle, ArrowRight } from "lucide-react";

// POLIMENTO visao-geral: datas do fechamento em dd/mm/aaaa. Antes apareciam
// cruas em ISO ("2026-08-01 até 2026-08-31").
function dataBR(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

// POLIMENTO visao-geral: diferença entre porcentagens em pontos percentuais,
// com vírgula. Antes: `+${delta.toFixed(1)}%` ("+13.8%").
function deltaPp(delta: number): string {
  return `${delta >= 0 ? "+" : "−"}${Math.abs(delta).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} p.p.`;
}

// POLIMENTO visao-geral: tints seguem o tema. Antes: rgba(255, 59, 48, …) e
// rgba(16, 185, 129, …) fixos (o vermelho do tema escuro aparecia no claro).
const tint = (cor: string, pct: number) => `color-mix(in srgb, ${cor} ${pct}%, transparent)`;

// POLIMENTO visao-geral: colunas da tabela de pratos num grid único, pra os
// valores ficarem alinhados de uma linha pra outra. Antes cada linha era um
// flex com larguras próprias e as colunas "andavam".
// A última coluna tem largura fixa (cabe "Abaixo do alvo" + botão): com "auto"
// cada linha calculava a sua e as colunas voltavam a desalinhar.
const GRID_PRATOS = "md:grid md:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(88px,0.6fr))_minmax(0,1.3fr)_176px] md:items-center";

export function VisaoGeralClient({
  margemAlvoCliente,
  insumos,
  receitas,
  processamentos,
  producoes,
  fechamentos,
}: {
  margemAlvoCliente: number;
  insumos: Insumo[];
  receitas: Receita[];
  processamentos: Processamento[];
  producoes: Producao[];
  fechamentos: FechamentoCmv[];
}) {
  // Controle interativo do Alvo da Casa para demonstrar animação de calibração
  const [alvoManualPct, setAlvoManualPct] = useState<number>(Math.round(margemAlvoCliente * 100));
  const [filtroApenasRisco, setFiltroApenasRisco] = useState(false);
  const [pratoSelecionadoId, setPratoSelecionadoId] = useState<string | null>(null);
  // POLIMENTO visao-geral: pro link "Abrir quadro de produção" funcionar na demo e no app.
  const basePath = usePathname()?.startsWith("/preview") ? "/preview" : "";

  const contexto = useMemo(() => construirContexto(insumos, receitas, processamentos), [insumos, receitas, processamentos]);
  const insumoDominioPorId = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);
  const receitaDominioPorId = useMemo(() => new Map(receitas.map((r) => [r.id, r])), [receitas]);
  const pratos = useMemo(() => receitas.filter((r) => r.tipo === "prato_final"), [receitas]);

  const fechamentoRecente = fechamentos[0] ?? null;
  const vendasRecentes = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const v of fechamentoRecente?.vendas ?? []) mapa.set(v.receitaId, v.quantidade);
    return mapa;
  }, [fechamentoRecente]);

  // Linhas calculadas por prato
  const linhas = useMemo(
    () =>
      pratos.map((p) => {
        const custoPorPorcao = calcularCustoPorPorcao(p.id, contexto);
        const qtdVendida = vendasRecentes.get(p.id) ?? p.vendasMes ?? 0;
        const precoVenda = p.precoVenda;
        const margemAlvoPct = p.margemAlvo ? p.margemAlvo * 100 : alvoManualPct;
        const cmvPct = precoVenda ? (custoPorPorcao / precoVenda) * 100 : 0;
        const margemPct = precoVenda ? ((precoVenda - custoPorPorcao) / precoVenda) * 100 : 0;
        const lucroBrutoPorcao = precoVenda ? precoVenda - custoPorPorcao : 0;
        const abaixoDoAlvo = margemPct < margemAlvoPct;

        return {
          receita: p,
          custoPorPorcao,
          qtdVendida,
          precoVenda,
          margemAlvoPct,
          cmvPct,
          margemPct,
          lucroBrutoPorcao,
          abaixoDoAlvo,
        };
      }),
    [pratos, contexto, vendasRecentes, alvoManualPct],
  );

  const comPreco = useMemo(() => linhas.filter((l) => l.precoVenda !== null && (l.precoVenda ?? 0) > 0), [linhas]);
  const cmvMedio = comPreco.length > 0 ? comPreco.reduce((s, l) => s + l.cmvPct, 0) / comPreco.length : 0;
  const margemMedia = comPreco.length > 0 ? comPreco.reduce((s, l) => s + l.margemPct, 0) / comPreco.length : 0;
  const pratosEmRisco = comPreco.filter((l) => l.abaixoDoAlvo);
  const totalAbaixoDoAlvo = pratosEmRisco.length;

  // Cálculo de perdas operacionais
  const inicioMes = new Date();
  inicioMes.setDate(1);
  const prefixoMes = inicioMes.toISOString().slice(0, 7);
  const nomeMes = inicioMes.toLocaleDateString("pt-BR", { month: "long" });

  const perdasDoMes = useMemo(
    () => producoes.filter((p) => p.status === "perda" && p.criadoEm.startsWith(prefixoMes)),
    [producoes, prefixoMes],
  );

  const perdaTotalReais = useMemo(
    () =>
      perdasDoMes.reduce((soma, p) => {
        const receitaCalc = contexto.receitaPorId.get(p.receitaId);
        if (!receitaCalc || receitaCalc.rendimento <= 0) return soma;
        const custoDoLote = calcularCmvReceita(p.receitaId, contexto) * (p.quantidade / receitaCalc.rendimento);
        return soma + custoDoLote;
      }, 0),
    [perdasDoMes, contexto],
  );

  const perdasRecentes = useMemo(
    () => [...producoes].filter((p) => p.status === "perda").sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)).slice(0, 5),
    [producoes],
  );

  const pratosExibidos = filtroApenasRisco ? pratosEmRisco : comPreco;

  // SISTEMA premium: quanto cada prato abaixo do alvo deixou de ganhar no período
  // (pontos de margem que faltam × preço × vendidas) e quanto custaram as perdas
  // do mês. É a resposta de "onde a margem está vazando", em R$.
  const vazamentosPratos = pratosEmRisco
    .map((l) => ({
      linha: l,
      reais: Math.max(0, ((l.margemAlvoPct - l.margemPct) / 100) * (l.precoVenda ?? 0) * l.qtdVendida),
      precoParaAlvo: l.custoPorPorcao / (1 - l.margemAlvoPct / 100),
    }))
    .sort((a, b) => b.reais - a.reais);
  const vazamentosPerdas = perdasDoMes
    .map((p) => {
      const receitaCalc = contexto.receitaPorId.get(p.receitaId);
      const custo = receitaCalc && receitaCalc.rendimento > 0 ? calcularCmvReceita(p.receitaId, contexto) * (p.quantidade / receitaCalc.rendimento) : 0;
      return { producao: p, custo };
    })
    .sort((a, b) => b.custo - a.custo);
  const totalVazando = vazamentosPratos.reduce((s, v) => s + v.reais, 0) + perdaTotalReais;
  const periodoFechamento = fechamentoRecente ? `${dataBR(fechamentoRecente.periodoInicio)} a ${dataBR(fechamentoRecente.periodoFim)}` : null;
  // perdasRecentes fica calculado pra quem quiser a lista de todos os meses; a tela mostra as do mês no bloco de vazamentos.
  void perdasRecentes;

  const metricas: { rotulo: string; valor: string; risco: boolean; detalhe: string }[] = [
    {
      rotulo: "CMV médio",
      valor: formatPercent(cmvMedio),
      risco: cmvMedio > 32,
      detalhe: `alvo até 32% · ${deltaPp(cmvMedio - 32)}`,
    },
    {
      rotulo: "Margem média",
      valor: formatPercent(margemMedia),
      risco: margemMedia < alvoManualPct,
      detalhe: `alvo ${alvoManualPct}% · ${deltaPp(margemMedia - alvoManualPct)}`,
    },
    {
      rotulo: `Perda em ${nomeMes}`,
      valor: formatBRL(perdaTotalReais),
      risco: perdaTotalReais > 0,
      detalhe: `${perdasDoMes.length} ${perdasDoMes.length === 1 ? "lote descartado" : "lotes descartados"}`,
    },
    {
      rotulo: "Pratos abaixo do alvo",
      valor: `${totalAbaixoDoAlvo} de ${comPreco.length}`,
      risco: totalAbaixoDoAlvo > 0,
      detalhe: totalAbaixoDoAlvo > 0 ? "ver abaixo onde está vazando" : "todos no alvo",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Cabeçalho da página: período e meta. SISTEMA premium: substitui o card-herói. */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-[var(--tinta)]">Resumo do mês</h2>
          <p className="text-[14px] text-[var(--tinta-sub)] mt-1">
            {periodoFechamento ? (
              <>
                Último fechamento {periodoFechamento} · faturamento <span className="font-medium text-[var(--tinta)]">{formatBRL(fechamentoRecente!.faturamento)}</span>
              </>
            ) : (
              "Sem fechamento de CMV ainda. As margens usam as vendas cadastradas nas fichas."
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 px-3 min-h-[var(--alvo-toque)] rounded-lg border self-start lg:self-auto" style={{ background: "var(--panel)", borderColor: "var(--linha)" }}>
          <label htmlFor="meta-casa" className="text-[13px] text-[var(--tinta-sub)] whitespace-nowrap">Meta de margem</label>
          <span className="text-[15px] font-semibold text-[var(--tinta)] w-10 text-right">{alvoManualPct}%</span>
          <input
            id="meta-casa"
            type="range"
            min="45"
            max="80"
            step="1"
            value={alvoManualPct}
            onChange={(e) => setAlvoManualPct(Number(e.target.value))}
            className="w-28 cursor-pointer"
            style={{ accentColor: "var(--marca)" }}
          />
          <button
            onClick={() => setAlvoManualPct(Math.round(margemAlvoCliente * 100))}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--tinta-sub)] hover:text-[var(--tinta)] hover:bg-[var(--panel-hover)]"
            title="Voltar à meta cadastrada"
            aria-label="Voltar à meta cadastrada"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Faixa de métricas: um painel, quatro colunas separadas por linha fina (padrão Stripe). */}
      <section aria-label="Métricas do mês" className="rounded-xl border grid grid-cols-2 lg:grid-cols-4" style={{ background: "var(--panel)", borderColor: "var(--linha)", boxShadow: "var(--shadow-card)" }}>
        {metricas.map((m, i) => (
          <div
            key={m.rotulo}
            className={`p-5 ${i > 0 ? "lg:border-l" : ""} ${i % 2 === 1 ? "border-l lg:border-l" : ""} ${i >= 2 ? "border-t lg:border-t-0" : ""}`}
            style={{ borderColor: "var(--linha)" }}
          >
            <div className="text-[13px] text-[var(--tinta-sub)]">{m.rotulo}</div>
            <div className="text-[28px] font-semibold tracking-tight leading-none mt-2" style={{ color: m.risco ? "var(--sinal)" : "var(--tinta)" }}>
              {m.valor}
            </div>
            <div className="text-[12px] mt-2.5 flex items-center gap-1.5 text-[var(--tinta-faint)]">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.risco ? "var(--sinal)" : "var(--sucesso)" }} aria-hidden />
              {m.detalhe}
            </div>
          </div>
        ))}
      </section>

      {/* Onde a margem está vazando -- o momento da tela (contrato, FIRST VIEWPORT). */}
      <section className="rounded-xl border" style={{ background: "var(--panel)", borderColor: "var(--linha)", boxShadow: "var(--shadow-card)" }}>
        <div className="px-5 py-4 flex flex-wrap items-baseline justify-between gap-3 border-b" style={{ borderColor: "var(--linha)" }}>
          <div>
            <h3 className="text-[16px] font-semibold text-[var(--tinta)]">Onde a margem está vazando</h3>
            <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5">Pratos abaixo do alvo no último fechamento e perdas registradas em {nomeMes}.</p>
          </div>
          {totalVazando > 0 && (
            <div className="text-right">
              <div className="text-[22px] font-semibold tracking-tight" style={{ color: "var(--sinal)" }}>{formatBRL(totalVazando)}</div>
              <div className="text-[12px] text-[var(--tinta-faint)]">deixados na mesa</div>
            </div>
          )}
        </div>

        {vazamentosPratos.length === 0 && vazamentosPerdas.length === 0 ? (
          <div className="px-5 py-8 flex items-center gap-3 text-[14px] text-[var(--tinta-sub)]">
            <CheckCircle size={18} style={{ color: "var(--sucesso)" }} />
            Nenhum vazamento: todos os pratos estão no alvo e não há perda registrada no mês.
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--linha)" }}>
            {vazamentosPratos.map((v) => (
              <li key={v.linha.receita.id} className="px-5 py-3.5 grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_auto] items-center gap-x-6 gap-y-1">
                <div className="min-w-0">
                  <div className="text-[14px] font-medium text-[var(--tinta)]">{v.linha.receita.nomePrato}</div>
                  <div className="text-[12px] text-[var(--tinta-faint)]">Margem abaixo do alvo</div>
                </div>
                <div className="col-span-2 md:col-span-1 order-3 md:order-none text-[13px] text-[var(--tinta-sub)]">
                  Margem {formatPercent(v.linha.margemPct)} com alvo de {v.linha.margemAlvoPct}% em {v.linha.qtdVendida} vendidas. Pra chegar no alvo, o preço seria{" "}
                  <span className="font-medium text-[var(--tinta)] whitespace-nowrap">{formatBRL(v.precoParaAlvo)}</span>.
                </div>
                <div className="text-[15px] font-semibold text-right whitespace-nowrap" style={{ color: "var(--sinal)" }}>{formatBRL(v.reais)}</div>
              </li>
            ))}
            {vazamentosPerdas.map(({ producao: p, custo }) => (
              <li key={p.id} className="px-5 py-3.5 grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_auto] items-center gap-x-6 gap-y-1">
                <div className="min-w-0">
                  <div className="text-[14px] font-medium text-[var(--tinta)]">{receitaDominioPorId.get(p.receitaId)?.nomePrato ?? p.nomeReceita}</div>
                  <div className="text-[12px] text-[var(--tinta-faint)]">
                    Perda · {p.quantidade.toLocaleString("pt-BR")} {p.quantidade !== 1 && p.unidadeRendimento === "porção" ? "porções" : p.unidadeRendimento} ·{" "}
                    {new Date(p.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </div>
                </div>
                <div className="col-span-2 md:col-span-1 order-3 md:order-none text-[13px] text-[var(--tinta-sub)]">{p.motivoPerda || "Sem motivo registrado"}</div>
                <div className="text-[15px] font-semibold text-right whitespace-nowrap" style={{ color: "var(--sinal)" }}>{formatBRL(custo)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Margem por prato. SISTEMA premium: mesma tabela alinhada, com pesos e selos calmos. */}
      <section className="rounded-xl border overflow-hidden" style={{ background: "var(--panel)", borderColor: "var(--linha)", boxShadow: "var(--shadow-card)" }}>
        <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3" style={{ borderColor: "var(--linha)" }}>
          <div>
            <h3 className="text-[16px] font-semibold text-[var(--tinta)]">Margem por prato</h3>
            <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5">
              {comPreco.length} pratos com preço, comparados à meta de {alvoManualPct}% (ou à meta própria do prato).
            </p>
          </div>
          <div className="inline-flex p-0.5 rounded-lg border" style={{ background: "var(--panel-elevated)", borderColor: "var(--linha)" }} role="tablist" aria-label="Filtro de pratos">
            {[
              { ativo: !filtroApenasRisco, rotulo: `Todos (${comPreco.length})`, onClick: () => setFiltroApenasRisco(false) },
              { ativo: filtroApenasRisco, rotulo: `Abaixo do alvo (${totalAbaixoDoAlvo})`, onClick: () => setFiltroApenasRisco(true) },
            ].map((b) => (
              <button
                key={b.rotulo}
                role="tab"
                aria-selected={b.ativo}
                onClick={b.onClick}
                className="px-3 min-h-9 rounded-md text-[13px] font-medium transition-colors"
                style={{
                  background: b.ativo ? "var(--panel)" : "transparent",
                  color: b.ativo ? "var(--tinta)" : "var(--tinta-sub)",
                  boxShadow: b.ativo ? "var(--shadow-sm)" : "none",
                }}
              >
                {b.rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className={`hidden px-5 py-2.5 gap-5 text-[12px] font-medium text-[var(--tinta-faint)] border-b ${GRID_PRATOS}`} style={{ borderColor: "var(--linha)" }}>
          <span>Prato</span>
          <span className="text-right">Preço</span>
          <span className="text-right whitespace-nowrap">Custo / porção</span>
          <span className="text-right whitespace-nowrap">Lucro / porção</span>
          <span>Margem vs alvo</span>
          <span className="sr-only">Status</span>
        </div>

        <div className="divide-y" style={{ borderColor: "var(--linha)" }}>
          {pratosExibidos.map((item) => {
            const ehSelecionado = pratoSelecionadoId === item.receita.id;
            const sobRisco = item.abaixoDoAlvo;
            const delta = item.margemPct - item.margemAlvoPct;
            const corStatus = sobRisco ? "var(--sinal)" : "var(--sucesso)";

            return (
              <div key={item.receita.id} style={{ backgroundColor: ehSelecionado ? "var(--panel-elevated)" : "transparent" }}>
                <div
                  className={`px-5 py-3.5 flex flex-col gap-3 md:gap-5 cursor-pointer hover:bg-[var(--panel-hover)] transition-colors ${GRID_PRATOS}`}
                  onClick={() => setPratoSelecionadoId(ehSelecionado ? null : item.receita.id)}
                >
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium leading-snug text-[var(--tinta)]">{item.receita.nomePrato}</div>
                    <div className="text-[12px] text-[var(--tinta-faint)] mt-0.5">
                      {item.receita.categoria} · <span className="whitespace-nowrap">{item.qtdVendida} vendidas</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 md:contents">
                    <div className="md:text-right">
                      <div className="md:hidden text-[12px] text-[var(--tinta-faint)]">Preço</div>
                      <div className="text-[14px] font-medium text-[var(--tinta)] whitespace-nowrap">{formatBRL(item.precoVenda ?? 0)}</div>
                    </div>
                    <div className="md:text-right">
                      <div className="md:hidden text-[12px] text-[var(--tinta-faint)]">Custo / porção</div>
                      <div className="text-[14px] text-[var(--tinta-sub)] whitespace-nowrap">{formatBRL(item.custoPorPorcao)}</div>
                    </div>
                    <div className="md:text-right">
                      <div className="md:hidden text-[12px] text-[var(--tinta-faint)]">Lucro / porção</div>
                      <div className="text-[14px] font-medium text-[var(--tinta)] whitespace-nowrap">{formatBRL(item.lucroBrutoPorcao)}</div>
                    </div>
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className="md:hidden text-[12px] text-[var(--tinta-faint)]">Margem</span>
                      <span className="text-[14px] font-semibold whitespace-nowrap" style={{ color: sobRisco ? "var(--sinal)" : "var(--tinta)" }}>
                        {formatPercent(item.margemPct)}
                      </span>
                      <span className="text-[12px] whitespace-nowrap" style={{ color: corStatus }} title={`Alvo: ${item.margemAlvoPct}%`}>
                        {deltaPp(delta)}
                      </span>
                    </div>
                    {/* Trilho de 40% a 85% de margem; o traço é o alvo. */}
                    <div className="w-full h-1.5 rounded-full relative" style={{ background: "var(--panel-elevated)" }}>
                      <div
                        className="absolute -top-1 -bottom-1 w-[2px] rounded-full -translate-x-1/2"
                        style={{ left: `${Math.min(100, Math.max(0, ((item.margemAlvoPct - 40) / 45) * 100))}%`, background: "var(--tinta-faint)" }}
                        title={`Alvo: ${item.margemAlvoPct}%`}
                      />
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, ((item.margemPct - 40) / 45) * 100))}%`, background: sobRisco ? "var(--sinal)" : "var(--tinta)" }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-2 shrink-0">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[12px] font-medium whitespace-nowrap"
                      style={{ backgroundColor: tint(corStatus, 10), color: corStatus }}
                    >
                      {sobRisco ? "Abaixo do alvo" : "No alvo"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPratoSelecionadoId(ehSelecionado ? null : item.receita.id);
                      }}
                      className="w-10 h-10 flex items-center justify-center rounded-lg text-[var(--tinta-sub)] hover:text-[var(--tinta)] hover:bg-[var(--panel-hover)]"
                      aria-expanded={ehSelecionado}
                      aria-label={`${ehSelecionado ? "Fechar" : "Ver"} composição de ${item.receita.nomePrato}`}
                    >
                      {ehSelecionado ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                    </button>
                  </div>
                </div>

                {ehSelecionado && (
                  <div className="px-5 pb-5 pt-1 space-y-4 animate-fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <p className="text-[13px] text-[var(--tinta-sub)]">
                        Rende {item.receita.rendimento} {item.receita.unidadeRendimento} · custo por porção {formatBRL(item.custoPorPorcao)}
                      </p>
                      <div
                        className="px-3 py-2 rounded-lg flex items-center gap-2 text-[13px]"
                        style={{ backgroundColor: tint(corStatus, 8), color: corStatus }}
                      >
                        {sobRisco ? <AlertTriangle size={15} /> : <CheckCircle size={15} />}
                        <span>
                          {sobRisco
                            ? `Pra chegar a ${item.margemAlvoPct}% de margem, o preço precisa ser ${formatBRL(item.custoPorPorcao / (1 - item.margemAlvoPct / 100))}.`
                            : `Margem acima do alvo de ${item.margemAlvoPct}%.`}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--linha)", background: "var(--panel)" }}>
                      <div className="px-4 py-2 text-[12px] font-medium text-[var(--tinta-faint)] border-b" style={{ borderColor: "var(--linha)" }}>
                        Itens da ficha técnica
                      </div>
                      <div className="divide-y" style={{ borderColor: "var(--linha)" }}>
                        {linhasCustoDetalhado(item.receita, insumoDominioPorId, receitaDominioPorId, contexto.lotesProteina, contexto).map((linha) => (
                          <div key={linha.id} className="px-4 py-2.5 flex items-center justify-between gap-4 text-[14px]">
                            <span className="text-[var(--tinta)]">{linha.nome}</span>
                            <div className="flex items-center gap-5 text-[var(--tinta-sub)]">
                              <span className="whitespace-nowrap">
                                {linha.pesoLiquido.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {linha.unidade}
                              </span>
                              <span className="font-medium text-[var(--tinta)] whitespace-nowrap">{formatBRL(linha.custo)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Carga das estações */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[16px] font-semibold text-[var(--tinta)]">Carga das estações</h3>
          <Link href={`${basePath}/producoes`} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--tinta-sub)] hover:text-[var(--tinta)]">
            Abrir quadro de produção <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MostradorNivel
            rotulo="Pré-preparo"
            totalLotes={producoes.filter((p) => p.tipo === "preparo" && p.status !== "perda").length}
            capacidadeMax={10}
            statusTexto="Capacidade ok"
            emRisco={false}
          />
          <MostradorNivel
            rotulo="Pratos finais"
            totalLotes={producoes.filter((p) => p.tipo === "prato" && p.status !== "perda").length}
            capacidadeMax={12}
            statusTexto="Fluxo estável"
            emRisco={false}
          />
          <MostradorNivel
            rotulo="Em execução"
            totalLotes={producoes.filter((p) => p.status === "em_producao").length}
            capacidadeMax={8}
            statusTexto={producoes.filter((p) => p.status === "em_producao").length > 6 ? "Sobrecarga" : "Normal"}
            emRisco={producoes.filter((p) => p.status === "em_producao").length > 6}
          />
        </div>
      </section>
    </div>
  );
}
