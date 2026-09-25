import { exigirAcesso } from "@/lib/auth/acesso";
import { AppShell } from "@/components/ficha/AppShell";
import { ConfiguracoesClient } from "@/components/configuracoes/ConfiguracoesClient";

export default async function ConfiguracoesPage() {
  const cliente = await exigirAcesso("/configuracoes");

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} papel={cliente.papel} tituloPagina="Configurações">
      <ConfiguracoesClient />
    </AppShell>
  );
}
