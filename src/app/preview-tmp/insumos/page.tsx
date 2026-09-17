import { DemoShell } from "@/components/ficha/DemoShell";
import { InsumosClient } from "@/app/insumos/InsumosClient";
import { NOME_RESTAURANTE, insumos, preparos, todasReceitas, processamentos } from "../fixtures";

export default function Page() {
  return (
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Insumos">
      <InsumosClient insumos={insumos} preparos={preparos} todasReceitas={todasReceitas} processamentos={processamentos} />
    </DemoShell>
  );
}
