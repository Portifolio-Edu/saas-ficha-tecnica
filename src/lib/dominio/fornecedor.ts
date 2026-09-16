export interface Fornecedor {
  id: string;
  empresa: string;
  contato: string | null;
  telefone: string;
  email: string | null;
  fornece: string | null;
  diasEntrega: string | null;
  horarioEntrega: string | null;
  prazoUrgencia: string | null;
}

export interface FornecedorInput {
  empresa: string;
  contato: string;
  telefone: string;
  email: string;
  fornece: string;
  diasEntrega: string;
  horarioEntrega: string;
  prazoUrgencia: string;
}
