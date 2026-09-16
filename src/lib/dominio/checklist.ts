export type MomentoChecklist = "abertura" | "praca" | "processo" | "fechamento";

export const MOMENTOS: { id: MomentoChecklist; label: string }[] = [
  { id: "abertura", label: "Abertura" },
  { id: "praca", label: "Praça" },
  { id: "processo", label: "Processo" },
  { id: "fechamento", label: "Fechamento" },
];

export interface ChecklistItem {
  id: string;
  checklistId: string;
  texto: string;
  ordem: number;
  concluidoHoje: boolean;
}

export interface Checklist {
  id: string;
  nome: string;
  momento: MomentoChecklist;
  itens: ChecklistItem[];
}

export interface ChecklistInput {
  nome: string;
  momento: MomentoChecklist;
}
