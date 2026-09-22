import { redirect } from "next/navigation";
import { getClienteAtual } from "@/lib/dados/cliente";
import { supabaseConfigurado } from "@/lib/supabase/config";

export default async function Home() {
  if (!supabaseConfigurado()) {
    redirect("/preview/visao-geral");
  }

  const cliente = await getClienteAtual();
  redirect(cliente ? "/visao-geral" : "/login");
}

