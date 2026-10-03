import { InsumosDemo } from "../PorPapelDemo";
import { insumos, preparos, todasReceitas, processamentos, locais } from "../fixtures";

export default function Page() {
  return (
    <InsumosDemo insumos={insumos} preparos={preparos} todasReceitas={todasReceitas} processamentos={processamentos} locais={locais} />
  );
}
