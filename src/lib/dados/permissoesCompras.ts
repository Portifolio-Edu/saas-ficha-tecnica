import { createClient } from "@/lib/supabase/server";

/** A concessão é do restaurante; nunca vem do corpo da ação de compra. */
export async function estoquePodeAprovarCompras(clienteId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clientes").select("estoque_pode_aprovar_compras").eq("id", clienteId).single();
  if (error || !data) throw new Error("Não foi possível conferir a permissão de compras. Atualize e tente novamente.");
  return data.estoque_pode_aprovar_compras === true;
}
