import { redirect } from "next/navigation";
import { getClienteAtual } from "@/lib/dados/cliente";
import { listarReceitas } from "@/lib/dados/receitas";
import { AppShell } from "@/components/ficha/AppShell";
import { IntegracoesClient } from "./IntegracoesClient";

// INTEGRACOES (2026-09-23): no app, sem simulação. Conexões diretas aparecem
// "Em breve"; a importação por XML fiscal/planilha funciona.
export default async function IntegracoesPage() {
  const cliente = await getClienteAtual();
  if (!cliente) redirect("/login");
  const receitas = await listarReceitas();
  const fichas = receitas.filter((r) => r.tipo === "prato_final").map((r) => ({ id: r.id, nome: r.nomePrato }));

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} tituloPagina="Integrações">
      <IntegracoesClient fichas={fichas} />
    </AppShell>
  );
}
