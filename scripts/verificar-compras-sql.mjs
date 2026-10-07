// QA isolado em PostgreSQL WASM; não substitui migrations completas no CI.
// COMPRAS_QA_MODULOS=/caminho/node_modules node scripts/verificar-compras-sql.mjs
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
const require = createRequire(resolve(process.env.COMPRAS_QA_MODULOS ?? "node_modules", "qa.cjs"));
const { PGlite } = require("@electric-sql/pglite");
const db = new PGlite();
const ler = arquivo => readFile(new URL(`../${arquivo}`, import.meta.url), "utf8");
const tabela = (sql, nome) => {
  const bloco = sql.match(new RegExp(`create table ${nome} \\([\\s\\S]*?\\n\\);`, "i"))?.[0];
  if (!bloco) throw new Error(`Tabela não encontrada: ${nome}`); return bloco;
};
const funcao = (sql, nome) => {
  const bloco = sql.match(new RegExp(`create or replace function ${nome}\\([\\s\\S]*?\\$\\$;`, "i"))?.[0];
  if (!bloco) throw new Error(`Função não encontrada: ${nome}`); return bloco;
};
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema interno;
    grant usage on schema public,auth,interno to anon,authenticated,service_role;
    create function auth.uid() returns uuid language sql stable as $$select (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid$$;
    create table auth.users(id uuid primary key,instance_id uuid,aud text,role text,email text,encrypted_password text,email_confirmed_at timestamptz,created_at timestamptz,updated_at timestamptz,raw_app_meta_data jsonb,raw_user_meta_data jsonb);`);
  const [init, equipe, endurecimento] = await Promise.all([
    ler("supabase/migrations/20260916124442_init_schema.sql"),
    ler("supabase/migrations/20260925120000_equipe_papeis.sql"),
    ler("supabase/migrations/20260928100000_endurecimento.sql"),
  ]);
  for (const nome of ["clientes", "locais_armazenamento", "insumos", "fornecedores"]) await db.exec(tabela(init, nome));
  await db.exec(tabela(equipe, "membros"));
  await db.exec(funcao(equipe, "criar_membro_dono"));
  await db.exec("create trigger clientes_cria_dono after insert on clientes for each row execute function criar_membro_dono();");
  for (const nome of ["auth_cliente_id", "auth_papel", "auth_gestao", "auth_estoque"]) await db.exec(funcao(equipe, nome));
  for (const [nome, parametros] of [["auth_cliente_id", ""], ["auth_papel", ""], ["auth_gestao", ""], ["auth_estoque", ""]]) {
    await db.exec(`alter function public.${nome}(${parametros}) set schema interno; alter function interno.${nome}(${parametros}) set search_path=public,interno;`);
  }
  for (const nome of ["cliente_de", "garantir_mesmo_restaurante", "carimbar_criado_por"]) await db.exec(funcao(endurecimento, `interno\\.${nome}`));
  await db.exec(`grant select on public.membros,public.insumos,public.fornecedores to authenticated;
    alter table public.fornecedores enable row level security;
    create policy fornecedores_qa on public.fornecedores for select to authenticated using(cliente_id=interno.auth_cliente_id() and interno.auth_estoque());`);
  await db.exec(await ler("supabase/migrations/20260928130000_requisicoes_compra.sql"));
  await db.exec(await ler("supabase/migrations/20261007160000_aprovacao_compras.sql"));
  const resultados = await db.exec(await ler("supabase/testes/requisicoes.sql"));
  const linhas = resultados.flatMap(r => r.rows).filter(r => r.status);
  for (const r of linhas) console.log(`${r.status}: ${r.teste}${r.status === "OK" ? "" : ` (${r.esperado} / ${r.obtido})`}`);
  if (!linhas.length || linhas.some(r => r.status !== "OK")) process.exitCode = 1;
  // Reversão do banco em ambiente descartável: preserva pedido e autoria.
  await db.exec(`insert into auth.users(id,email) values('f9000000-0000-0000-0000-000000000001','reversao@exemplo.invalid');
    insert into clientes(id,user_id,nome,nome_restaurante,telefone) values('f9000000-0000-0000-0000-000000000002','f9000000-0000-0000-0000-000000000001','Dono teste','Teste reversão','5500000000999');
    set role authenticated;
    select set_config('request.jwt.claims','{"sub":"f9000000-0000-0000-0000-000000000001","role":"authenticated"}',false);
    insert into requisicoes(cliente_id,categoria,descricao,responsavel) values('f9000000-0000-0000-0000-000000000002','secos','Teste reversão','Dono teste');
    update requisicoes set status='aprovado' where descricao='Teste reversão';
    reset role; select set_config('request.jwt.claims','{}',false);`);
  await db.exec(await ler("supabase/reverter/20261007160000_aprovacao_compras.sql"));
  const reversao = await db.query("select status,aprovado_nome,aprovado_em is not null as autoria from requisicoes where descricao='Teste reversão'");
  if (reversao.rows.length !== 1 || reversao.rows[0].status !== "pendente" || reversao.rows[0].aprovado_nome !== "Dono teste" || !reversao.rows[0].autoria) throw new Error("Reversão não preservou pedido e autoria");
  console.log("OK: reversão do banco preserva pedido e autoria");
} catch (erro) { console.error(erro.message); console.error(erro.detail ?? ""); console.error(erro.where ?? ""); process.exitCode = 1; }
finally { await db.close(); }
