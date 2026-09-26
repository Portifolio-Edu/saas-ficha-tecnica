import { DemoShell } from "@/components/ficha/DemoShell";
import { CmvDemo } from "../PorPapelDemo";
import { NOME_RESTAURANTE, pratos, preparos, insumos, processamentos, fechamentos } from "../fixtures";

export default function Page() {
  return (
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Fechamento de CMV">
      <CmvDemo pratos={pratos} preparos={preparos} insumos={insumos} processamentos={processamentos} fechamentos={fechamentos} />
    </DemoShell>
  );
}
