"use server";

import { createClient } from "@/lib/supabase/server";
import { getClienteAtual } from "@/lib/dados/cliente";
import { registrarErro } from "./index";

// PLANO 9,5, etapa 3 (2026-09-28): a tela de erro do navegador avisa o
// servidor. Só grava de quem está logado (senão qualquer um encheria a tabela).
export async function acaoRegistrarErroNavegador(entrada: { mensagem: string; digest?: string | null; rota: string }): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const cliente = await getClienteAtual().catch(() => null);
  await registrarErro({
    origem: "navegador",
    erro: String(entrada.mensagem ?? "").slice(0, 2000),
    digest: entrada.digest ?? null,
    rota: String(entrada.rota ?? "").slice(0, 500),
    userId: user.id,
    clienteId: cliente?.id ?? null,
  });
}
