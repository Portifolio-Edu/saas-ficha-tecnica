import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "./erros";
import type { Fornecedor, FornecedorInput } from "@/lib/dominio/fornecedor";

export type { Fornecedor, FornecedorInput } from "@/lib/dominio/fornecedor";

interface LinhaFornecedor {
  id: string;
  empresa: string;
  contato: string | null;
  telefone: string;
  email: string | null;
  fornece: string | null;
  dias_entrega: string | null;
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
    diasEntrega: f.dias_entrega,
    horarioEntrega: f.horario_entrega,
    prazoUrgencia: f.prazo_urgencia,
  };
}

function paraLinha(input: FornecedorInput) {
  return {
    empresa: input.empresa,
    contato: input.contato || null,
    telefone: input.telefone,
    email: input.email || null,
    fornece: input.fornece || null,
    dias_entrega: input.diasEntrega || null,
    horario_entrega: input.horarioEntrega || null,
    prazo_urgencia: input.prazoUrgencia || null,
  };
}

export async function listarFornecedores(): Promise<Fornecedor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fornecedores")
    .select("id, empresa, contato, telefone, email, fornece, dias_entrega, horario_entrega, prazo_urgencia")
    .order("empresa");
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
