import { DemoShell } from "@/components/ficha/DemoShell";
import { NutricionalClient } from "@/app/nutricional/NutricionalClient";
import { NOME_RESTAURANTE, pratos, preparos, insumos, processamentos, valoresInsumos, overrides, rotulagens } from "../fixtures";

export default function Page() {
  return (
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Ficha nutricional">
      <NutricionalClient
        pratos={pratos}
        preparos={preparos}
        insumos={insumos}
        processamentos={processamentos}
        valoresInsumos={valoresInsumos}
        overrides={overrides}
        rotulagens={rotulagens}
      />
    </DemoShell>
  );
}
