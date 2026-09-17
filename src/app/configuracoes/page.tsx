import { redirect } from "next/navigation";
import { getClienteAtual } from "@/lib/dados/cliente";
import { AppShell } from "@/components/ficha/AppShell";
import { ConfiguracoesClient } from "@/components/configuracoes/ConfiguracoesClient";

export default async function ConfiguracoesPage() {
  const cliente = await getClienteAtual();
  if (!cliente) redirect("/login");

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} tituloPagina="Configurações">
      <ConfiguracoesClient />
    </AppShell>
  );
}
