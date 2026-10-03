import { ChecklistsClient } from "@/app/checklists/ChecklistsClient";
import { checklists, turnos } from "../fixtures";

export default function Page() {
  return (
    <ChecklistsClient checklists={checklists} turnos={turnos} />
  );
}
