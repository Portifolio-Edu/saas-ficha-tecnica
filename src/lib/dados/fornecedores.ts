import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "./erros";
import type { Fornecedor, FornecedorInput } from "@/lib/dominio/fornecedor";
import type { CategoriaPedido } from "@/lib/dominio/requisicao";

export type { Fornecedor, FornecedorInput } from "@/lib/dominio/fornecedor";

interface LinhaFornecedor {
  id: string;
  empresa: string;
  contato: string | null;
  telefone: string;
  email: string | null;
  fornece: string | null;
  entrega_dias: number[];
  pedido_ate: string | null;
  pedido_antecedencia: number;
  categorias_pedido: CategoriaPedido[];
  horario_entrega: string | null;
  prazo_urgencia: string | null;
}

function paraFornecedor(f: LinhaFornecedor): Fornecedor {
  return {
    id: f.id,
    empresa: f.empresa,
    contato: f.contato,
    telefone: f.telefone,
    email: f.email,
    fornece: f.fornece,
    entregaDias: f.entrega_dias ?? [],
    pedidoAte: f.pedido_ate ? f.pedido_ate.slice(0, 5) : null,
    pedidoAntecedencia: f.pedido_antecedencia ?? 1,
    categoriasPedido: f.categorias_pedido ?? [],
    horarioEntrega: f.horario_entrega,
    prazoUrgencia: f.prazo_urgencia,
  };
}

function paraLinha(input: FornecedorInput) {
  return {
    empresa: input.empresa.trim(),
    contato: input.contato || null,
    telefone: input.telefone,
    email: input.email || null,
    fornece: input.fornece || null,
    entrega_dias: [...new Set(input.entregaDias)].sort((a, b) => a - b),
    pedido_ate: input.pedidoAte || null,
    pedido_antecedencia: input.pedidoAntecedencia,
    categorias_pedido: [...new Set(input.categoriasPedido)],
    horario_entrega: input.horarioEntrega || null,
    prazo_urgencia: input.prazoUrgencia || null,
  };
}

const COLUNAS = "id, empresa, contato, telefone, email, fornece, entrega_dias, pedido_ate, pedido_antecedencia, categorias_pedido, horario_entrega, prazo_urgencia";

export async function listarFornecedores(): Promise<Fornecedor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("fornecedores").select(COLUNAS).order("empresa");
  if (error) throw new Error(mensagemErro(error));
  return ((data ?? []) as LinhaFornecedor[]).map(paraFornecedor);
}

export async function criarFornecedor(clienteId: string, input: FornecedorInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("fornecedores").insert({ cliente_id: clienteId, ...paraLinha(input) });
  if (error) throw new Error(mensagemErro(error));
}

export async function atualizarFornecedor(id: string, input: FornecedorInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("fornecedores").update(paraLinha(input)).eq("id", id);
  if (error) throw new Error(mensagemErro(error));
}

export async function excluirFornecedor(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("fornecedores").delete().eq("id", id);
  if (error) throw new Error(mensagemErro(error));
}
