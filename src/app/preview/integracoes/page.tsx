import { DemoShell } from "@/components/ficha/DemoShell";
import { NOME_RESTAURANTE, pratos } from "../fixtures";
import { CANAIS_CONECTADOS_DEMO, PEDIDOS_RECENTES_DEMO, RESUMO_HOJE_DEMO } from "../integracoesDemo";
import { NotasExemploProvider } from "./NotasExemplo";

export default function Page() {
  return (
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Integrações">
      <NotasExemploProvider
        fichas={pratos.map((p) => ({ id: p.id, nome: p.nomePrato }))}
        conectados={CANAIS_CONECTADOS_DEMO}
        pedidos={PEDIDOS_RECENTES_DEMO}
        resumoHoje={RESUMO_HOJE_DEMO}
      />
    </DemoShell>
  );
}
