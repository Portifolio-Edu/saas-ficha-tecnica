// Verificação isolada da migration em PostgreSQL WASM (PGlite).
// Não substitui o CI que recria TODAS as migrations no Supabase.
// ASSINATURA_QA_MODULOS=/caminho/node_modules node scripts/verificar-assinatura-sql.mjs
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
const requerer = createRequire(resolve(process.env.ASSINATURA_QA_MODULOS ?? "node_modules", "qa.cjs"));
const { PGlite } = requerer("@electric-sql/pglite");
const db = new PGlite();
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema interno;
    grant usage on schema public,auth to anon,authenticated,service_role;
    create function auth.uid() returns uuid language sql stable as $$
      select (current_setting('request.jwt.claims',true)::jsonb ->> 'sub')::uuid
    $$;
    create table auth.users(id uuid primary key,email text);
    create table public.clientes(id uuid primary key,user_id uuid references auth.users(id),nome text,nome_restaurante text,telefone text,plano text default 'trial',status_assinatura text default 'trial');
    grant select on public.clientes to authenticated;
    grant all on public.clientes to service_role;
  `);
  await db.exec(await readFile(new URL("../supabase/migrations/20261007120000_assinatura_saas.sql", import.meta.url), "utf8"));
  const resultados = await db.exec(await readFile(new URL("../supabase/testes/assinatura_saas.sql", import.meta.url), "utf8"));
  const linhas = resultados.flatMap(r => r.rows).filter(r => r.status);
  for (const linha of linhas) console.log(`${linha.status}: ${linha.teste}`);
  if (!linhas.length || linhas.some(l => l.status !== "OK")) process.exitCode = 1;
} finally { await db.close(); }
