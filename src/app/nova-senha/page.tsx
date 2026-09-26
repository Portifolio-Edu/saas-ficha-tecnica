import Link from "next/link";
import { CartaoAuth } from "@/components/auth/CartaoAuth";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { NovaSenhaForm } from "./NovaSenhaForm";

// Sempre montada na hora: depende da sessão aberta pelo link do e-mail.
export const dynamic = "force-dynamic";

// PRODUCAO (2026-09-24): chega aqui pelo link do e-mail de recuperação, que já
// abre a sessão em /auth/confirmar. Sem sessão, o link expirou ou já foi usado.
export default async function NovaSenhaPage() {
  let logado = false;
  if (supabaseConfigurado()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    logado = !!data.user;
  }
  if (!logado) {
    return (
      <CartaoAuth titulo="Link expirado" subtitulo="Esse link de senha nova já foi usado ou venceu. Peça outro, ele chega em alguns segundos.">
        <Link href="/recuperar-senha" className="block text-center text-[14px] font-semibold min-h-11 leading-[44px] rounded-lg" style={{ background: "var(--tinta)", color: "var(--panel)" }}>
          Pedir outro link
        </Link>
      </CartaoAuth>
    );
  }
  return (
    <CartaoAuth titulo="Crie sua senha nova" subtitulo="Depois de salvar, você entra direto no painel.">
      <NovaSenhaForm />
    </CartaoAuth>
  );
}
