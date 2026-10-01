import { DemoShell } from "@/components/ficha/DemoShell";
import { ProteinasDemo } from "../PorPapelDemo";
import { NOME_RESTAURANTE, proteinas, processamentos } from "../fixtures";

export default function Page() {
  return (
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Manipulação de proteínas">
      {/* PROTEÍNAS (2026-09-25): lê também os lotes registrados no tablet da demo. */}
      <ProteinasDemo proteinas={proteinas} processamentos={processamentos} />
    </DemoShell>
  );
}
