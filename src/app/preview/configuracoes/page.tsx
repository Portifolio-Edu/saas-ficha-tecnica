import { DemoShell } from "@/components/ficha/DemoShell";
import { ConfiguracoesDemo } from "@/components/configuracoes/ConfiguracoesDemo";
import { NOME_RESTAURANTE, canaisDemo, restauranteDemo, turnos } from "../fixtures";

export default function Page() {
  return (
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Configurações">
      <ConfiguracoesDemo restaurante={restauranteDemo} canais={canaisDemo} turnos={turnos} />
    </DemoShell>
  );
}
