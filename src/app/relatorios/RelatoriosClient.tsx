"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ficha/Card";
import { Badge } from "@/components/ficha/Badge";
import { Kpi } from "@/components/ficha/Kpi";
import { nums } from "@/components/ficha/tema";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { ChartTooltipCard } from "@/components/charts/ChartTooltipCard";
import { formatBRL, formatBRLEixo, formatPercent, formatPercentEixo, formatNumero, formatQtd } from "@/components/charts/format";
import { CHART_ANIMATION_DURATION, CHART_ANIMATION_EASING, CHART_MARGIN, CHART_MARGIN_HORIZONTAL_BARS, axisLineStyle, axisTickStyle, chartGridProps, chartGridPropsHorizontalBars } from "@/components/charts/theme";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";
import type { Processamento } from "@/lib/dominio/processamento";
import type { Producao } from "@/lib/dominio/producao";
import type { FechamentoCmv } from "@/lib/dominio/fechamentoCmv";
import type { LocalArmazenamento, RegistroTemperatura } from "@/lib/dominio/temperatura";
import { construirContexto } from "@/lib/dados/adaptadores";
import { calcularCustoPorPorcao } from "@/lib/calculo/cmv";
import { calcularFechamentoCmv } from "@/lib/calculo/fechamentoCmv";

const GAP_ALERTA_PP = 3;

interface Alerta {
  tipo: string;
  texto: string;
  acao: string;
}

