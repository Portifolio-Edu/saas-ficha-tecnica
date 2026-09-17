import { DemoShell } from "@/components/ficha/DemoShell";
import { ChecklistsClient } from "@/app/checklists/ChecklistsClient";
import { NOME_RESTAURANTE, checklists, turnos } from "../fixtures";

export default function Page() {
  return (
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Checklists de Turno">
      <ChecklistsClient checklists={checklists} turnos={turnos} />
    </DemoShell>
  );
}
