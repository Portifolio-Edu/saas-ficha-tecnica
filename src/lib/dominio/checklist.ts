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

/** POLIMENTO checklists-pracas (2026-09-22): foto de referência de uma praça
 * montada (checklist com momento "praca"). Uma praça pode ter várias, uma por
 * elemento (bancada, geladeira de apoio, forno...), descrito na legenda. */
export interface ChecklistFoto {
  id: string;
  checklistId: string;
  url: string;
  legenda: string | null;
  ordem: number;
}

export interface Checklist {
  id: string;
  nome: string;
  momento: MomentoChecklist;
  itens: ChecklistItem[];
  fotos: ChecklistFoto[];
}

export interface ChecklistInput {
  nome: string;
  momento: MomentoChecklist;
}
