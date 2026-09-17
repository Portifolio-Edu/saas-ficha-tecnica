import { DemoShell } from "@/components/ficha/DemoShell";
import { ConfiguracoesClient } from "@/components/configuracoes/ConfiguracoesClient";
import { NOME_RESTAURANTE } from "../fixtures";

export default function Page() {
  return (
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Configurações">
      <ConfiguracoesClient />
    </DemoShell>
  );
}
