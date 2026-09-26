-- PLANO 9,5, etapa 3 (2026-09-28): endurecimento do banco, achados da revisão
-- de segurança do PR inteiro. Nenhum restaurante real no ar quando foi aplicada.
--
--  1. Referência cruzada entre restaurantes. As policies conferem o dono da
--     linha (receita, checklist…), mas não o dono do que ela aponta: dava pra
--     gravar numa ficha própria o insumo de outro restaurante (idem sub-receita,
--     embalagem, turno, área, local, ficha do preço por canal…). Agora um
--     gatilho confere, em toda tabela com referência secundária, que as duas
--     pontas são do mesmo restaurante — vale também pras funções security
--     definer (substituir_receita_insumos passava por cima da RLS).
--  2. clientes: plano e status_assinatura eram graváveis pelo dono/gestor
--     (quando a cobrança existir, daria pra se dar plano pago). Agora só as
--     colunas de cadastro são graváveis; e quem já é membro de um restaurante
--     não cria outro (evita "sequestrar" telefones com restaurantes fantasmas).
--  3. producoes: o tablet podia gravar estoque_baixado; agora só grava as
--     colunas do registro e muda status/motivo da perda.
--  4. criado_por: o banco carimba quem fez (antes o app podia mandar outro id).
--  5. Funções auth_* (usadas pelas policies) saem da API: vão pro schema
--     interno, que o PostgREST não publica. Some o /rest/v1/rpc/auth_*.
--  6. Visitante sem login (anon) perde todo acesso às tabelas públicas: nenhum
--     fluxo do app lê tabela sem login, e um erro futuro de policy não vaza
--     pra quem nem entrou. TRUNCATE/TRIGGER/REFERENCES saem de todo mundo.
--  7. telefone_disponivel só pro servidor (service role): visitante não
--     consegue mais testar se um número é cliente.
--  8. Baldes de foto: só imagem, até 5 MB.
--
-- Onde mexer: policies novas usam interno.auth_cliente_id() / interno.auth_gestao()
-- (nome completo). Tabela nova com referência a outra tabela de restaurante:
-- criar o gatilho garantir_mesmo_restaurante (modelo no bloco 1).
-- Reverter: supabase/reverter/20260928100000_endurecimento.sql

-- ---------------------------------------------------------------------------
-- 5. Schema interno com as funções de papel.
create schema if not exists interno;
revoke all on schema interno from public;
grant usage on schema interno to authenticated, service_role;

alter function public.auth_cliente_id() set schema interno;
alter function public.auth_papel() set schema interno;
alter function public.auth_gestao() set schema interno;
alter function public.auth_estoque() set schema interno;

revoke execute on all functions in schema interno from public, anon;
grant execute on all functions in schema interno to authenticated, service_role;

-- As funções que chamam auth_* pelo nome passam a enxergar o schema interno.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'interno')
      and p.prosrc ~ 'auth_(cliente_id|papel|gestao|estoque)\s*\('
  loop
    execute format('alter function %s set search_path = public, interno', f.assinatura);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Mesma casa nas duas pontas.
