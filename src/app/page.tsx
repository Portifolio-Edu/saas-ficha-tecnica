import { redirect } from "next/navigation";
import { getClienteAtual } from "@/lib/dados/cliente";

export default async function Home() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/preview/visao-geral");
  }

  const cliente = await getClienteAtual();
  redirect(cliente ? "/visao-geral" : "/login");
}

