-- Teste da lista de produção (2026-09-26): gestão e cozinha montam; a
-- cozinha não apaga o que o gestor pediu; outra casa não vê; estoquista só vê.
-- Roda numa transação e desfaz no fim.
begin;
create temp table resultado (teste text, esperado text, obtido text) on commit drop;
grant all on resultado to authenticated, anon, service_role;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, 'x', now(), now(), now(), '{}', '{}'
from (values
  ('b8111111-0000-0000-0000-000000000001', 'plano-dono@exemplo.invalid'),
  ('b8111111-0000-0000-0000-000000000002', 'plano-cozinha@exemplo.invalid'),
  ('b8111111-0000-0000-0000-000000000003', 'plano-estoque@exemplo.invalid'),
  ('b8222222-0000-0000-0000-000000000001', 'plano-outro@exemplo.invalid')
) as u(id, email);
insert into clientes (id, user_id, nome, nome_restaurante, telefone) values
 ('b8a00000-0000-0000-0000-000000000001','b8111111-0000-0000-0000-000000000001','Dono P','Restaurante P','5500000000081'),
 ('b8b00000-0000-0000-0000-000000000001','b8222222-0000-0000-0000-000000000001','Outro','Restaurante Q','5500000000082');
insert into membros (cliente_id, user_id, papel, nome, ativo) values
 ('b8a00000-0000-0000-0000-000000000001','b8111111-0000-0000-0000-000000000002','cozinha','Tablet P', true),
 ('b8a00000-0000-0000-0000-000000000001','b8111111-0000-0000-0000-000000000003','estoquista','Estoque P', true);
insert into receitas (id, cliente_id, nome_prato, preco_venda, rendimento) values
 ('b8a00000-3333-0000-0000-000000000001','b8a00000-0000-0000-0000-000000000001','Molho',30,2),
 ('b8a00000-3333-0000-0000-000000000002','b8a00000-0000-0000-0000-000000000001','Massa',20,1),
 ('b8b00000-3333-0000-0000-000000000001','b8b00000-0000-0000-0000-000000000001','Do vizinho',40,1);

set local role authenticated;

-- DONO pede molho
select set_config('request.jwt.claims', '{"sub":"b8111111-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into plano_producao (cliente_id, data, receita_id, quantidade, observacao, responsavel)
values ('b8a00000-0000-0000-0000-000000000001', current_date, 'b8a00000-3333-0000-0000-000000000001', 4, 'Pro almoço', 'Dono P');
insert into resultado select 'dono: pede e vê', '1', count(id)::text from plano_producao;
do $$ begin
  begin insert into plano_producao (cliente_id, data, receita_id, quantidade) values ('b8a00000-0000-0000-0000-000000000001', current_date, 'b8b00000-3333-0000-0000-000000000001', 1);
    insert into resultado values ('dono: receita de outra casa','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('dono: receita de outra casa','bloqueado','bloqueado'); end;
  begin insert into plano_producao (cliente_id, data, receita_id, quantidade) values ('b8a00000-0000-0000-0000-000000000001', current_date, 'b8a00000-3333-0000-0000-000000000001', 2);
    insert into resultado values ('mesma receita duas vezes no dia','bloqueado','PASSOU (falha)');
  exception when unique_violation then insert into resultado values ('mesma receita duas vezes no dia','bloqueado','bloqueado'); end;
  begin insert into plano_producao (cliente_id, data, receita_id, quantidade) values ('b8a00000-0000-0000-0000-000000000001', current_date, 'b8a00000-3333-0000-0000-000000000002', 0);
    insert into resultado values ('quantidade zero','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('quantidade zero','bloqueado','bloqueado'); end;
end $$;

-- TABLET pede massa, não apaga nem muda o molho do dono
select set_config('request.jwt.claims', '{"sub":"b8111111-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into plano_producao (cliente_id, data, receita_id, quantidade, responsavel)
values ('b8a00000-0000-0000-0000-000000000001', current_date, 'b8a00000-3333-0000-0000-000000000002', 3, 'Ana');
insert into resultado select 'cozinha: pede e vê a lista toda', '2', count(id)::text from plano_producao;
insert into resultado select 'cozinha: autoria carimbada', 'b8111111-0000-0000-0000-000000000002', (select criado_por::text from plano_producao where responsavel = 'Ana');
delete from plano_producao where receita_id = 'b8a00000-3333-0000-0000-000000000001';
update plano_producao set quantidade = 99 where receita_id = 'b8a00000-3333-0000-0000-000000000001';
insert into resultado select 'cozinha: não apaga nem muda o que o dono pediu', '4', (select quantidade::text from plano_producao where receita_id = 'b8a00000-3333-0000-0000-000000000001');
update plano_producao set quantidade = 5 where receita_id = 'b8a00000-3333-0000-0000-000000000002';
insert into resultado select 'cozinha: muda o que ela pediu', '5', (select quantidade::text from plano_producao where receita_id = 'b8a00000-3333-0000-0000-000000000002');
do $$ begin
  begin update plano_producao set criado_por = 'b8111111-0000-0000-0000-000000000001' where receita_id = 'b8a00000-3333-0000-0000-000000000002';
    insert into resultado values ('cozinha: troca a autoria','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('cozinha: troca a autoria','bloqueado','bloqueado'); end;
end $$;

-- ESTOQUISTA só vê
select set_config('request.jwt.claims', '{"sub":"b8111111-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into resultado select 'estoquista: vê', '2', count(id)::text from plano_producao;
do $$ begin
  begin insert into plano_producao (cliente_id, data, receita_id, quantidade) values ('b8a00000-0000-0000-0000-000000000001', current_date + 1, 'b8a00000-3333-0000-0000-000000000002', 1);
    insert into resultado values ('estoquista: pede','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('estoquista: pede','bloqueado','bloqueado'); end;
end $$;
delete from plano_producao;
insert into resultado select 'estoquista: não apaga', '2', count(id)::text from plano_producao;

-- OUTRA CASA
select set_config('request.jwt.claims', '{"sub":"b8222222-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultado select 'outra casa: não vê', '0', count(id)::text from plano_producao;
do $$ begin
  begin insert into plano_producao (cliente_id, data, receita_id, quantidade) values ('b8a00000-0000-0000-0000-000000000001', current_date, 'b8a00000-3333-0000-0000-000000000002', 1);
    insert into resultado values ('outra casa: pede na lista dos outros','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege or unique_violation then insert into resultado values ('outra casa: pede na lista dos outros','bloqueado','bloqueado'); end;
end $$;

-- DONO tira o que a cozinha pediu
select set_config('request.jwt.claims', '{"sub":"b8111111-0000-0000-0000-000000000001","role":"authenticated"}', true);
delete from plano_producao where receita_id = 'b8a00000-3333-0000-0000-000000000002';
insert into resultado select 'dono: tira qualquer item', '1', count(id)::text from plano_producao;
reset role;

-- VISITANTE
set local role anon;
do $$ begin
  begin perform count(id) from plano_producao;
    insert into resultado values ('visitante: lê a lista','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('visitante: lê a lista','bloqueado','bloqueado'); end;
end $$;
reset role;

select teste, esperado, obtido, case when esperado = obtido then 'OK' else 'FALHOU' end as status from resultado;
rollback;
