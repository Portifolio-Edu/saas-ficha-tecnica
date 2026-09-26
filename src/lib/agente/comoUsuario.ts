// AGENTE IA (2026-09-26): as ferramentas do agente rodam COMO a pessoa que
// está falando (mesma RLS, mesmo papel das telas). Não usamos a service role
// pra ler ou gravar dado do restaurante: o app abre uma sessão Supabase da
// pessoa (link mágico gerado pelo admin, que não manda e-mail, trocado na
// hora por sessão) e roda a ferramenta dentro de um contexto
// (AsyncLocalStorage) em que createClient() devolve esse cliente. Assim as
// funções de src/lib/dados/* funcionam iguais às das telas.
// A service role só aparece aqui pra abrir a sessão. Pessoa desativada
// (banida) não consegue sessão, então não usa o agente.
import { AsyncLocalStorage } from "node:async_hooks";
import { createClient as criarSupabase, type SupabaseClient } from "@supabase/supabase-js";
import { criarClienteAdmin } from "@/lib/supabase/admin";

const contexto = new AsyncLocalStorage<SupabaseClient>();

/** Usado por src/lib/supabase/server.ts: dentro de comoUsuario, é o cliente da pessoa. */
export function clienteDoContexto(): SupabaseClient | undefined {
  return contexto.getStore();
}

const cache = new Map<string, { cliente: SupabaseClient; expira: number }>();

async function abrirSessao(userId: string): Promise<SupabaseClient> {
  const guardada = cache.get(userId);
  if (guardada && guardada.expira > Date.now() + 5 * 60_000) return guardada.cliente;

  const admin = criarClienteAdmin();
  const { data: usuario, error: erroUsuario } = await admin.auth.admin.getUserById(userId);
  if (erroUsuario || !usuario.user?.email) throw new Error("Pessoa não encontrada.");
  const { data: link, error: erroLink } = await admin.auth.admin.generateLink({ type: "magiclink", email: usuario.user.email });
  if (erroLink || !link.properties?.hashed_token) throw new Error("Não foi possível abrir a sessão dessa pessoa (acesso desativado?).");

  const cliente = criarSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: sessao, error: erroSessao } = await cliente.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
  if (erroSessao || !sessao.session) throw new Error("Não foi possível abrir a sessão dessa pessoa.");
  cache.set(userId, { cliente, expira: (sessao.session.expires_at ?? 0) * 1000 });
  return cliente;
}

/** Roda `fn` como a pessoa `userId`: tudo o que usar createClient() lá dentro passa pela RLS dela. */
export async function comoUsuario<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const cliente = await abrirSessao(userId);
  return contexto.run(cliente, fn);
}
