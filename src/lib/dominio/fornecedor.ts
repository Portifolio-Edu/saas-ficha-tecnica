import type { AgendaFornecedor, CategoriaPedido } from "./requisicao";

// PEDIDOS DA COZINHA (2026-09-26): agenda estruturada (dias da semana,
// horário limite do pedido, antecedência e categorias). Antes os dias de
// entrega eram texto livre ("Segunda, Quarta"), sem como calcular prazo.
export interface Fornecedor {
  id: string;
  empresa: string;
  contato: string | null;
  telefone: string;
  email: string | null;
  fornece: string | null;
  /** 0 = domingo … 6 = sábado. */
  entregaDias: number[];
  /** Horário limite do pedido, "HH:MM" (null = sem limite). */
  pedidoAte: string | null;
  /** Dias antes da entrega que o pedido precisa sair (0 = no próprio dia). */
  pedidoAntecedencia: number;
  categoriasPedido: CategoriaPedido[];
  horarioEntrega: string | null;
  prazoUrgencia: string | null;
}

export interface FornecedorInput {
  empresa: string;
  contato: string;
  telefone: string;
  email: string;
  fornece: string;
  entregaDias: number[];
  pedidoAte: string;
  pedidoAntecedencia: number;
  categoriasPedido: CategoriaPedido[];
  horarioEntrega: string;
  prazoUrgencia: string;
}

export function agendaDoFornecedor(f: Fornecedor): AgendaFornecedor {
  return { empresa: f.empresa, categorias: f.categoriasPedido, diasEntrega: f.entregaDias, pedidoAte: f.pedidoAte, antecedencia: f.pedidoAntecedencia };
}

export function validarFornecedor(f: FornecedorInput): string | null {
  if (!f.empresa.trim()) return "Informe o nome da empresa.";
  if (!f.telefone.trim()) return "Informe o telefone.";
  if (f.pedidoAte && !/^\d{2}:\d{2}$/.test(f.pedidoAte)) return "Horário limite no formato 18:00.";
  if (!(f.pedidoAntecedencia >= 0 && f.pedidoAntecedencia <= 7)) return "Antecedência de 0 a 7 dias.";
  if (f.entregaDias.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) return "Dia de entrega inválido.";
  return null;
}
