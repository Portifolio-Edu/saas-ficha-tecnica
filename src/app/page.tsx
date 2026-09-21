import { redirect } from "next/navigation";
import { getClienteAtual } from "@/lib/dados/cliente";

export default async function Home() {
  const cliente = await getClienteAtual();
  redirect(cliente ? "/visao-geral" : "/login");
}
