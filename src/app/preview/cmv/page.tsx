import { DemoShell } from "@/components/ficha/DemoShell";
import { CmvClient } from "@/app/cmv/CmvClient";
import { NOME_RESTAURANTE, pratos, preparos, insumos, processamentos, fechamentos } from "../fixtures";

export default function Page() {
  return (
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Fechamento de CMV">
      <CmvClient pratos={pratos} preparos={preparos} insumos={insumos} processamentos={processamentos} fechamentos={fechamentos} />
    </DemoShell>
  );
}