create or replace function interno.cliente_de(p_tabela text, p_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare v uuid;
begin
  if p_id is null then
    return null;
  end if;
  case p_tabela
    when 'checklist_areas' then
      select c.cliente_id into v from checklist_areas a join checklists c on c.id = a.checklist_id where a.id = p_id;
    when 'checklist_itens' then
      select c.cliente_id into v from checklist_itens i join checklists c on c.id = i.checklist_id where i.id = p_id;
    when 'fichas_tecnicas' then
      select r.cliente_id into v from fichas_tecnicas f join receitas r on r.id = f.receita_id where f.id = p_id;
    when 'insumos', 'receitas', 'locais_armazenamento', 'turnos', 'checklists',
         'canais_venda', 'fechamentos_cmv', 'contagens_estoque' then
      execute format('select cliente_id from public.%I where id = $1', p_tabela) into v using p_id;
    else
      raise exception 'cliente_de: tabela % não mapeada', p_tabela;
  end case;
  return v;
end;
$$;

-- Argumentos do gatilho:
--   1º: de onde vem o restaurante da linha — 'cliente_id' (coluna direta) ou
--       'tabela.coluna' (ex.: 'receitas.receita_id');
--   demais: 'coluna:tabela' de cada referência que precisa ser da mesma casa.
create or replace function interno.garantir_mesmo_restaurante()
returns trigger
language plpgsql
security definer
set search_path = public, interno
as $$
declare
  linha jsonb := to_jsonb(new);
  v_dono uuid;
  v_coluna text;
  v_tabela text;
begin
  if tg_argv[0] = 'cliente_id' then
    v_dono := (linha->>'cliente_id')::uuid;
  else
    v_dono := interno.cliente_de(split_part(tg_argv[0], '.', 1), (linha->>split_part(tg_argv[0], '.', 2))::uuid);
  end if;

  for i in 1 .. tg_nargs - 1 loop
    v_coluna := split_part(tg_argv[i], ':', 1);
    v_tabela := split_part(tg_argv[i], ':', 2);
    if linha->>v_coluna is not null
       and interno.cliente_de(v_tabela, (linha->>v_coluna)::uuid) is distinct from v_dono then
      raise exception 'Esse registro aponta pra um item de outro restaurante (%).', v_coluna
        using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;

create trigger insumos_mesma_casa before insert or update on insumos
  for each row execute function interno.garantir_mesmo_restaurante('cliente_id', 'local_armazenamento_id:locais_armazenamento');
create trigger receita_insumos_mesma_casa before insert or update on receita_insumos
  for each row execute function interno.garantir_mesmo_restaurante('receitas.receita_id', 'insumo_id:insumos', 'sub_receita_id:receitas');
create trigger receita_embalagens_mesma_casa before insert or update on receita_embalagens
  for each row execute function interno.garantir_mesmo_restaurante('receitas.receita_id', 'insumo_id:insumos');
create trigger precos_canal_mesma_casa before insert or update on precos_canal
  for each row execute function interno.garantir_mesmo_restaurante('canais_venda.canal_id', 'ficha_tecnica_id:fichas_tecnicas');
create trigger producoes_mesma_casa before insert or update on producoes
  for each row execute function interno.garantir_mesmo_restaurante('cliente_id', 'receita_id:receitas', 'turno_id:turnos');
create trigger checklist_itens_mesma_casa before insert or update on checklist_itens
  for each row execute function interno.garantir_mesmo_restaurante('checklists.checklist_id', 'area_id:checklist_areas');
create trigger checklist_fotos_mesma_casa before insert or update on checklist_fotos
  for each row execute function interno.garantir_mesmo_restaurante('checklists.checklist_id', 'area_id:checklist_areas');
create trigger checklist_execucoes_mesma_casa before insert or update on checklist_execucoes
  for each row execute function interno.garantir_mesmo_restaurante('checklist_itens.checklist_item_id', 'turno_id:turnos');
create trigger registros_temperatura_mesma_casa before insert or update on registros_temperatura
  for each row execute function interno.garantir_mesmo_restaurante('locais_armazenamento.local_armazenamento_id', 'insumo_id:insumos');
create trigger vendas_periodo_mesma_casa before insert or update on vendas_periodo
  for each row execute function interno.garantir_mesmo_restaurante('fechamentos_cmv.fechamento_id', 'receita_id:receitas');
create trigger contagem_itens_mesma_casa before insert or update on contagem_itens
  for each row execute function interno.garantir_mesmo_restaurante('contagens_estoque.contagem_id', 'insumo_id:insumos');

-- ---------------------------------------------------------------------------
-- 6. Privilégios de tabela: visitante sem nenhum; ninguém com TRUNCATE etc.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke truncate, trigger, references on all tables in schema public from authenticated;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke truncate, trigger, references on tables from authenticated;

-- ---------------------------------------------------------------------------
-- 2. clientes: só colunas de cadastro; um restaurante por pessoa.
revoke insert, update on clientes from authenticated;
grant insert (user_id, nome, nome_restaurante, telefone, cnpj, margem_alvo) on clientes to authenticated;
grant update (nome, nome_restaurante, telefone, cnpj, margem_alvo) on clientes to authenticated;

drop policy clientes_cadastro on clientes;
create policy clientes_cadastro on clientes for insert to authenticated
  with check (user_id = auth.uid() and interno.auth_cliente_id() is null);

-- 3. producoes: o registro e o andamento; estoque_baixado só pelo servidor.
revoke insert, update on producoes from authenticated;
grant insert (id, cliente_id, lote, receita_id, quantidade, responsavel, turno_id, chefe_turno, validade, status, motivo_perda)
  on producoes to authenticated;
grant update (status, motivo_perda) on producoes to authenticated;

-- 4. criado_por é sempre quem está logado (a service role, sem usuário, mantém o que mandou).
create or replace function interno.carimbar_criado_por()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.criado_por := old.criado_por;
  elsif auth.uid() is not null then
    new.criado_por := auth.uid();
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['producoes', 'registros_temperatura', 'checklist_execucoes', 'movimentacoes_estoque',
                           'processamentos_proteina', 'pareamentos_cozinha', 'prontuario_ocorrencias', 'perfil_notas']
  loop
    execute format('create trigger %I before insert or update on %I for each row execute function interno.carimbar_criado_por()',
                   t || '_criado_por', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Telefone livre? Só o servidor pergunta.
revoke execute on function telefone_disponivel(text) from public, anon, authenticated;
grant execute on function telefone_disponivel(text) to service_role;

-- ---------------------------------------------------------------------------
-- 8. Baldes de foto aceitam só foto, até 5 MB (antes: qualquer arquivo, sem
--    limite — um .html ficava público no endereço do Storage). Mesma lista de
--    src/lib/imagem/tipoFoto.ts.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id in ('receitas-fotos', 'pracas-fotos');