export function RelatoriosClient({
  insumos,
  receitas,
  processamentos,
  producoes,
  fechamentos,
  locais,
  registrosTemperatura,
  margemAlvoCliente,
}: {
  insumos: Insumo[];
  receitas: Receita[];
  processamentos: Processamento[];
  producoes: Producao[];
  fechamentos: FechamentoCmv[];
  locais: LocalArmazenamento[];
  registrosTemperatura: RegistroTemperatura[];
  margemAlvoCliente: number;
}) {
  const pratos = useMemo(() => receitas.filter((r) => r.tipo === "prato_final"), [receitas]);
  const contexto = useMemo(() => construirContexto(insumos, receitas, processamentos), [insumos, receitas, processamentos]);
  const receitaPorId = useMemo(() => new Map(receitas.map((r) => [r.id, r])), [receitas]);

  const pratosComMargem = useMemo(
    () =>
      pratos.map((p) => {
        const custoPorPorcao = calcularCustoPorPorcao(p.id, contexto);
        const margemPct = p.precoVenda ? ((p.precoVenda - custoPorPorcao) / p.precoVenda) * 100 : null;
        const margemAlvo = (p.margemAlvo ?? margemAlvoCliente) * 100;
        return { receita: p, custoPorPorcao, margemPct, margemAlvo, abaixoDoAlvo: margemPct !== null && margemPct < margemAlvo };
      }),
    [pratos, contexto, margemAlvoCliente],
  );

  const fcPorInsumo = useMemo(() => {
    const grupos = new Map<string, number[]>();
    for (const p of processamentos) {
      const lista = grupos.get(p.insumoId) ?? [];
      lista.push(p.fcObservado);
      grupos.set(p.insumoId, lista);
    }
    return new Map([...grupos.entries()].map(([insumoId, lista]) => [insumoId, lista.reduce((s, v) => s + v, 0) / lista.length]));
  }, [processamentos]);

  const custoPerdasProducao = useMemo(
    () =>
      producoes
        .filter((p) => p.status === "perda")
        .reduce((soma, p) => {
          const receita = receitaPorId.get(p.receitaId);
          if (!receita) return soma;
          return soma + p.quantidade * calcularCustoPorPorcao(receita.id, contexto);
        }, 0),
    [producoes, receitaPorId, contexto],
  );

  const perdasProducao = useMemo(() => producoes.filter((p) => p.status === "perda"), [producoes]);

  const ultimoFechamento = fechamentos[0] ?? null;
  const gapUltimoFechamento = useMemo(() => {
    if (!ultimoFechamento) return null;
    const vendas = ultimoFechamento.vendas.map((v) => {
      const p = receitaPorId.get(v.receitaId);
      return { quantidadeVendida: v.quantidade, cmvReceita: p ? calcularCustoPorPorcao(p.id, contexto) : 0 };
    });
    const resultado = calcularFechamentoCmv(
      vendas,
      ultimoFechamento.faturamento,
      ultimoFechamento.estoqueInicial,
      ultimoFechamento.compras,
      ultimoFechamento.estoqueFinal,
    );
    return {
      cmvRealPct: resultado.cmvRealPercentual * 100,
      cmvTeoricoPct: resultado.cmvTeoricoPercentual * 100,
      gapPct: resultado.gapPercentual * 100,
      gapReais: resultado.gapReais,
    };
  }, [ultimoFechamento, receitaPorId, contexto]);

  const quebraEstoqueTotal = useMemo(
    () =>
      Math.max(
        0,
        fechamentos.reduce((s, f) => {
          const vendas = f.vendas.map((v) => {
            const p = receitaPorId.get(v.receitaId);
            return { quantidadeVendida: v.quantidade, cmvReceita: p ? calcularCustoPorPorcao(p.id, contexto) : 0 };
          });
          return s + calcularFechamentoCmv(vendas, f.faturamento, f.estoqueInicial, f.compras, f.estoqueFinal).gapReais;
        }, 0),
      ),
    [fechamentos, receitaPorId, contexto],
  );

  const alertas = useMemo(() => {
    const lista: Alerta[] = [];

    for (const { receita, margemPct, margemAlvo, abaixoDoAlvo, custoPorPorcao } of pratosComMargem) {
      if (abaixoDoAlvo && margemPct !== null) {
        const precoSugerido = custoPorPorcao / (1 - margemAlvo / 100);
        lista.push({
          tipo: "Margem",
          texto: `${receita.nomePrato} com margem de ${formatNumero(margemPct, 1)}%, abaixo do alvo de ${formatNumero(margemAlvo, 0)}%`,
          acao: `Preço sugerido: ${formatBRL(precoSugerido)} (hoje ${formatBRL((receita.precoVenda ?? 0))})`,
        });
      }
    }

    for (const insumo of insumos) {
      const fcObs = fcPorInsumo.get(insumo.id);
      if (!fcObs) continue;
      const diferenca = ((fcObs - insumo.fatorCorrecao) / insumo.fatorCorrecao) * 100;
      if (Math.abs(diferenca) > 2) {
        lista.push({
          tipo: "FC",
          texto: `${insumo.nome} rende ${diferenca > 0 ? "menos" : "mais"} que o previsto (FC observado ${formatNumero(fcObs, 3)} contra ${formatNumero(insumo.fatorCorrecao, 2)} cadastrado)`,
          acao: "CMV dos pratos que usam esse insumo já usa o FC observado, não precisa mexer em nada",
        });
      }
    }

    for (const insumo of insumos) {
      if (insumo.estoque && insumo.estoque.saldoAtual < insumo.estoque.estoqueMinimo) {
        lista.push({
          tipo: "Estoque",
          texto: `${insumo.nome} abaixo do estoque mínimo (${formatQtd(insumo.estoque.saldoAtual)}${insumo.unidadeMedida} de ${formatQtd(insumo.estoque.estoqueMinimo)}${insumo.unidadeMedida})`,
          acao: "Repor estoque",
        });
      }
    }

    for (const local of locais) {
      const ultima = registrosTemperatura.find((r) => r.localArmazenamentoId === local.id);
      if (!ultima) continue;
      const foraDaFaixa = (local.temperaturaMinC != null && ultima.temperaturaC < local.temperaturaMinC) || (local.temperaturaMaxC != null && ultima.temperaturaC > local.temperaturaMaxC);
      if (foraDaFaixa) {
        lista.push({
          tipo: "Temperatura",
          texto: `${local.nome} fora da faixa (${ultima.temperaturaC}°C, ideal ${local.temperaturaMinC ?? "—"}°C a ${local.temperaturaMaxC ?? "—"}°C)`,
          acao: "Verificar equipamento",
        });
      }
    }

    if (gapUltimoFechamento && gapUltimoFechamento.gapPct > GAP_ALERTA_PP) {
      lista.push({
        tipo: "CMV",
        texto: `Gap de ${formatNumero(gapUltimoFechamento.gapPct, 1)} pontos percentuais no último fechamento de CMV`,
        acao: `R$ ${gapUltimoFechamento.gapReais.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} a mais de insumo do que as fichas previam`,
      });
    }

    return lista;
  }, [pratosComMargem, insumos, fcPorInsumo, locais, registrosTemperatura, gapUltimoFechamento]);

  const perdasPorTurno = useMemo(() => {
    const grupos = new Map<string, { custo: number; lotes: number }>();
    for (const p of perdasProducao) {
      const receita = receitaPorId.get(p.receitaId);
      const custo = receita ? p.quantidade * calcularCustoPorPorcao(receita.id, contexto) : 0;
      const nome = p.nomeTurno ?? "Sem turno";
      const atual = grupos.get(nome) ?? { custo: 0, lotes: 0 };
      grupos.set(nome, { custo: atual.custo + custo, lotes: atual.lotes + 1 });
    }
    return [...grupos.entries()].map(([turno, dados]) => ({ turno, ...dados }));
  }, [perdasProducao, receitaPorId, contexto]);

  const desempenhoPorPessoa = useMemo(() => {
    const nomes = new Set<string>();
    processamentos.forEach((p) => nomes.add(p.responsavel));
    producoes.forEach((p) => nomes.add(p.responsavel));
    registrosTemperatura.forEach((r) => nomes.add(r.responsavel));

    return [...nomes]
      .filter((nome) => nome && nome !== "A definir")
      .map((nome) => {
        const lotesDoNome = processamentos.filter((p) => p.responsavel === nome);
        const descarteMedio = lotesDoNome.length > 0 ? (lotesDoNome.reduce((s, p) => s + p.pesoDescartePuro / p.pesoBrutoRecebido, 0) / lotesDoNome.length) * 100 : null;
        const perdasTurno = producoes.filter((p) => p.status === "perda" && p.responsavel === nome).length;
        const tempForaFaixa = registrosTemperatura.filter((r) => {
          if (r.responsavel !== nome) return false;
          const local = locais.find((l) => l.id === r.localArmazenamentoId);
          return !!local && ((local.temperaturaMinC != null && r.temperaturaC < local.temperaturaMinC) || (local.temperaturaMaxC != null && r.temperaturaC > local.temperaturaMaxC));
        }).length;
        return { nome, lotesProteina: lotesDoNome.length, descarteMedio, perdasTurno, tempForaFaixa };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [processamentos, producoes, registrosTemperatura, locais]);

  const margemPorPrato = useMemo(
    () =>
      [...pratosComMargem]
        .filter((p) => p.margemPct !== null)
        .sort((a, b) => (a.margemPct as number) - (b.margemPct as number))
        .map((p) => ({ nome: p.receita.nomePrato, margemPct: p.margemPct as number, custoPorPorcao: p.custoPorPorcao, margemAlvo: p.margemAlvo })),
    [pratosComMargem],
  );

  return (
    <div className="max-w-5xl space-y-6">
      <p className="text-[12.5px]" style={{ color: "var(--sub)" }}>Consolidado do que já está cadastrado nas outras telas -- ninguém digita nada duas vezes aqui.</p>

      <div>
        <h2 className="text-[16px] font-semibold text-[var(--tinta)] mb-3">Onde o dinheiro está vazando</h2>
        <div className="grid grid-cols-3 gap-3">
          <Kpi label="Quebra de estoque acumulada" value={formatBRLEixo(quebraEstoqueTotal)} alerta={quebraEstoqueTotal > 0} sub="soma do gap real × teórico nos fechamentos de CMV" />
          <Kpi label="Lotes perdidos na produção" value={formatBRLEixo(custoPerdasProducao)} alerta={custoPerdasProducao > 0} sub={`${perdasProducao.length} lote${perdasProducao.length !== 1 ? "s" : ""} descartado${perdasProducao.length !== 1 ? "s" : ""}`} />
          <Kpi label="Total identificado" value={formatBRLEixo((quebraEstoqueTotal + custoPerdasProducao))} alerta={quebraEstoqueTotal + custoPerdasProducao > 0} sub="por período, em perdas evitáveis" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-5">
          <h3 className="text-[13px] font-semibold mb-1">Perdas de produção por turno</h3>
          <p className="text-[11.5px] mb-3" style={{ color: "var(--sub)" }}>Custo dos lotes descartados, separado pelo turno em que foram produzidos.</p>
          <ChartFrame
            vazio={perdasPorTurno.length === 0}
            tituloVazio="Nenhuma perda de produção registrada ainda."
            dicaVazio="Registre uma perda no quadro de Produções pra esse gráfico aparecer aqui."
          >
            <BarChart data={perdasPorTurno} margin={CHART_MARGIN}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="turno" tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} />
              <YAxis tick={axisTickStyle} tickLine={false} axisLine={false} tickFormatter={formatBRLEixo} />
              <Tooltip
                cursor={{ fill: "var(--bg)" }}
                content={({ payload }) => {
                  if (!payload || !payload.length) return null;
                  const d = payload[0].payload as { turno: string; custo: number; lotes: number };
                  return (
                    <ChartTooltipCard
                      titulo={d.turno}
                      linhas={[
                        { rotulo: "Custo perdido", valor: formatBRLEixo(d.custo), destaque: d.custo > 0 },
                        { rotulo: "Lotes", valor: `${d.lotes}` },
                      ]}
                    />
                  );
                }}
              />
              <Bar dataKey="custo" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={CHART_ANIMATION_DURATION} animationEasing={CHART_ANIMATION_EASING}>
                {perdasPorTurno.map((d, i) => (
                  <Cell key={i} fill={d.custo > 0 ? "var(--danger)" : "var(--border)"} />
                ))}
                <LabelList dataKey="custo" position="top" formatter={(v: string | number | boolean | null | undefined) => formatBRLEixo(Number(v))} style={{ fill: "var(--text)", fontSize: 11, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ChartFrame>
        </Card>

        <Card className="p-5">
          <h3 className="text-[13px] font-semibold mb-1">Margem por prato</h3>
          <p className="text-[11.5px] mb-3" style={{ color: "var(--sub)" }}>Vermelho está abaixo do alvo daquele prato.</p>
          <ChartFrame
            vazio={margemPorPrato.length === 0}
            tituloVazio="Nenhum prato com preço de venda cadastrado ainda."
            dicaVazio="Cadastre o preço de venda do prato em Receitas & Fichas pra ele entrar nesse gráfico."
          >
            <BarChart data={margemPorPrato} layout="vertical" margin={CHART_MARGIN_HORIZONTAL_BARS}>
              <CartesianGrid {...chartGridPropsHorizontalBars} />
              <XAxis type="number" domain={[0, 100]} tick={axisTickStyle} tickLine={false} axisLine={axisLineStyle} tickFormatter={formatPercentEixo} />
              <YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 10, fill: "var(--sub)" }} tickLine={false} axisLine={false} />
              <ReferenceLine x={margemPorPrato[0]?.margemAlvo ?? 65} stroke={"var(--border-strong)"} strokeDasharray="4 4" />
              <Tooltip
                cursor={{ fill: "var(--bg)" }}
                content={({ payload }) => {
                  if (!payload || !payload.length) return null;
                  const d = payload[0].payload as { nome: string; margemPct: number; custoPorPorcao: number; margemAlvo: number };
                  return (
                    <ChartTooltipCard
                      titulo={d.nome}
                      linhas={[
                        { rotulo: "Margem", valor: formatPercent(d.margemPct), destaque: d.margemPct < d.margemAlvo },
                        { rotulo: "CMV", valor: formatBRLEixo(d.custoPorPorcao) },
                      ]}
                    />
                  );
                }}
              />
              <Bar dataKey="margemPct" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={CHART_ANIMATION_DURATION} animationEasing={CHART_ANIMATION_EASING}>
                {margemPorPrato.map((p, i) => (
                  <Cell key={i} fill={p.margemPct < p.margemAlvo ? "var(--danger)" : "var(--text)"} />
                ))}
                <LabelList dataKey="margemPct" position="right" formatter={(v: string | number | boolean | null | undefined) => formatPercent(Number(v))} style={{ fill: "var(--text)", fontSize: 11, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ChartFrame>
        </Card>
      </div>

      <div>
        <h2 className="text-[16px] font-semibold text-[var(--tinta)] mb-1">Desempenho por responsável</h2>
        <p className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>Cruzamento do que cada pessoa registrou nas outras telas. Serve pra treinar quem precisa, não pra punir: descarte alto pode ser técnica de corte, mas também pode ser matéria-prima ruim do fornecedor.</p>
        <Card>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ color: "var(--faint)" }} className="text-left text-[10.5px] uppercase tracking-wide">
                <th className="py-2.5 px-5 font-medium">Responsável</th>
                <th className="py-2.5 px-3 font-medium text-right">Lotes de proteína</th>
                <th className="py-2.5 px-3 font-medium text-right">Descarte médio</th>
                <th className="py-2.5 px-3 font-medium text-right">Perdas no turno</th>
                <th className="py-2.5 px-5 font-medium text-right">Temp. fora da faixa</th>
              </tr>
            </thead>
            <tbody>
              {desempenhoPorPessoa.map((d) => (
                <tr key={d.nome} style={{ borderTop: `1px solid ${"var(--border)"}` }}>
                  <td className="py-2.5 px-5 font-medium">{d.nome}</td>
                  <td className="py-2.5 px-3 text-right" style={nums}>{d.lotesProteina || "—"}</td>
                  <td className="py-2.5 px-3 text-right" style={{ ...nums, color: d.descarteMedio !== null && d.descarteMedio > 10 ? "var(--danger)" : "var(--text)" }}>
                    {d.descarteMedio !== null ? `${formatNumero(d.descarteMedio, 1)}%` : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-right" style={{ ...nums, color: d.perdasTurno > 0 ? "var(--danger)" : "var(--faint)" }}>{d.perdasTurno || "—"}</td>
                  <td className="py-2.5 px-5 text-right" style={{ ...nums, color: d.tempForaFaixa > 0 ? "var(--danger)" : "var(--faint)" }}>{d.tempForaFaixa || "—"}</td>
                </tr>
              ))}
              {desempenhoPorPessoa.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 px-5 text-center" style={{ color: "var(--faint)" }}>Nenhum responsável registrado ainda nas outras telas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <div>
        <h2 className="text-[16px] font-semibold text-[var(--tinta)] mb-1">Pendências que precisam de decisão</h2>
        <p className="text-[12px] mb-3" style={{ color: "var(--sub)" }}>{alertas.length} item{alertas.length !== 1 ? "s" : ""} aberto{alertas.length !== 1 ? "s" : ""} agora.</p>
        <Card>
          <div className="px-5 py-1">
            {alertas.map((a, i) => (
              <div key={i} className="flex items-start justify-between gap-4 py-2.5" style={{ borderTop: i ? `1px solid ${"var(--border)"}` : "none" }}>
                <div className="flex gap-2.5">
                  <Badge acao>{a.tipo}</Badge>
                  <div className="text-[12.5px]">{a.texto}</div>
                </div>
                <div className="text-[11.5px] text-right shrink-0" style={{ color: "var(--sub)" }}>{a.acao}</div>
              </div>
            ))}
            {alertas.length === 0 && <div className="text-[12.5px] py-4" style={{ color: "var(--sub)" }}>Nada pendente no momento.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
