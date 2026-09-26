"use server";

import { redirect } from "next/navigation";
import { getClienteAtual } from "@/lib/dados/cliente";
import { excluirRestaurante } from "@/lib/dados/conta";
import { createClient } from "@/lib/supabase/server";
import { serviceRoleConfigurada } from "@/lib/supabase/admin";

// PLANO 9,5, etapa 3 (2026-09-28): LGPD — o dono apaga o restaurante e tudo o
// que está nele. Confirma digitando o nome do restaurante; a exclusão usa a
// service role (apaga logins e fotos), então confere o papel antes.

export async function acaoExcluirRestaurante(_estado: { erro?: string }, formData: FormData): Promise<{ erro?: string }> {
  const cliente = await getClienteAtual();
  if (!cliente) return { erro: "Sessão expirada. Faça login novamente." };
  if (cliente.papel !== "dono") return { erro: "Só o dono pode excluir o restaurante." };
  const digitado = String(formData.get("confirmacao") ?? "").trim();
  if (digitado.toLocaleLowerCase("pt-BR") !== cliente.nomeRestaurante.trim().toLocaleLowerCase("pt-BR")) {
    return { erro: `Digite o nome do restaurante exatamente como aparece: ${cliente.nomeRestaurante}` };
  }
  if (!serviceRoleConfigurada()) return { erro: "O servidor ainda não está configurado para excluir contas. Fale com o suporte." };

  try {
    await excluirRestaurante(cliente.id, cliente.userId);
  } catch (e) {
    return { erro: `Não foi possível excluir tudo: ${e instanceof Error ? e.message : "erro desconhecido"}. Tente de novo; o que já saiu não volta.` };
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?aviso=conta-excluida");
}
