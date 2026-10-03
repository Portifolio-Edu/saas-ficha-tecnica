import { CmvDemo } from "../PorPapelDemo";
import { pratos, preparos, insumos, processamentos, fechamentos } from "../fixtures";

export default function Page() {
  return (
    <CmvDemo pratos={pratos} preparos={preparos} insumos={insumos} processamentos={processamentos} fechamentos={fechamentos} />
  );
}
