// PLANO 9,5 (2026-09-26): apoio dos testes de ponta a ponta.
//  - admin(): cliente com a service role do Supabase LOCAL, só pra preparar
//    dados (catálogo) e conferir o que ficou gravado no banco;
//  - ultimoLink(): lê o último e-mail enviado pro endereço no Mailpit local;
//  - entrar(): login pela tela, igual a uma pessoa.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

/** Sufixo único por rodada: dá pra rodar várias vezes no mesmo banco. */
export const RODADA = Date.now().toString(36);

let cliente: SupabaseClient | null = null;
export function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave || !/127\.0\.0\.1|localhost/.test(url)) {
    throw new Error("Os testes de ponta a ponta só rodam contra o Supabase local. Rode `source e2e/ambiente.sh`.");
  }
  cliente ??= createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
  return cliente;
}

/** Login pela tela. Por padrão espera sair do /login (entrou); com
 * `esperaEntrar: false` só envia (pra testar senha errada). */
export async function entrar(page: Page, usuario: string, senha: string, { esperaEntrar = true } = {}) {
  await page.goto("/login");
  await page.fill("#email", usuario);
  await page.fill("#senha", senha);
  await page.getByRole("button", { name: /^Entrar/ }).click();
  if (esperaEntrar) await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

/** Espera o e-mail chegar no Mailpit e devolve o primeiro link de verificação. */
export async function ultimoLink(para: string): Promise<string> {
  const base = process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:54324";
  for (let tentativa = 0; tentativa < 30; tentativa++) {
    const busca = await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:"${para}"`)}`).then((r) => r.json());
    const id = busca.messages?.[0]?.ID;
    if (id) {
      const msg = await fetch(`${base}/api/v1/message/${id}`).then((r) => r.json());
      const texto: string = `${msg.HTML ?? ""} ${msg.Text ?? ""}`;
      const link = texto.match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify[^\s"'<>]*/)?.[0];
      if (link) return link.replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Nenhum e-mail com link chegou pra ${para}.`);
}

export async function clienteDoDono(email: string): Promise<string> {
  const { data } = await admin().auth.admin.listUsers({ perPage: 1000 });
  const user = data.users.find((u) => u.email === email);
  expect(user, `usuário ${email} existe`).toBeTruthy();
  const { data: c, error } = await admin().from("clientes").select("id").eq("user_id", user!.id).single();
  expect(error).toBeNull();
  return c!.id as string;
}
