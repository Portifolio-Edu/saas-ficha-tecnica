let avisou = false;

/**
 * Sem as variáveis do Supabase o app cai no modo demonstração (a raiz manda
 * pra /preview e ninguém consegue logar). Em dev isso é conveniente; num
 * deploy de produção quase sempre é variável esquecida, então avisa no log
 * do servidor em vez de degradar calado.
 */
export function supabaseConfigurado(): boolean {
  const ok = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!ok && !avisou && process.env.NODE_ENV === "production") {
    avisou = true;
    console.error(
      "[config] NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes: login desativado e a raiz redireciona pra demonstração (/preview).",
    );
  }
  return ok;
}
