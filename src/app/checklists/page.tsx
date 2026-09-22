import { redirect } from "next/navigation";
import { getClienteAtual } from "@/lib/dados/cliente";
import { listarChecklists } from "@/lib/dados/checklists";
import { garantirTurnosPadrao } from "@/lib/dados/producoes";
import { AppShell } from "@/components/ficha/AppShell";
import { ChecklistsClient } from "./ChecklistsClient";

export default async function ChecklistsPage() {
  const cliente = await getClienteAtual();
  if (!cliente) redirect("/login");

  const [checklists, turnos] = await Promise.all([listarChecklists(), garantirTurnosPadrao(cliente.id)]);

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} tituloPagina="Checklists de turno">
      <ChecklistsClient checklists={checklists} turnos={turnos} />
    </AppShell>
  );
}
