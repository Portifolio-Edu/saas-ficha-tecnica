import { DemoShell } from "@/components/ficha/DemoShell";
import { NOME_RESTAURANTE } from "../fixtures";
import { EquipeDemo } from "./EquipeDemo";

export default function Page() {
  return (
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Equipe e acessos">
      <EquipeDemo />
    </DemoShell>
  );
}
