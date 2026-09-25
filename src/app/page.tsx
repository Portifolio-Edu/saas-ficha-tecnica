import { redirect } from "next/navigation";
import { getClienteAtual } from "@/lib/dados/cliente";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { rotaInicial } from "@/lib/auth/papeis";

export default async function Home() {
  if (!supabaseConfigurado()) {
    redirect("/preview/visao-geral");
  }

  const cliente = await getClienteAtual();
  // EQUIPE (2026-09-25): cada papel cai na própria tela inicial (cozinha no
  // /cozinha, estoquista no /estoque). Antes: sempre /visao-geral.
  redirect(cliente ? rotaInicial(cliente.papel) : "/login");
}

