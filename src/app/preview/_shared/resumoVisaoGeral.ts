import { construirContexto } from "@/lib/dados/adaptadores";
import { calcularCmvReceita, calcularCustoPorPorcao } from "@/lib/calculo/cmv";
import type { Insumo } from "@/lib/dominio/insumo";
import type { Receita } from "@/lib/dominio/receita";
import type { Processamento } from "@/lib/dominio/processamento";
import type { Producao } from "@/lib/dominio/producao";
import type { FechamentoCmv } from "@/lib/dominio/fechamentoCmv";

/**
 * Mesma derivação de dados de VisaoGeralClient.tsx, extraída pra ser
 * reaproveitada pelos 3 protótipos de direção visual em /preview sem
 * triplicar a lógica de cálculo real (contexto/CMV/margem/perdas).
 * VisaoGeralClient.tsx (a tela real) não foi tocado -- continua com sua
 * própria cópia, intacta.
 */
export function resumoVisaoGeral({
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
  const contexto = construirContexto(insumos, receitas, processamentos);
  const pratos = receitas.filter((r) => r.tipo === "prato_final");

  const fechamentoRecente = fechamentos[0] ?? null;
  const vendasRecentes = new Map<string, number>();
  for (const v of fechamentoRecente?.vendas ?? []) vendasRecentes.set(v.receitaId, v.quantidade);

  const linhas = pratos.map((p) => {
    const custoPorPorcao = calcularCustoPorPorcao(p.id, contexto);
    const qtdVendida = vendasRecentes.get(p.id) ?? p.vendasMes ?? 0;
    const precoVenda = p.precoVenda;
    const margemAlvoPct = (p.margemAlvo ?? margemAlvoCliente) * 100;
    const cmvPct = precoVenda ? (custoPorPorcao / precoVenda) * 100 : null;
    const margemPct = precoVenda ? ((precoVenda - custoPorPorcao) / precoVenda) * 100 : null;
    return {
      receita: p,
      custoPorPorcao,
      qtdVendida,
      precoVenda,
      margemAlvoPct,
      cmvPct,
      margemPct,
      abaixoDoAlvo: margemPct !== null && margemPct < margemAlvoPct,
    };
  });

  const comPreco = linhas.filter((l) => l.precoVenda !== null && l.precoVenda > 0);
  const cmvMedio = comPreco.length > 0 ? comPreco.reduce((s, l) => s + (l.cmvPct as number), 0) / comPreco.length : null;
  const margemMedia = comPreco.length > 0 ? comPreco.reduce((s, l) => s + (l.margemPct as number), 0) / comPreco.length : null;
  const abaixoDoAlvo = comPreco.filter((l) => l.abaixoDoAlvo).length;

  const inicioMes = new Date();
  inicioMes.setDate(1);
  const prefixoMes = inicioMes.toISOString().slice(0, 7);
  const nomeMes = inicioMes.toLocaleDateString("pt-BR", { month: "long" });

  const perdasDoMes = producoes.filter((p) => p.status === "perda" && p.criadoEm.startsWith(prefixoMes));
  const perdaTotalReais = perdasDoMes.reduce((soma, p) => {
    const receitaCalc = contexto.receitaPorId.get(p.receitaId);
    if (!receitaCalc || receitaCalc.rendimento <= 0) return soma;
    const custoDoLote = calcularCmvReceita(p.receitaId, contexto) * (p.quantidade / receitaCalc.rendimento);
    return soma + custoDoLote;
  }, 0);

  const perdasRecentes = [...producoes]
    .filter((p) => p.status === "perda")
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    .slice(0, 6);

  const margemAlvoMedia = comPreco.length > 0 ? comPreco.reduce((s, l) => s + l.margemAlvoPct, 0) / comPreco.length : margemAlvoCliente * 100;
  const vendasMax = Math.max(1, ...comPreco.map((l) => l.qtdVendida));
  const xMax = Math.ceil((vendasMax * 1.15) / 5) * 5;
  const margensValidas = comPreco.map((l) => l.margemPct as number).concat(margemAlvoMedia);
  const yMin = Math.floor(Math.min(0, ...margensValidas) / 5) * 5;
  const yMax = Math.ceil((Math.max(...margensValidas) + 5) / 5) * 5;

  return {
    fechamentoRecente,
    comPreco,
    cmvMedio,
    margemMedia,
    abaixoDoAlvo,
    nomeMes,
    perdasDoMes,
    perdaTotalReais,
    perdasRecentes,
    margemAlvoMedia,
    xMax,
    yMin,
    yMax,
  };
}

export type ResumoVisaoGeral = ReturnType<typeof resumoVisaoGeral>;
