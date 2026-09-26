import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { clienteDoContexto } from "@/lib/agente/comoUsuario";

// Server Components can't write cookies, so setAll there is expected to
// throw — session refresh for those requests happens in middleware.ts instead.
export async function createClient() {
  // AGENTE IA (2026-09-26): dentro de uma ferramenta do agente, o cliente é o
  // da pessoa que está falando (src/lib/agente/comoUsuario.ts), não o do cookie.
  const doAgente = clienteDoContexto();
  if (doAgente) return doAgente as unknown as ReturnType<typeof createServerClient>;

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // called from a Server Component; ignored.
          }
        },
      },
    },
  );
}
