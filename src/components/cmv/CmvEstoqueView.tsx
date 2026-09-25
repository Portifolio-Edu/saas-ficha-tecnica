// EQUIPE (2026-09-25): o fechamento de CMV como o estoquista vê — só o lado
// do estoque (inicial + compras − final = quanto de insumo saiu), sem
// faturamento, CMV em % nem margem. Com faturamento e CMV% dá pra deduzir a
// receita da casa, por isso os dois ficam com a gestão.
// Usado no app (/cmv com papel estoquista) e na demo ("Ver como: Estoquista").

import { Lock } from "lucide-react";
import { Card } from "@/components/ficha/Card";
import { Kpi } from "@/components/ficha/Kpi";
import { EmptyState } from "@/components/ficha/EmptyState";
import { nums } from "@/components/ficha/tema";
import type { FechamentoEstoque } from "@/lib/dominio/fechamentoCmv";

const reais = (v: number) => `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

const periodo = (f: FechamentoEstoque) => {
  const d = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${d(f.periodoInicio)} a ${d(f.periodoFim)}`;
};

export const consumoDoPeriodo = (f: FechamentoEstoque) => f.estoqueInicial + f.compras - f.estoqueFinal;

const diasDoPeriodo = (f: FechamentoEstoque) =>
  Math.max(1, Math.round((Date.parse(`${f.periodoFim}T12:00:00`) - Date.parse(`${f.periodoInicio}T12:00:00`)) / 86_400_000) + 1);

export function CmvEstoqueView({ fechamentos }: { fechamentos: FechamentoEstoque[] }) {
  if (fechamentos.length === 0) {
    return (
      <EmptyState
        titulo="Nenhum fechamento ainda"
        descricao="Quando a gestão fechar o primeiro período, o consumo de insumos aparece aqui."
      />
    );
  }

  const [atual] = fechamentos;
  const consumoAtual = consumoDoPeriodo(atual);

  return (
    <div className="space-y-6 max-w-5xl">
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
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[var(--tinta-faint)]">
                <th className="py-2.5 px-5 font-medium">Período</th>
                <th className="py-2.5 px-3 font-medium text-right">Estoque inicial</th>
                <th className="py-2.5 px-3 font-medium text-right">Compras</th>
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
