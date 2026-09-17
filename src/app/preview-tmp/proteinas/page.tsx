import { DemoShell } from "@/components/ficha/DemoShell";
import { ProteinasClient } from "@/app/proteinas/ProteinasClient";
import { NOME_RESTAURANTE, proteinas, processamentos } from "../fixtures";

export default function Page() {
  return (
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Manipulação de Proteínas">
      <ProteinasClient proteinas={proteinas} processamentos={processamentos} />
    </DemoShell>
  );
}
