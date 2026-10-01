-- Reverte 20260928100000_endurecimento (volta os privilégios e as funções pro
-- jeito anterior). Só use se algum fluxo quebrar; o motivo de cada bloco está
-- na migration.
begin;

-- 8
update storage.buckets set file_size_limit = null, allowed_mime_types = null where id in ('receitas-fotos', 'pracas-fotos');

-- 7
grant execute on function public.telefone_disponivel(text) to anon, authenticated;

-- 4
do $$
declare t text;
begin
  foreach t in array array['producoes', 'registros_temperatura', 'checklist_execucoes', 'movimentacoes_estoque',
                           'processamentos_proteina', 'pareamentos_cozinha', 'prontuario_ocorrencias', 'perfil_notas']
  loop
    execute format('drop trigger if exists %I on %I', t || '_criado_por', t);
  end loop;
end $$;
drop function if exists interno.carimbar_criado_por();

-- 3 e 2
grant insert, update on producoes to authenticated;
grant insert, update on clientes to authenticated;
drop policy if exists clientes_cadastro on clientes;
create policy clientes_cadastro on clientes for insert with check (user_id = auth.uid());

-- 6
grant all on all tables in schema public to anon;
grant all on all sequences in schema public to anon;
grant truncate, trigger, references on all tables in schema public to authenticated;
alter default privileges in schema public grant all on tables to anon;
alter default privileges in schema public grant all on sequences to anon;
alter default privileges in schema public grant truncate, trigger, references on tables to authenticated;

-- 1
drop trigger if exists insumos_mesma_casa on insumos;
drop trigger if exists receita_insumos_mesma_casa on receita_insumos;
drop trigger if exists receita_embalagens_mesma_casa on receita_embalagens;
drop trigger if exists precos_canal_mesma_casa on precos_canal;
drop trigger if exists producoes_mesma_casa on producoes;
drop trigger if exists checklist_itens_mesma_casa on checklist_itens;
drop trigger if exists checklist_fotos_mesma_casa on checklist_fotos;
drop trigger if exists checklist_execucoes_mesma_casa on checklist_execucoes;
drop trigger if exists registros_temperatura_mesma_casa on registros_temperatura;
drop trigger if exists vendas_periodo_mesma_casa on vendas_periodo;
drop trigger if exists contagem_itens_mesma_casa on contagem_itens;
drop function if exists interno.garantir_mesmo_restaurante();
drop function if exists interno.cliente_de(text, uuid);

-- 5
alter function interno.auth_cliente_id() set schema public;
alter function interno.auth_papel() set schema public;
alter function interno.auth_gestao() set schema public;
alter function interno.auth_estoque() set schema public;
grant execute on function public.auth_cliente_id(), public.auth_papel(), public.auth_gestao(), public.auth_estoque() to anon, authenticated;
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosrc ~ 'auth_(cliente_id|papel|gestao|estoque)\s*\('
  loop
    execute format('alter function %s set search_path = public', f.assinatura);
  end loop;
end $$;
drop schema if exists interno;

commit;
