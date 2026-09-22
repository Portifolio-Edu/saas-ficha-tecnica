"use client";

import { useMemo, useState } from "react";
import { construirContexto } from "@/lib/dados/adaptadores";
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

  return (
    <div className="max-w-7xl mx-auto space-y-8 select-none font-sans pb-12">
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
                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                  color: "var(--sucesso)",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                }}
              >
                <span className="w-2 h-2 rounded-full bg-[var(--sucesso)] animate-pulse" />
                MOTOR OPERACIONAL ATIVO
              </span>
            </div>
            <p className="text-[14px] md:text-[15px] font-semibold text-[var(--tinta-sub)]">
              {fechamentoRecente
                ? `Ciclo Vigente: ${fechamentoRecente.periodoInicio} até ${fechamentoRecente.periodoFim} · Faturamento: ${formatBRL(fechamentoRecente.faturamento)}`
                : "Monitoramento em tempo real de fichas técnicas, CMV e lucratividade de cozinha"}
            </p>
          </div>
        </div>

        {/* Dynamic Margin Calibration Controller - Grande e Acessível */}
        <div
          className="flex items-center gap-4 px-5 py-3 rounded-2xl border self-start lg:self-center shadow-sm"
          style={{
            backgroundColor: "var(--panel-elevated)",
            borderColor: "var(--linha-forte)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <Sliders size={18} className="text-[var(--tinta-sub)]" />
            <span className="text-[13px] font-extrabold text-[var(--tinta-sub)] uppercase tracking-wide">
              Meta da Casa:
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
            className="w-32 md:w-36 accent-[var(--tinta)] cursor-pointer h-2"
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
            codigo="CAL · 01"
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
            codigo="CAL · 02"
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
            borderColor: totalAbaixoDoAlvo > 0 ? "rgba(255, 59, 48, 0.4)" : "var(--linha)",
            boxShadow: totalAbaixoDoAlvo > 0 ? "var(--shadow-card), 0 0 24px -4px rgba(255, 59, 48, 0.2)" : "var(--shadow-card)",
          }}
        >
          <ReguaCalibrada
            rotulo="Pratos Fora do Alvo"
            codigo="CAL · 03"
            valor={totalAbaixoDoAlvo}
            meta={0}
            toleranciaMin={0}
            toleranciaMax={0}
            min={0}
            max={comPreco.length || 6}
            unidade=" un"
            formatoValor={(v) => `${v} / ${comPreco.length}`}
            formatoMeta={(m) => `${m} desvios`}
            inverso={true}
            emRisco={totalAbaixoDoAlvo > 0}
            ticks={[0, 2, 4, 6]}
          />
        </div>

        {/* KPI 4: Perda Operacional */}
        <div
          className="p-6 rounded-2xl border flex flex-col justify-between transition-all hover:border-[var(--linha-forte)] shadow-sm"
          style={{
            backgroundColor: "var(--panel)",
            borderColor: perdaTotalReais > 0 ? "rgba(255, 59, 48, 0.4)" : "var(--linha)",
            boxShadow: perdaTotalReais > 0 ? "var(--shadow-card), 0 0 24px -4px rgba(255, 59, 48, 0.2)" : "var(--shadow-card)",
          }}
        >
          <ReguaCalibrada
            rotulo={`Perda Operacional (${nomeMes})`}
            codigo="CAL · 04"
            valor={perdaTotalReais}
            meta={0}
            toleranciaMin={0}
            toleranciaMax={0}
            min={0}
            max={500}
            unidade=""
            formatoValor={(v) => formatBRL(v)}
            formatoMeta={(m) => formatBRL(m)}
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
              {totalAbaixoDoAlvo > 0 && <span className="w-2 h-2 rounded-full bg-current animate-pulse" />}
              Em Risco ({totalAbaixoDoAlvo})
            </button>
          </div>
        </div>

        {/* Lista de Pratos com Réguas de Calibração Integradas */}
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
                {/* Linha Principal Interativa com Alta Legibilidade */}
                <div
                  className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 cursor-pointer hover:bg-[var(--panel-hover)] transition-colors"
                  onClick={() => setPratoSelecionadoId(ehSelecionado ? null : item.receita.id)}
                >
                  {/* Informações Básicas do Prato */}
                  <div className="flex items-center gap-4 md:w-1/4 min-w-0">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border text-[15px] font-black shadow-sm"
                      style={{
                        backgroundColor: sobRisco ? "rgba(255, 59, 48, 0.15)" : "var(--panel-elevated)",
                        borderColor: sobRisco ? "rgba(255, 59, 48, 0.35)" : "var(--linha-forte)",
                        color: sobRisco ? "var(--sinal)" : "var(--tinta)",
                      }}
                    >
                      {item.receita.nomePrato.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[16px] md:text-[17px] font-black text-[var(--tinta)] truncate">
                          {item.receita.nomePrato}
                        </span>
                      </div>
                      <div className="text-[13px] font-bold text-[var(--tinta-sub)] flex items-center gap-2 mt-1">
                        <span className="uppercase tracking-wide">{item.receita.categoria}</span>
                        <span>·</span>
                        <span>{item.qtdVendida} un vendidas</span>
                      </div>
                    </div>
                  </div>

                  {/* Preços e Custo - Grandes e Claros */}
                  <div className="flex items-center justify-between md:justify-end gap-6 md:w-1/4">
                    <div>
                      <div className="text-[11px] md:text-[12px] uppercase font-bold text-[var(--tinta-sub)]">Preço Venda</div>
                      <div className="text-[16px] md:text-[18px] font-black text-[var(--tinta)]">
                        {formatBRL(item.precoVenda ?? 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] md:text-[12px] uppercase font-bold text-[var(--tinta-sub)]">Custo / Porção</div>
                      <div className="text-[15px] md:text-[16px] font-bold text-[var(--tinta-sub)]">
                        {formatBRL(item.custoPorPorcao)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] md:text-[12px] uppercase font-bold text-[var(--tinta-sub)]">Lucro Bruto</div>
                      <div className="text-[16px] md:text-[18px] font-black text-[var(--sucesso)]">
                        {formatBRL(item.lucroBrutoPorcao)}
                      </div>
                    </div>
                  </div>

                  {/* Mini Régua Calibrada Visual - Espessa e com Números Maiores */}
                  <div className="md:w-1/3 px-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-bold text-[var(--tinta-sub)] uppercase tracking-wide">
                          Margem Real
                        </span>
                        <div className="flex items-center gap-2.5">
                          <span
                            className="text-[16px] md:text-[18px] font-black"
                            style={{ color: sobRisco ? "var(--sinal)" : "var(--tinta)" }}
                          >
                            {formatPercent(item.margemPct)}
                          </span>
                          <span
                            className="text-[12px] font-black px-2 py-0.5 rounded-full shadow-sm"
                            style={{
                              backgroundColor: sobRisco ? "rgba(255, 59, 48, 0.15)" : "rgba(16, 185, 129, 0.15)",
                              color: sobRisco ? "var(--sinal)" : "var(--sucesso)",
                            }}
                          >
                            {delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                          </span>
                        </div>
                      </div>

                      {/* Micro Capsule Track de 12px de Altura */}
                      <div className="w-full h-3 rounded-full bg-[var(--panel-elevated)] relative overflow-visible border border-[var(--linha-forte)] shadow-inner">
                        {/* Target Marker */}
                        <div
                          className="absolute top-[-3px] bottom-[-3px] w-[3px] bg-[var(--tinta-sub)] z-10 -translate-x-1/2 rounded-full"
                          style={{ left: `${Math.min(100, Math.max(0, ((item.margemAlvoPct - 40) / 45) * 100))}%` }}
                          title={`Meta: ${item.margemAlvoPct}%`}
                        />
                        {/* Progress */}
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(0, ((item.margemPct - 40) / 45) * 100))}%`,
                            backgroundColor: sobRisco ? "var(--sinal)" : "var(--tinta)",
                            boxShadow: sobRisco ? "0 0 10px var(--sinal)" : "none",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expand / Status Pill Grande */}
                  <div className="flex items-center justify-between md:justify-end gap-3.5 shrink-0">
                    <span
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-extrabold tracking-wide uppercase shadow-sm"
                      style={{
                        backgroundColor: sobRisco ? "rgba(255, 59, 48, 0.15)" : "rgba(16, 185, 129, 0.15)",
                        color: sobRisco ? "var(--sinal)" : "var(--sucesso)",
                        border: `1px solid ${sobRisco ? "rgba(255, 59, 48, 0.4)" : "rgba(16, 185, 129, 0.4)"}`,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: sobRisco ? "var(--sinal)" : "var(--sucesso)" }}
                      />
                      {sobRisco ? "ABAIXO DA META" : "CALIBRADO"}
                    </span>

                    <button
                      className="p-2 rounded-xl text-[var(--tinta-sub)] hover:text-[var(--tinta)] hover:bg-[var(--panel-elevated)] transition-colors border"
                      style={{ borderColor: "var(--linha-forte)" }}
                      aria-label="Expandir detalhes do prato"
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
                        <h4 className="text-[16px] font-black uppercase tracking-wider text-[var(--tinta)]">
                          Auditoria de Composição · {item.receita.nomePrato}
                        </h4>
                        <p className="text-[14px] font-bold text-[var(--tinta-sub)] mt-1">
                          Rendimento Total: {item.receita.rendimento} {item.receita.unidadeRendimento} · Custo Final Unitário: {formatBRL(item.custoPorPorcao)}
                        </p>
                      </div>

                      {sobRisco ? (
                        <div
                          className="px-4 py-3 rounded-2xl border flex items-center gap-3 text-[13px] md:text-[14px] font-bold shadow-sm"
                          style={{
                            backgroundColor: "rgba(255, 59, 48, 0.12)",
                            borderColor: "rgba(255, 59, 48, 0.35)",
                            color: "var(--sinal)",
                          }}
                        >
                          <AlertTriangle size={18} />
                          <span>
                            Recomendação Operacional: Ajustar preço de venda para {formatBRL(item.custoPorPorcao / (1 - item.margemAlvoPct / 100))} para alcançar a meta de {item.margemAlvoPct}%.
                          </span>
                        </div>
                      ) : (
                        <div
                          className="px-4 py-3 rounded-2xl border flex items-center gap-3 text-[13px] md:text-[14px] font-bold shadow-sm"
                          style={{
                            backgroundColor: "rgba(16, 185, 129, 0.12)",
                            borderColor: "rgba(16, 185, 129, 0.35)",
                            color: "var(--sucesso)",
                          }}
                        >
                          <CheckCircle size={18} />
                          <span>Margem saudável, calibrada e acima do patamar de segurança operacional da casa.</span>
                        </div>
                      )}
                    </div>

                    {/* Ingredientes / Sub-receitas */}
                    <div className="rounded-2xl border bg-[var(--panel)] overflow-hidden shadow-sm" style={{ borderColor: "var(--linha-forte)" }}>
                      <div className="px-5 py-3 border-b text-[12px] uppercase font-black text-[var(--tinta-sub)] bg-[var(--panel-elevated)]" style={{ borderColor: "var(--linha)" }}>
                        Composição de Insumos da Ficha Técnica
                      </div>
                      <div className="divide-y" style={{ borderColor: "var(--linha)" }}>
                        {item.receita.ficha.map((linha, idx) => {
                          const insumo = linha.insumoId ? insumoDominioPorId.get(linha.insumoId) : null;
                          const subReceita = linha.subReceitaId ? receitaDominioPorId.get(linha.subReceitaId) : null;
                          const nomeItem = insumo?.nome ?? subReceita?.nomePrato ?? "Item sem cadastro";
                          const precoUnit = insumo?.precoUnitario ?? (subReceita ? calcularCustoPorPorcao(subReceita.id, contexto) : 0);
                          const custoItem = linha.pesoLiquido * precoUnit;
                          return (
                            <div key={idx} className="px-5 py-3.5 flex items-center justify-between text-[14px]">
                              <span className="font-bold text-[var(--tinta)]">
                                {nomeItem}
                              </span>
                              <div className="flex items-center gap-5 font-extrabold text-[var(--tinta-sub)]">
                                <span>{linha.pesoLiquido} {linha.unidade}</span>
                                <span className="font-black text-[var(--tinta)]">{formatBRL(custoItem)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Estações de Produção & Monitoramento de Bancada */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers size={22} className="text-[var(--tinta-sub)]" />
            <h3 className="text-[18px] md:text-[20px] font-black tracking-tight text-[var(--tinta)]">
              Estações Operacionais & Carga de Bancada
            </h3>
          </div>
          <span className="text-[13px] font-bold text-[var(--tinta-sub)] uppercase tracking-wider">
            Kanban de Produção Ativa
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <MostradorNivel
            rotulo="Estação Pré-Preparo"
            estacaoNumero="EST · 01"
            totalLotes={producoes.filter((p) => p.tipo === "preparo" && p.status !== "perda").length}
            capacidadeMax={10}
            statusTexto="CAPACIDADE NOMINAL"
            emRisco={false}
          />
          <MostradorNivel
            rotulo="Estação Pratos Finais"
            estacaoNumero="EST · 02"
            totalLotes={producoes.filter((p) => p.tipo === "prato" && p.status !== "perda").length}
            capacidadeMax={12}
            statusTexto="FLUXO ESTÁVEL"
            emRisco={false}
          />
          <MostradorNivel
            rotulo="Estação Em Execução"
            estacaoNumero="EST · 03"
            totalLotes={producoes.filter((p) => p.status === "em_producao").length}
            capacidadeMax={8}
            statusTexto={producoes.filter((p) => p.status === "em_producao").length > 6 ? "SOBRECARGA" : "NOMINAL"}
            emRisco={producoes.filter((p) => p.status === "em_producao").length > 6}
          />
        </div>

        {/* Perdas Recentes em Tempo Real - Texto de 14px com Alto Contraste */}
        {perdasRecentes.length > 0 && (
          <div
            className="p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 text-[13px] md:text-[14px] font-bold shadow-sm"
            style={{
              backgroundColor: "rgba(255, 59, 48, 0.08)",
              borderColor: "rgba(255, 59, 48, 0.3)",
            }}
          >
            <div className="flex items-center gap-2.5 text-[var(--sinal)] font-black">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--sinal)] animate-pulse" />
              <span>REGISTROS RECENTES DE DESCARTE / PERDA ({perdasRecentes.length} EVENTOS):</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[var(--tinta-sub)]">
              {perdasRecentes.slice(0, 3).map((p) => {
                const rec = receitaDominioPorId.get(p.receitaId);
                return (
                  <span key={p.id} className="px-3 py-1 rounded-xl bg-[var(--panel)] border border-[var(--linha-forte)] font-extrabold text-[var(--tinta)] shadow-sm">
                    {rec?.nomePrato ?? "Receita"}: {p.quantidade} un ({p.motivoPerda || "Validade"})
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
