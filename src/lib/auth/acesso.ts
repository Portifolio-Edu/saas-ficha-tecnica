import { redirect } from "next/navigation";
import { getClienteAtual, type ClienteAtual } from "@/lib/dados/cliente";
import { podeAcessar, rotaInicial } from "./papeis";

// EQUIPE (2026-09-25): porta de cada tela do app. Sem login vai pro /login;
// com papel que não pode ver a tela vai pra tela inicial do papel (o
// aparelho da cozinha cai sempre no /cozinha). Substitui o
// `getClienteAtual() + redirect("/login")` que cada page.tsx repetia.
export async function exigirAcesso(rota: string): Promise<ClienteAtual> {
  const cliente = await getClienteAtual();
  if (!cliente) redirect("/login");
  if (!podeAcessar(cliente.papel, rota)) redirect(rotaInicial(cliente.papel));
  return cliente;
}
