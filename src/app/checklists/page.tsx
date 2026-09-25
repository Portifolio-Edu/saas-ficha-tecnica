import { exigirAcesso } from "@/lib/auth/acesso";
import { listarChecklists } from "@/lib/dados/checklists";
import { garantirTurnosPadrao } from "@/lib/dados/producoes";
import { AppShell } from "@/components/ficha/AppShell";
import { ChecklistsClient } from "./ChecklistsClient";

export default async function ChecklistsPage() {
  const cliente = await exigirAcesso("/checklists");

  const [checklists, turnos] = await Promise.all([listarChecklists(), garantirTurnosPadrao(cliente.id)]);

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} papel={cliente.papel} tituloPagina="Checklists de turno">
      <ChecklistsClient checklists={checklists} turnos={turnos} />
    </AppShell>
  );
}
