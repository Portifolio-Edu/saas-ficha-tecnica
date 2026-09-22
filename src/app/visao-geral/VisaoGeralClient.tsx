"use client";

// POLIMENTO visao-geral (2026-09-22) -- passe do Impeccable (polish) nesta tela.
// Cada mudança está marcada com "POLIMENTO visao-geral" e diz como era antes.
// Versão anterior inteira: commit e5e84b8. Pra desfazer só esta tela:
//   git revert <commit "Polimento visao-geral">   (desfaz a tela + réguas + estações)
// ou, arquivo a arquivo:
//   git checkout e5e84b8 -- src/app/visao-geral/VisaoGeralClient.tsx \
//     src/components/instrumentos/ReguaCalibrada.tsx src/components/instrumentos/MostradorNivel.tsx
// Registro geral dos polimentos: docs/POLIMENTO.md

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { construirContexto, linhasCustoDetalhado } from "@/lib/dados/adaptadores";
import { calcularCmvReceita, calcularCustoPorPorcao } from "@/lib/calculo/cmv";
import { ReguaCalibrada } from "@/components/instrumentos/ReguaCalibrada";
import { MostradorNivel } from "@/components/instrumentos/MostradorNivel";
import { formatBRL, formatPercent } from "@/components/charts/format";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";
import type { Processamento } from "@/lib/dominio/processamento";
import type { Producao } from "@/lib/dominio/producao";
import type { FechamentoCmv } from "@/lib/dominio/fechamentoCmv";
import {
  Sliders,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Activity,
  Layers,
  UtensilsCrossed,
  CheckCircle,
} from "lucide-react";

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
const GRID_PRATOS = "md:grid md:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(88px,0.6fr))_minmax(0,1.4fr)_196px] md:items-center";

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

  // POLIMENTO visao-geral: saiu "select-none" do container -- impedia copiar valores da tela.
  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans pb-12">
      {/* 1. Hero Command Strip (Apple Pro / Material 3 Surface com Alta Legibilidade) */}
      <div
        className="p-6 md:p-8 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all"
        style={{
          backgroundColor: "var(--panel)",
          borderColor: "var(--linha)",
          boxShadow: "var(--shadow-elevated)",
        }}
      >
        <div className="flex items-start md:items-center gap-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm"
            style={{
              backgroundColor: "var(--panel-elevated)",
              borderColor: "var(--linha-forte)",
              color: "var(--tinta)",
            }}
          >
            <Activity size={28} strokeWidth={2} className="text-[var(--tinta)]" />
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[20px] md:text-[23px] font-black tracking-tight text-[var(--tinta)]">
                Centro de Inteligência & Calibração Operacional
              </h2>
              <span
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-extrabold tracking-wide uppercase shadow-sm"
                style={{
                  // POLIMENTO visao-geral: tint do tema (antes rgba fixo) e ponto sem pulsar
                  // (antes animate-pulse contínuo -- movimento sem informação nova).
                  backgroundColor: tint("var(--sucesso)", 15),
                  color: "var(--sucesso)",
                  border: `1px solid ${tint("var(--sucesso)", 35)}`,
                }}
              >
                <span className="w-2 h-2 rounded-full bg-[var(--sucesso)]" />
                MOTOR OPERACIONAL ATIVO
              </span>
            </div>
            <p className="text-[14px] md:text-[15px] font-semibold text-[var(--tinta-sub)]">
              {fechamentoRecente
                ? `Ciclo vigente: ${dataBR(fechamentoRecente.periodoInicio)} a ${dataBR(fechamentoRecente.periodoFim)} · Faturamento: ${formatBRL(fechamentoRecente.faturamento)}`
                : "Monitoramento em tempo real de fichas técnicas, CMV e lucratividade de cozinha"}
            </p>
          </div>
        </div>

        {/* Dynamic Margin Calibration Controller - Grande e Acessível */}
        <div
          // POLIMENTO visao-geral: controle mais compacto (gap-3, px-4, slider w-28) pro título
          // do topo caber numa linha. Antes: gap-4 px-5 e slider w-32/w-36.
          className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-2xl border self-stretch sm:self-start lg:self-center shadow-sm lg:shrink-0"
          style={{
            backgroundColor: "var(--panel-elevated)",
            borderColor: "var(--linha-forte)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <Sliders size={18} className="text-[var(--tinta-sub)]" />
            {/* POLIMENTO visao-geral: whitespace-nowrap -- antes "META DA / CASA:" quebrava em duas linhas. */}
            <span className="text-[13px] font-extrabold text-[var(--tinta-sub)] uppercase tracking-wide whitespace-nowrap">
              Meta da casa
            </span>
            <span className="text-[18px] md:text-[20px] font-black text-[var(--tinta)]">
              {alvoManualPct}%
            </span>
          </div>

          <input
            type="range"
            min="45"
            max="80"
            step="1"
            value={alvoManualPct}
            onChange={(e) => setAlvoManualPct(Number(e.target.value))}
            className="w-28 accent-[var(--tinta)] cursor-pointer h-2"
            aria-label="Meta de margem da casa"
            title="Ajuste interativo da meta de margem para recalibrar os pratos"
          />

          <button
            onClick={() => setAlvoManualPct(Math.round(margemAlvoCliente * 100))}
            className="p-2 rounded-xl border hover:bg-[var(--accent-soft)] transition-colors text-[var(--tinta-sub)] hover:text-[var(--tinta)] shadow-sm"
            style={{ borderColor: "var(--linha-forte)" }}
            title="Restaurar meta padrão da casa"
            aria-label="Restaurar meta padrão da casa"
          >
            <RotateCcw size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* 2. Master Metrics Grid (Apple Pro / Adidas Athletic Telemetry Cards com Fontes Grandes) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: CMV Médio */}
        <div
          className="p-6 rounded-2xl border flex flex-col justify-between transition-all hover:border-[var(--linha-forte)] shadow-sm"
          style={{
            backgroundColor: "var(--panel)",
            borderColor: "var(--linha)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <ReguaCalibrada
            rotulo="CMV Médio Operacional"
            valor={cmvMedio}
            meta={32}
            toleranciaMin={28}
            toleranciaMax={35}
            min={15}
            max={50}
            unidade="%"
            inverso={true}
            ticks={[15, 25, 35, 50]}
          />
        </div>

        {/* KPI 2: Margem Real Média */}
        <div
          className="p-6 rounded-2xl border flex flex-col justify-between transition-all hover:border-[var(--linha-forte)] shadow-sm"
          style={{
            backgroundColor: "var(--panel)",
            borderColor: "var(--linha)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <ReguaCalibrada
            rotulo="Margem Real Média"
            valor={margemMedia}
            meta={alvoManualPct}
            toleranciaMin={alvoManualPct}
            toleranciaMax={85}
            min={40}
            max={85}
            unidade="%"
            inverso={false}
            ticks={[40, 55, 70, 85]}
          />
        </div>

        {/* KPI 3: Pratos Fora do Alvo */}
        <div
          className="p-6 rounded-2xl border flex flex-col justify-between transition-all hover:border-[var(--linha-forte)] shadow-sm"
          style={{
            backgroundColor: "var(--panel)",
            // POLIMENTO visao-geral: só a borda sinaliza risco. Antes havia também um halo
            // vermelho "0 0 24px -4px rgba(255, 59, 48, 0.2)" em volta do card.
            borderColor: totalAbaixoDoAlvo > 0 ? tint("var(--sinal)", 40) : "var(--linha)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <ReguaCalibrada
            rotulo="Pratos Fora do Alvo"
            valor={totalAbaixoDoAlvo}
            meta={0}
            toleranciaMin={0}
            toleranciaMax={0}
            min={0}
            max={comPreco.length || 6}
            unidade=" un"
            formatoValor={(v) => `${v} / ${comPreco.length}`}
            // POLIMENTO visao-geral: antes "0 desvios", "+1.0 un vs meta" e escala fixa
            // [0, 2, 4, 6] mesmo quando o cardápio tinha outro número de pratos.
            formatoMeta={(m) => (m === 0 ? "nenhum" : `${m} pratos`)}
            formatoDelta={(d) => `${d > 0 ? "+" : ""}${d} ${Math.abs(d) === 1 ? "prato" : "pratos"}`}
            inverso={true}
            emRisco={totalAbaixoDoAlvo > 0}
            ticks={[0, Math.round((comPreco.length || 6) / 2), comPreco.length || 6]}
          />
        </div>

        {/* KPI 4: Perda Operacional */}
        <div
          className="p-6 rounded-2xl border flex flex-col justify-between transition-all hover:border-[var(--linha-forte)] shadow-sm"
          style={{
            backgroundColor: "var(--panel)",
            // POLIMENTO visao-geral: sem halo vermelho (ver card acima).
            borderColor: perdaTotalReais > 0 ? tint("var(--sinal)", 40) : "var(--linha)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <ReguaCalibrada
            rotulo={`Perda Operacional (${nomeMes})`}
            valor={perdaTotalReais}
            meta={0}
            toleranciaMin={0}
            toleranciaMax={0}
            min={0}
            max={500}
            unidade=""
            formatoValor={(v) => formatBRL(v)}
            formatoMeta={(m) => formatBRL(m)}
            // POLIMENTO visao-geral: antes "+201.0 vs meta", sem R$.
            formatoDelta={(d) => `${d > 0 ? "+" : "−"}${formatBRL(Math.abs(d))}`}
            inverso={true}
            emRisco={perdaTotalReais > 0}
            ticks={[0, 100, 250, 500]}
          />
        </div>
      </div>

      {/* 3. Engenharia de Cardápio: Matriz de Produtos com Alta Legibilidade */}
      <div
        className="rounded-2xl border overflow-hidden shadow-sm"
        style={{
          backgroundColor: "var(--panel)",
          borderColor: "var(--linha)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Header da Matriz */}
        <div
          className="p-6 border-b flex flex-wrap items-center justify-between gap-5"
          style={{ borderColor: "var(--linha)" }}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <UtensilsCrossed size={22} className="text-[var(--tinta-sub)]" />
              <h3 className="text-[18px] md:text-[20px] font-black tracking-tight text-[var(--tinta)]">
                Engenharia de Cardápio & Performance Unitária
              </h3>
              <span
                className="text-[12px] font-extrabold px-3 py-1 rounded-full shadow-sm"
                style={{
                  backgroundColor: "var(--panel-elevated)",
                  color: "var(--tinta-sub)",
                  border: "1px solid var(--linha-forte)",
                }}
              >
                {comPreco.length} ITENS CADASTRADOS
              </span>
            </div>
            <p className="text-[14px] font-semibold text-[var(--tinta-sub)]">
              Calibração individual de lucratividade por prato comparada com a meta calibrada da casa ({alvoManualPct}%).
            </p>
          </div>

          {/* Segmented Filter Pills Grandes */}
          <div
            className="flex items-center p-1.5 rounded-2xl border gap-1.5 shadow-sm"
            style={{
              backgroundColor: "var(--panel-elevated)",
              borderColor: "var(--linha-forte)",
            }}
          >
            <button
              onClick={() => setFiltroApenasRisco(false)}
              className={`px-4 py-2 rounded-xl text-[13px] md:text-[14px] font-extrabold transition-all ${
                !filtroApenasRisco
                  ? "bg-[var(--tinta)] text-[var(--panel)] shadow-sm"
                  : "text-[var(--tinta-sub)] hover:text-[var(--tinta)]"
              }`}
            >
              Todos ({comPreco.length})
            </button>
            <button
              onClick={() => setFiltroApenasRisco(true)}
              className={`px-4 py-2 rounded-xl text-[13px] md:text-[14px] font-extrabold flex items-center gap-2 transition-all ${
                filtroApenasRisco
                  ? "bg-[var(--sinal)] text-white shadow-sm"
                  : totalAbaixoDoAlvo > 0
                  ? "text-[var(--sinal)] hover:bg-[var(--danger-soft)]"
                  : "text-[var(--tinta-sub)] hover:text-[var(--tinta)]"
              }`}
            >
              {/* POLIMENTO visao-geral: ponto sem pulsar (antes animate-pulse). */}
              {totalAbaixoDoAlvo > 0 && <span className="w-2 h-2 rounded-full bg-current" />}
              Em Risco ({totalAbaixoDoAlvo})
            </button>
          </div>
        </div>

        {/* POLIMENTO visao-geral: cabeçalho único de colunas no desktop. Antes cada linha
            repetia "PREÇO VENDA", "CUSTO / PORÇÃO", "LUCRO BRUTO", "MARGEM REAL". */}
        <div
          className={`hidden px-6 py-2.5 gap-5 text-[11px] font-bold uppercase tracking-wide text-[var(--tinta-sub)] border-b ${GRID_PRATOS}`}
          style={{ borderColor: "var(--linha)", backgroundColor: "var(--panel-elevated)" }}
        >
          <span>Prato</span>
          <span className="text-right">Preço</span>
          <span className="text-right whitespace-nowrap">Custo / porção</span>
          <span className="text-right whitespace-nowrap">Lucro / porção</span>
          <span>Margem real vs alvo</span>
          <span className="sr-only">Status</span>
        </div>

        {/* Lista de pratos */}
        <div className="divide-y" style={{ borderColor: "var(--linha)" }}>
          {pratosExibidos.map((item) => {
            const ehSelecionado = pratoSelecionadoId === item.receita.id;
            const sobRisco = item.abaixoDoAlvo;
            const delta = item.margemPct - item.margemAlvoPct;

            return (
              <div
                key={item.receita.id}
                className="transition-colors"
                style={{
                  backgroundColor: ehSelecionado ? "var(--accent-soft)" : "transparent",
                }}
              >
                {/* Linha do prato.
                    POLIMENTO visao-geral: colunas no grid GRID_PRATOS (alinhadas entre linhas);
                    rótulos por linha só no celular (no desktop há um cabeçalho único acima);
                    saiu o avatar com as 2 primeiras letras ("PI" repetia nas duas pizzas);
                    o nome não é mais cortado com "..."; "Lucro bruto" virou "Lucro / porção"
                    (é preço menos custo da porção); delta em p.p. com vírgula; sem glow na barra.
                    Antes: flex com md:w-1/4, md:w-1/3 etc. -- ver commit e5e84b8. */}
                <div
                  className={`p-5 md:px-6 md:py-4 flex flex-col gap-4 md:gap-5 cursor-pointer hover:bg-[var(--panel-hover)] transition-colors ${GRID_PRATOS}`}
                  onClick={() => setPratoSelecionadoId(ehSelecionado ? null : item.receita.id)}
                >
                  {/* Prato */}
                  <div className="min-w-0">
                    <div className="text-[16px] font-black leading-snug text-[var(--tinta)]">{item.receita.nomePrato}</div>
                    <div className="text-[12.5px] font-bold text-[var(--tinta-sub)] mt-0.5">
                      <span className="uppercase tracking-wide">{item.receita.categoria}</span>
                      <span className="mx-1.5">·</span>
                      <span className="whitespace-nowrap">{item.qtdVendida} vendidas</span>
                    </div>
                  </div>

                  {/* Preço, custo e lucro por porção */}
                  <div className="grid grid-cols-3 gap-4 md:contents">
                    <div className="md:text-right">
                      <div className="md:hidden text-[11px] uppercase font-bold text-[var(--tinta-sub)]">Preço</div>
                      <div className="text-[16px] font-black text-[var(--tinta)] whitespace-nowrap">{formatBRL(item.precoVenda ?? 0)}</div>
                    </div>
                    <div className="md:text-right">
                      <div className="md:hidden text-[11px] uppercase font-bold text-[var(--tinta-sub)]">Custo / porção</div>
                      <div className="text-[15px] font-bold text-[var(--tinta-sub)] whitespace-nowrap">{formatBRL(item.custoPorPorcao)}</div>
                    </div>
                    <div className="md:text-right">
                      <div className="md:hidden text-[11px] uppercase font-bold text-[var(--tinta-sub)]">Lucro / porção</div>
                      <div className="text-[16px] font-black text-[var(--sucesso)] whitespace-nowrap">{formatBRL(item.lucroBrutoPorcao)}</div>
                    </div>
                  </div>

                  {/* Margem real vs alvo */}
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="md:hidden text-[11px] font-bold text-[var(--tinta-sub)] uppercase">Margem real</span>
                      <div className="flex items-center gap-2 md:ml-0 ml-auto">
                        <span
                          className="text-[17px] font-black whitespace-nowrap"
                          style={{ color: sobRisco ? "var(--sinal)" : "var(--tinta)" }}
                        >
                          {formatPercent(item.margemPct)}
                        </span>
                        <span
                          className="text-[11.5px] font-black px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{
                            backgroundColor: tint(sobRisco ? "var(--sinal)" : "var(--sucesso)", 14),
                            color: sobRisco ? "var(--sinal)" : "var(--sucesso)",
                          }}
                          title={`Alvo: ${item.margemAlvoPct}%`}
                        >
                          {deltaPp(delta)}
                        </span>
                      </div>
                    </div>

                    {/* Trilho: 40% a 85% de margem; o traço vertical é o alvo */}
                    <div className="w-full h-3 rounded-full bg-[var(--panel-elevated)] relative overflow-visible border border-[var(--linha-forte)] shadow-inner">
                      <div
                        className="absolute top-[-3px] bottom-[-3px] w-[3px] bg-[var(--tinta-sub)] z-10 -translate-x-1/2 rounded-full"
                        style={{ left: `${Math.min(100, Math.max(0, ((item.margemAlvoPct - 40) / 45) * 100))}%` }}
                        title={`Alvo: ${item.margemAlvoPct}%`}
                      />
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(0, ((item.margemPct - 40) / 45) * 100))}%`,
                          backgroundColor: sobRisco ? "var(--sinal)" : "var(--tinta)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Status + expandir */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                    <span
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11.5px] font-extrabold tracking-wide uppercase whitespace-nowrap"
                      style={{
                        backgroundColor: tint(sobRisco ? "var(--sinal)" : "var(--sucesso)", 14),
                        color: sobRisco ? "var(--sinal)" : "var(--sucesso)",
                        border: `1px solid ${tint(sobRisco ? "var(--sinal)" : "var(--sucesso)", 40)}`,
                      }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sobRisco ? "var(--sinal)" : "var(--sucesso)" }} />
                      {/* POLIMENTO visao-geral: antes "CALIBRADO"; "No alvo" é o que o dono de restaurante fala. */}
                      {sobRisco ? "Abaixo do alvo" : "No alvo"}
                    </span>

                    {/* POLIMENTO visao-geral: o botão agora alterna sozinho e informa aria-expanded
                        (antes dependia do clique na linha e não dizia se estava aberto). */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPratoSelecionadoId(ehSelecionado ? null : item.receita.id);
                      }}
                      className="p-2 rounded-xl text-[var(--tinta-sub)] hover:text-[var(--tinta)] hover:bg-[var(--panel-elevated)] transition-colors border"
                      style={{ borderColor: "var(--linha-forte)" }}
                      aria-expanded={ehSelecionado}
                      aria-label={`${ehSelecionado ? "Fechar" : "Ver"} composição de ${item.receita.nomePrato}`}
                    >
                      {ehSelecionado ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Painel de Auditoria & Detalhamento Expansível com Fontes Claras */}
                {ehSelecionado && (
                  <div
                    className="p-6 md:p-8 border-t bg-[var(--panel-elevated)] space-y-5 animate-fade-in"
                    style={{ borderColor: "var(--linha)" }}
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        {/* POLIMENTO visao-geral: título em caixa normal. Antes "AUDITORIA DE COMPOSIÇÃO · X" em caixa alta. */}
                        <h4 className="text-[16px] font-black text-[var(--tinta)]">
                          Composição de {item.receita.nomePrato}
                        </h4>
                        <p className="text-[14px] font-bold text-[var(--tinta-sub)] mt-1">
                          Rende {item.receita.rendimento} {item.receita.unidadeRendimento} · Custo por porção: {formatBRL(item.custoPorPorcao)}
                        </p>
                      </div>

                      {sobRisco ? (
                        <div
                          className="px-4 py-3 rounded-2xl border flex items-center gap-3 text-[13px] md:text-[14px] font-bold shadow-sm"
                          style={{
                            backgroundColor: tint("var(--sinal)", 12),
                            borderColor: tint("var(--sinal)", 35),
                            color: "var(--sinal)",
                          }}
                        >
                          <AlertTriangle size={18} />
                          <span>
                            {/* POLIMENTO visao-geral: texto mais direto. Antes "Recomendação Operacional: Ajustar preço de venda para X para alcançar a meta de Y%." */}
                            Para chegar a {item.margemAlvoPct}% de margem, o preço precisa ser {formatBRL(item.custoPorPorcao / (1 - item.margemAlvoPct / 100))}.
                          </span>
                        </div>
                      ) : (
                        <div
                          className="px-4 py-3 rounded-2xl border flex items-center gap-3 text-[13px] md:text-[14px] font-bold shadow-sm"
                          style={{
                            backgroundColor: tint("var(--sucesso)", 12),
                            borderColor: tint("var(--sucesso)", 35),
                            color: "var(--sucesso)",
                          }}
                        >
                          <CheckCircle size={18} />
                          {/* POLIMENTO visao-geral: antes "Margem saudável, calibrada e acima do patamar de segurança operacional da casa." */}
                          <span>Margem acima do alvo de {item.margemAlvoPct}%.</span>
                        </div>
                      )}
                    </div>

                    {/* Ingredientes / Sub-receitas */}
                    <div className="rounded-2xl border bg-[var(--panel)] overflow-hidden shadow-sm" style={{ borderColor: "var(--linha-forte)" }}>
                      <div className="px-5 py-3 border-b text-[12px] uppercase font-black text-[var(--tinta-sub)] bg-[var(--panel-elevated)]" style={{ borderColor: "var(--linha)" }}>
                        Itens da ficha técnica
                      </div>
                      <div className="divide-y" style={{ borderColor: "var(--linha)" }}>
                        {/* POLIMENTO visao-geral: custo por item vem de linhasCustoDetalhado (o mesmo
                            de Receitas & Fichas e do CMV), que aplica o fator de correção e a conversão
                            de unidade. Antes: pesoLiquido × preço, sem FC -- a soma dos itens não batia
                            com o custo da porção mostrado acima. Quantidade com vírgula (antes "0.3"). */}
                        {linhasCustoDetalhado(item.receita, insumoDominioPorId, receitaDominioPorId, contexto.lotesProteina, contexto).map((linha) => (
                          <div key={linha.id} className="px-5 py-3.5 flex items-center justify-between gap-4 text-[14px]">
                            <span className="font-bold text-[var(--tinta)]">{linha.nome}</span>
                            <div className="flex items-center gap-5 font-extrabold text-[var(--tinta-sub)]">
                              <span className="whitespace-nowrap">
                                {linha.pesoLiquido.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {linha.unidade}
                              </span>
                              <span className="font-black text-[var(--tinta)] whitespace-nowrap">{formatBRL(linha.custo)}</span>
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
      </div>

      {/* 4. Estações de produção */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Layers size={22} className="text-[var(--tinta-sub)]" />
            <h3 className="text-[18px] md:text-[20px] font-black tracking-tight text-[var(--tinta)]">
              Estações Operacionais & Carga de Bancada
            </h3>
          </div>
          {/* POLIMENTO visao-geral: virou link pro quadro de produção. Antes era um rótulo
              solto "KANBAN DE PRODUÇÃO ATIVA", sem ação. */}
          <Link
            href={`${basePath}/producoes`}
            className="text-[13px] font-bold text-[var(--tinta-sub)] hover:text-[var(--tinta)] underline underline-offset-4 decoration-[var(--linha-forte)]"
          >
            Abrir quadro de produção
          </Link>
        </div>

        {/* POLIMENTO visao-geral: saíram os códigos "EST · 01/02/03" e o "Estação" repetido
            nos nomes (o título da seção já diz). Antes: "Estação Pré-Preparo" + "EST · 01". */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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

        {/* Perdas recentes.
            POLIMENTO visao-geral: virou lista legível (prato, quantidade com a unidade certa,
            motivo, custo, data). Antes: faixa vermelha com o título em caixa alta
            "REGISTROS RECENTES DE DESCARTE / PERDA (1 EVENTOS):", no máximo 3 chips e
            quantidade sempre em "un" mesmo pra porção/kg. Custo usa a mesma conta do KPI
            "Perda operacional" (CMV do lote proporcional à quantidade). */}
        {perdasRecentes.length > 0 && (
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ backgroundColor: "var(--panel)", borderColor: "var(--linha)", boxShadow: "var(--shadow-card)" }}
          >
            <div className="px-5 py-3.5 flex items-center justify-between gap-3 border-b" style={{ borderColor: "var(--linha)" }}>
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="text-[var(--sinal)]" />
                <h3 className="text-[16px] font-black text-[var(--tinta)]">Perdas recentes</h3>
              </div>
              <span className="text-[13px] font-bold text-[var(--tinta-sub)]">
                {perdasRecentes.length} {perdasRecentes.length === 1 ? "registro" : "registros"}
              </span>
            </div>
            <ul className="divide-y" style={{ borderColor: "var(--linha)" }}>
              {perdasRecentes.map((p) => {
                const receitaCalc = contexto.receitaPorId.get(p.receitaId);
                const custo =
                  receitaCalc && receitaCalc.rendimento > 0
                    ? calcularCmvReceita(p.receitaId, contexto) * (p.quantidade / receitaCalc.rendimento)
                    : null;
                return (
                  <li
                    key={p.id}
                    className="px-5 py-3 grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,2fr)_auto_auto] items-center gap-x-5 gap-y-1 text-[14px]"
                  >
                    <span className="font-black text-[var(--tinta)]">{receitaDominioPorId.get(p.receitaId)?.nomePrato ?? p.nomeReceita}</span>
                    <span className="font-bold text-[var(--tinta)] whitespace-nowrap text-right md:text-left">
                      {p.quantidade.toLocaleString("pt-BR")} {p.quantidade !== 1 && p.unidadeRendimento === "porção" ? "porções" : p.unidadeRendimento}
                    </span>
                    <span className="col-span-2 md:col-span-1 text-[13px] font-semibold text-[var(--tinta-sub)]">{p.motivoPerda || "Sem motivo registrado"}</span>
                    <span className="font-black text-[var(--sinal)] whitespace-nowrap">{custo !== null ? formatBRL(custo) : "—"}</span>
                    <span className="text-[12.5px] font-semibold text-[var(--tinta-sub)] whitespace-nowrap text-right">
                      {new Date(p.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
