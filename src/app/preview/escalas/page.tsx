import { DemoShell } from "@/components/ficha/DemoShell";
import { NOME_RESTAURANTE } from "../fixtures";
import { EscalasDemo } from "./EscalasDemo";

export default function Page() {
  return (
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Escalas">
      <EscalasDemo />
    </DemoShell>
  );
}
