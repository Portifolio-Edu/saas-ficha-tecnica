// EQUIPE (2026-09-25): o fechamento de CMV como o estoquista vê — só o lado
// do estoque (inicial + compras − final = quanto de insumo saiu), sem
// faturamento, CMV em % nem margem. Com faturamento e CMV% dá pra deduzir a
// receita da casa, por isso os dois ficam com a gestão.
// Usado no app (/cmv com papel estoquista) e na demo ("Ver como: Estoquista").

import Link from "next/link";
import { FileText, Lock } from "lucide-react";
import { Card } from "@/components/ficha/Card";
import { Kpi } from "@/components/ficha/Kpi";
import { EmptyState } from "@/components/ficha/EmptyState";
import { nums } from "@/components/ficha/tema";
import type { FechamentoEstoque } from "@/lib/dominio/fechamentoCmv";
import { dataBR, numeroBR } from "@/lib/formato";
import { comprasNoPeriodo, type CompraDoDia } from "@/lib/integracoes/conferenciaNota";

const reais = (v: number) => `R$ ${numeroBR(v, { maximumFractionDigits: 0 })}`;

const periodo = (f: FechamentoEstoque) => {
  const d = (iso: string) => dataBR(`${iso}T12:00:00`, { day: "2-digit", month: "short" });
  return `${d(f.periodoInicio)} a ${d(f.periodoFim)}`;
};

export const consumoDoPeriodo = (f: FechamentoEstoque) => f.estoqueInicial + f.compras - f.estoqueFinal;

const diasDoPeriodo = (f: FechamentoEstoque) =>
  Math.max(1, Math.round((Date.parse(`${f.periodoFim}T12:00:00`) - Date.parse(`${f.periodoInicio}T12:00:00`)) / 86_400_000) + 1);

