import { NutricionalClient } from "@/app/nutricional/NutricionalClient";
import { pratos, preparos, insumos, processamentos, valoresInsumos, overrides, rotulagens } from "../fixtures";

export default function Page() {
  return (
    <NutricionalClient
      pratos={pratos}
      preparos={preparos}
      insumos={insumos}
      processamentos={processamentos}
      valoresInsumos={valoresInsumos}
      overrides={overrides}
      rotulagens={rotulagens}
    />
  );
}
