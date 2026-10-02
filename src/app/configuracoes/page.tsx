import { exigirAcesso } from "@/lib/auth/acesso";
import { AppShell } from "@/components/ficha/AppShell";
import { ConfiguracoesClient } from "@/components/configuracoes/ConfiguracoesClient";
import { getConfiguracoes } from "@/lib/dados/configuracoes";
import { getAvisos } from "@/lib/dados/avisos";
import { ehGestao } from "@/lib/auth/papeis";

// CONFIGURAÇÕES (2026-10-01): a tela recebe os dados da empresa e da conta e
// abre na seção do endereço (?secao=). Antes: só o nome, pro LGPD do dono.
export default async function ConfiguracoesPage({ searchParams }: { searchParams: Promise<{ secao?: string }> }) {
  const cliente = await exigirAcesso("/configuracoes");
  const [avisos, { secao }] = await Promise.all([ehGestao(cliente.papel) ? getAvisos() : Promise.resolve(null), searchParams]);
  const dados = await getConfiguracoes(cliente, avisos);

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} papel={cliente.papel} tituloPagina="Configurações">
      <ConfiguracoesClient dados={dados} papel={cliente.papel} secaoInicial={secao} />
    </AppShell>
  );
}
