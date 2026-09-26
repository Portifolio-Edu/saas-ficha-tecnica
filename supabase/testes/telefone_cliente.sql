-- Teste do telefone do restaurante (2026-09-26): formato único e conferência
-- antes do cadastro. Roda numa transação e desfaz no fim. Toda linha precisa sair OK.
begin;
create temp table resultado (teste text, esperado text, obtido text) on commit drop;
grant all on resultado to authenticated, anon;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tel@exemplo.invalid', 'x', now(), now(), now(), '{}', '{}');
insert into clientes (user_id, nome, nome_restaurante, telefone)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Dona T', 'Restaurante T', telefone_normalizado('(11) 98765-4321'));

insert into resultado select 'normaliza (11) 98765-4321', '5511987654321', telefone_normalizado('(11) 98765-4321');
insert into resultado select 'normaliza +55 11 98765-4321', '5511987654321', telefone_normalizado('+55 11 98765-4321');
do $$ begin
  begin insert into clientes (user_id, nome, nome_restaurante, telefone)
      select id, 'X', 'X', '(11) 91111-2222' from auth.users where email = 'tel@exemplo.invalid';
    insert into resultado values ('trava: telefone fora do formato','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('trava: telefone fora do formato','bloqueado','bloqueado'); end;
end $$;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into resultado select 'visitante: número já usado (outro formato)', 'false', telefone_disponivel('11987654321')::text;
insert into resultado select 'visitante: número livre', 'true', telefone_disponivel('(21) 99999-0000')::text;
insert into resultado select 'visitante: não lê clientes', '0', count(*)::text from clientes;
reset role;

select teste, esperado, obtido, case when esperado = obtido then 'OK' else 'FALHOU' end as status from resultado;
rollback;
