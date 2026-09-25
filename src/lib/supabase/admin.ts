import { createClient as criarClienteSupabase, type SupabaseClient } from "@supabase/supabase-js";

// EQUIPE (2026-09-25): cliente com a service role, que IGNORA a RLS. Usado só
// no servidor e só onde o usuário não pode agir sozinho:
//   - criar/desativar login da equipe (Supabase Auth admin);
//   - parear o aparelho da cozinha;
//   - baixar o estoque da produção lançada pela cozinha
//     (rpc baixar_estoque_producao, que só a service role executa).
// Toda ação que usa isto confere antes, pela sessão normal, quem está pedindo
// e o papel dele. Nunca importar em componente "use client": a chave dá
// acesso total ao banco. Variável: SUPABASE_SERVICE_ROLE_KEY (sem NEXT_PUBLIC_,
// então o Next não a manda pro navegador).

export function serviceRoleConfigurada(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function criarClienteAdmin(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("criarClienteAdmin() só pode rodar no servidor.");
  }
  if (!serviceRoleConfigurada()) {
    throw new Error(
      "Falta a variável SUPABASE_SERVICE_ROLE_KEY no servidor (Vercel → Settings → Environment Variables). Sem ela não dá pra criar acessos nem ligar o aparelho da cozinha.",
    );
  }
  return criarClienteSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
