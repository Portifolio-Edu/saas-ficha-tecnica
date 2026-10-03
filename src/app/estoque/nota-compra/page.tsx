// NF-e DE COMPRA (2026-10-03): Estoque > Importar NF-e de compra. Dono, gestor
// e estoquista (a rota é filha de /estoque). Componente: ImportarNotaCompra.
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigirAcesso } from "@/lib/auth/acesso";
import { listarInsumos } from "@/lib/dados/insumos";
import { listarNotasRecentes } from "@/lib/dados/notasCompra";
import { AppShell } from "@/components/ficha/AppShell";
import { ImportarNotaCompra } from "@/components/estoque/ImportarNotaCompra";
import { formatBRL } from "@/components/charts/format";
import { dataBR } from "@/lib/formato";

function dataBR(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export default async function NotaCompraPage() {
  const cliente = await exigirAcesso("/estoque/nota-compra");
  const [insumos, recentes] = await Promise.all([listarInsumos(), listarNotasRecentes()]);

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} papel={cliente.papel} tituloPagina="Importar NF-e de compra">
      <div className="space-y-6">
        <Link href="/estoque" className="inline-flex items-center gap-1.5 text-[14px] text-[var(--tinta-sub)] hover:text-[var(--tinta)] min-h-10">
          <ArrowLeft size={14} aria-hidden />
          Voltar ao estoque
        </Link>

        <ImportarNotaCompra insumos={insumos} />

        {recentes.length > 0 && (
          <section aria-labelledby="titulo-notas-recentes">
            <h2 id="titulo-notas-recentes" className="text-[16px] font-semibold text-[var(--tinta)] mb-2">
              Últimas notas lançadas
            </h2>
            <div tabIndex={0} role="region" aria-label="Últimas notas lançadas" className="overflow-x-auto rounded-xl border" style={{ background: "var(--panel)", borderColor: "var(--linha)" }}>
              <table className="w-full text-[14px] min-w-[560px]">
                <thead>
                  <tr className="text-left">
                    <th className="py-2.5 px-4">Nota</th>
                    <th className="py-2.5 px-3">Emissão</th>
                    <th className="py-2.5 px-3 text-right">Itens</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-4">Lançada em</th>
                  </tr>
                </thead>
                <tbody>
                  {recentes.map((n) => (
                    <tr key={n.id} className="border-t" style={{ borderColor: "var(--linha)" }}>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-[var(--tinta)]">
                          {n.numero ? `NF-e ${n.numero}` : "NF-e"} · {n.fornecedor || "fornecedor sem nome"}
                        </div>
                        {n.atualizouPrecos && <div className="text-[12px] text-[var(--tinta-faint)]">atualizou preços</div>}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{dataBR(n.emitidaEm)}</td>
                      <td className="py-2.5 px-3 text-right">{n.qtdItens}</td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">{n.valorTotal !== null ? formatBRL(n.valorTotal) : "—"}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap">{dataBR(n.importadaEm, { timeZone: "America/Sao_Paulo" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