/** Dia seguinte a AAAA-MM-DD. */
const diaSeguinte = (iso: string) => new Date(Date.parse(`${iso}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/**
 * NF-e DE COMPRA (2026-10-03): o período que a gestão ainda vai fechar. Começa
 * no dia seguinte ao último fechamento (ou no dia 1º do mês, se nunca houve
 * fechamento) e vai até hoje.
 */
export function periodoAberto(fechamentos: Pick<FechamentoEstoque, "periodoFim">[], hoje: string): { inicio: string; fim: string } {
  const ultimoFim = fechamentos.reduce<string | null>((m, f) => (m === null || f.periodoFim > m ? f.periodoFim : m), null);
  const inicio = ultimoFim ? diaSeguinte(ultimoFim) : `${hoje.slice(0, 8)}01`;
  return { inicio: inicio > hoje ? hoje : inicio, fim: hoje };
}

/**
 * NF-e DE COMPRA (2026-10-03): o estoquista não fecha o período (é a gestão),
 * então aqui a "sugestão" é ver o que as notas lançadas já somam no período em
 * aberto, com o atalho pra lançar a que faltar; nos períodos fechados, a
 * coluna "Em NF-e" mostra quanto das compras veio de nota importada.
 */
function NotasDoPeriodo({ comprasNotas, fechamentos, hoje }: { comprasNotas: CompraDoDia[]; fechamentos: FechamentoEstoque[]; hoje: string }) {
  const { inicio, fim } = periodoAberto(fechamentos, hoje);
  const soma = comprasNoPeriodo(comprasNotas, inicio, fim);
  return (
    <Card className="p-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold text-[var(--tinta)]">Compras em NF-e no período aberto</h2>
        <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5">
          {periodo({ periodoInicio: inicio, periodoFim: fim } as FechamentoEstoque)}:{" "}
          <b className="text-[var(--tinta)]" style={nums}>
            {reais(soma.custo)}
          </b>{" "}
          em {soma.notas} {soma.notas === 1 ? "nota lançada" : "notas lançadas"}. É o valor que a gestão usa em Compras do período ao fechar, então lance toda nota que chegar.
        </p>
      </div>
      <Link
        href="/estoque/nota-compra"
        className="inline-flex items-center gap-2 text-[14px] font-medium px-3.5 min-h-10 rounded-lg border hover:bg-[var(--panel-hover)]"
        style={{ background: "var(--panel)", borderColor: "var(--linha)", color: "var(--tinta)" }}
      >
        <FileText size={15} aria-hidden />
        Importar NF-e de compra
      </Link>
    </Card>
  );
}

export function CmvEstoqueView({ fechamentos, comprasNotas, hoje }: { fechamentos: FechamentoEstoque[]; comprasNotas?: CompraDoDia[]; hoje?: string }) {
  const blocoNotas = comprasNotas && hoje ? <NotasDoPeriodo comprasNotas={comprasNotas} fechamentos={fechamentos} hoje={hoje} /> : null;

  if (fechamentos.length === 0) {
    return (
      <div className="space-y-6 max-w-5xl">
        {blocoNotas}
        <EmptyState
          titulo="Nenhum fechamento ainda"
          descricao="Quando a gestão fechar o primeiro período, o consumo de insumos aparece aqui."
        />
      </div>
    );
  }

  const [atual] = fechamentos;
  const consumoAtual = consumoDoPeriodo(atual);

  return (
    <div className="space-y-6 max-w-5xl">
      {blocoNotas}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Média por dia em vez de % contra o período anterior: os períodos
            podem ter tamanhos diferentes (quinzena x mês). */}
        <Kpi label="Consumo de insumos" value={reais(consumoAtual)} sub={`${periodo(atual)} · ${reais(consumoAtual / diasDoPeriodo(atual))} por dia`} />
        <Kpi label="Compras do período" value={reais(atual.compras)} sub="notas lançadas no estoque" />
        <Kpi label="Estoque no fechamento" value={reais(atual.estoqueFinal)} sub={`abriu com ${reais(atual.estoqueInicial)}`} />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--linha)" }}>
          <h2 className="text-[15px] font-semibold text-[var(--tinta)]">Períodos fechados</h2>
          <p className="text-[13px] text-[var(--tinta-sub)] mt-0.5">Consumo = estoque inicial + compras − estoque final.</p>
        </div>
        <div tabIndex={0} role="region" aria-label="Fechamentos de estoque" className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[var(--tinta-faint)]">
                <th className="py-2.5 px-5 font-medium">Período</th>
                <th className="py-2.5 px-3 font-medium text-right">Estoque inicial</th>
                <th className="py-2.5 px-3 font-medium text-right">Compras</th>
                {comprasNotas && <th className="py-2.5 px-3 font-medium text-right">Em NF-e</th>}
                <th className="py-2.5 px-3 font-medium text-right">Estoque final</th>
                <th className="py-2.5 px-3 font-medium text-right">Consumo</th>
                <th className="py-2.5 px-5 font-medium text-right">Por dia</th>
              </tr>
            </thead>
            <tbody>
              {fechamentos.map((f) => (
                <tr key={f.id} className="border-t" style={{ borderColor: "var(--linha)" }}>
                  <td className="py-2.5 px-5 text-[var(--tinta)]">{periodo(f)}</td>
                  <td className="py-2.5 px-3 text-right" style={nums}>{reais(f.estoqueInicial)}</td>
                  <td className="py-2.5 px-3 text-right" style={nums}>{reais(f.compras)}</td>
                  {comprasNotas && (
                    <td className="py-2.5 px-3 text-right text-[var(--tinta-sub)]" style={nums}>
                      {reais(comprasNoPeriodo(comprasNotas, f.periodoInicio, f.periodoFim).custo)}
                    </td>
                  )}
                  <td className="py-2.5 px-3 text-right" style={nums}>{reais(f.estoqueFinal)}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-[var(--tinta)]" style={nums}>{reais(consumoDoPeriodo(f))}</td>
                  <td className="py-2.5 px-5 text-right text-[var(--tinta-sub)]" style={nums}>{reais(consumoDoPeriodo(f) / diasDoPeriodo(f))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-start gap-2.5 text-[13px] text-[var(--tinta-sub)]">
        <Lock size={15} className="mt-0.5 shrink-0" />
        <p>Faturamento, CMV em % e margem por prato ficam com o dono e o gestor.</p>
      </div>
    </div>
  );
}
