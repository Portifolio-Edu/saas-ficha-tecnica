import { criarClienteAdmin, serviceRoleConfigurada } from "@/lib/supabase/admin";
import { montarRegistro } from "./registro";

// PLANO 9,5, etapa 3 (2026-09-28): grava o erro em erros_sistema e no log.
// Nunca lança: se o banco falhar, o erro original não pode virar outro erro.
// Só no servidor (usa a service role).

export async function registrarErro(entrada: Parameters<typeof montarRegistro>[0]): Promise<void> {
  const registro = montarRegistro({ ambiente: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null, ...entrada });
  console.error(JSON.stringify({ tipo: "erro", ...registro, detalhe: undefined }));
  if (!serviceRoleConfigurada()) return;
  try {
    const { error } = await criarClienteAdmin().from("erros_sistema").insert(registro);
    if (error) console.error(JSON.stringify({ tipo: "erro-ao-registrar", mensagem: error.message }));
  } catch (e) {
    console.error(JSON.stringify({ tipo: "erro-ao-registrar", mensagem: e instanceof Error ? e.message : String(e) }));
  }
}
