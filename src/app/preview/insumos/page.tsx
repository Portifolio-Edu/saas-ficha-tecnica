import { DemoShell } from "@/components/ficha/DemoShell";
import { InsumosDemo } from "../PorPapelDemo";
import { NOME_RESTAURANTE, insumos, preparos, todasReceitas, processamentos, locais } from "../fixtures";

export default function Page() {
  return (
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Insumos">
      <InsumosDemo insumos={insumos} preparos={preparos} todasReceitas={todasReceitas} processamentos={processamentos} locais={locais} />
    </DemoShell>
  );
}
