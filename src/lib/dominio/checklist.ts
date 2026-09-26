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
  /** POLIMENTO pracas-areas: área da praça (null = "Geral" ou checklist de turno). */
  areaId: string | null;
}

/** POLIMENTO pracas-areas (2026-09-23): parte de uma praça (pista fria, bancada de
 * montagem, geladeira de apoio...). Nome livre, definido pelo cliente. */
export interface ChecklistArea {
  id: string;
  checklistId: string;
  nome: string;
  ordem: number;
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
  areaId: string | null;
}

export interface Checklist {
  id: string;
  nome: string;
  momento: MomentoChecklist;
  itens: ChecklistItem[];
  fotos: ChecklistFoto[];
  areas: ChecklistArea[];
}

export interface ChecklistInput {
  nome: string;
  momento: MomentoChecklist;
}
