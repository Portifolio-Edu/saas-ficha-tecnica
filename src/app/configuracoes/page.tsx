import { exigirAcesso } from "@/lib/auth/acesso";
import { lerRestaurante, listarCanais } from "@/lib/dados/configuracoes";
import { garantirTurnosPadrao } from "@/lib/dados/producoes";
import { AppShell } from "@/components/ficha/AppShell";
import { ConfiguracoesClient } from "@/components/configuracoes/ConfiguracoesClient";
import { acaoExcluirCanal, acaoExcluirTurno, acaoSalvarCanal, acaoSalvarRestaurante, acaoSalvarTurno } from "./actions";

export default async function ConfiguracoesPage() {
  const cliente = await exigirAcesso("/configuracoes");

  const [restaurante, canais, turnos] = await Promise.all([lerRestaurante(), listarCanais(), garantirTurnosPadrao(cliente.id)]);

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} papel={cliente.papel} tituloPagina="Configurações">
      <ConfiguracoesClient
        nomeRestaurante={cliente.papel === "dono" ? cliente.nomeRestaurante : undefined}
        restaurante={restaurante}
        canais={canais}
        turnos={turnos}
        acoes={{
          salvarRestaurante: acaoSalvarRestaurante,
          salvarCanal: acaoSalvarCanal,
          excluirCanal: acaoExcluirCanal,
          salvarTurno: acaoSalvarTurno,
          excluirTurno: acaoExcluirTurno,
        }}
      />
    </AppShell>
  );
}
