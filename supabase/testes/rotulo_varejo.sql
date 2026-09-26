-- Teste do rótulo para varejo (2026-09-26): campos estruturados, travas de
-- valor e quem grava. Roda numa transação e desfaz no fim.
begin;
create temp table resultado (teste text, esperado text, obtido text) on commit drop;
grant all on resultado to authenticated, anon, service_role;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, 'x', now(), now(), now(), '{}', '{}'
from (values
  ('c9111111-0000-0000-0000-000000000001', 'rot-dono@exemplo.invalid'),
  ('c9111111-0000-0000-0000-000000000002', 'rot-estoque@exemplo.invalid'),
  ('c9222222-0000-0000-0000-000000000001', 'rot-outro@exemplo.invalid')
) as u(id, email);
insert into clientes (id, user_id, nome, nome_restaurante, telefone) values
 ('c9a00000-0000-0000-0000-000000000001','c9111111-0000-0000-0000-000000000001','Dono R','Restaurante R','5500000000091'),
 ('c9b00000-0000-0000-0000-000000000001','c9222222-0000-0000-0000-000000000001','Outro','Restaurante T','5500000000092');
insert into membros (cliente_id, user_id, papel, nome, ativo) values
 ('c9a00000-0000-0000-0000-000000000001','c9111111-0000-0000-0000-000000000002','estoquista','Estoque R', true);
insert into receitas (id, cliente_id, nome_prato, preco_venda, rendimento) values
 ('c9a00000-3333-0000-0000-000000000001','c9a00000-0000-0000-0000-000000000001','Lasanha congelada',30,1);

-- Glúten escrito à mão antes vira status (a migration já rodou; confere a regra).
insert into resultado select 'regra do glúten antigo', 'nao_contem contem',
  (case when 'Não contém glúten' ~* 'n[ãa]o\s+cont[ée]m' then 'nao_contem' end) || ' ' || (case when 'Contém glúten' ~* 'n[ãa]o\s+cont[ée]m' then 'x' when 'Contém glúten' ~* 'cont[ée]m' then 'contem' end);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c9111111-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into rotulagem (receita_id, alergenicos, gluten_status, lactose_status, medida_caseira, modo_preparo, conservacao)
values ('c9a00000-3333-0000-0000-000000000001', '{"trigo":"derivados","leite":"contem","soja":"pode_conter"}', 'contem', 'contem', '1 pedaço', 'Forno 200 °C por 45 min.', 'Manter congelado a -18 °C.');
insert into resultado select 'dono: grava o rótulo estruturado', 'derivados contem 1 pedaço',
  (select (alergenicos->>'trigo') || ' ' || gluten_status || ' ' || medida_caseira from rotulagem);

do $$ begin
  begin update rotulagem set alergenicos = '{"mostarda":"contem"}';
    insert into resultado values ('trava: alergênico fora da RDC 26','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('trava: alergênico fora da RDC 26','bloqueado','bloqueado'); end;
  begin update rotulagem set alergenicos = '{"leite":"talvez"}';
    insert into resultado values ('trava: presença inválida','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('trava: presença inválida','bloqueado','bloqueado'); end;
  begin update rotulagem set alergenicos = '["leite"]';
    insert into resultado values ('trava: alergênicos precisa ser objeto','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('trava: alergênicos precisa ser objeto','bloqueado','bloqueado'); end;
  begin update rotulagem set gluten_status = 'talvez';
    insert into resultado values ('trava: glúten inválido','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('trava: glúten inválido','bloqueado','bloqueado'); end;
  begin update rotulagem set lactose_status = 'pouca';
    insert into resultado values ('trava: lactose inválida','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('trava: lactose inválida','bloqueado','bloqueado'); end;
end $$;
update rotulagem set alergenicos = '{}';
insert into resultado select 'revisado sem alergênico fica {} (≠ não revisado)', '{}', (select alergenicos::text from rotulagem);

-- Estoquista e outra casa não mexem.
select set_config('request.jwt.claims', '{"sub":"c9111111-0000-0000-0000-000000000002","role":"authenticated"}', true);
update rotulagem set medida_caseira = 'x';
insert into resultado select 'estoquista: não vê nem muda o rótulo', '0', count(*)::text from rotulagem;
select set_config('request.jwt.claims', '{"sub":"c9222222-0000-0000-0000-000000000001","role":"authenticated"}', true);
update rotulagem set medida_caseira = 'x';
insert into resultado select 'outra casa: não vê o rótulo', '0', count(*)::text from rotulagem;
reset role;
insert into resultado select 'ninguém de fora mudou', '1 pedaço', (select medida_caseira from rotulagem);

select teste, esperado, obtido, case when esperado = obtido then 'OK' else 'FALHOU' end as status from resultado;
rollback;
