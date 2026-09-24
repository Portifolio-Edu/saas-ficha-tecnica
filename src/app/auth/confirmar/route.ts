import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// PRODUCAO (2026-09-24): destino dos links que o Supabase manda por e-mail
// (confirmação de cadastro e recuperação de senha). Antes não existia: o cliente
// confirmava o e-mail e caía na raiz sem sessão. Aceita os dois formatos do
// Supabase: `code` (PKCE, padrão do @supabase/ssr) e `token_hash` + `type`
// (templates de e-mail personalizados, funcionam mesmo abrindo em outro aparelho).
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type") as EmailOtpType | null;
  // Só caminhos internos, pra o link não virar redirecionamento pra site de fora.
  const proximoBruto = url.searchParams.get("next") ?? "/visao-geral";
  const proximo = proximoBruto.startsWith("/") && !proximoBruto.startsWith("//") ? proximoBruto : "/visao-geral";

  const supabase = await createClient();
  let erro: string | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    erro = error?.message ?? null;
  } else if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
    erro = error?.message ?? null;
  } else {
    erro = "Link incompleto.";
  }

  if (erro) {
    const destino = new URL("/login", url.origin);
    destino.searchParams.set("aviso", "link-invalido");
    return NextResponse.redirect(destino);
  }
  return NextResponse.redirect(new URL(proximo, url.origin));
}
