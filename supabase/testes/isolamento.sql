-- Teste de isolamento entre restaurantes (RLS). Roda tudo numa transação e
-- desfaz no fim: não grava nada. Rodar no SQL Editor do Supabase (ou pelo MCP)
-- depois de qualquer migration. Toda linha precisa sair com status OK.
-- Criado em 2026-09-24; achou o erro corrigido em 20260924130000.
begin;
create temp table resultado (teste text, esperado text, obtido text) on commit drop;
grant all on resultado to authenticated, anon;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
 ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','teste-a@exemplo.invalid','x',now(),now(),now(),'{}','{}'),
 ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','teste-b@exemplo.invalid','x',now(),now(),now(),'{}','{}');
insert into clientes (id, user_id, nome, nome_restaurante, telefone) values
 ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','A','Restaurante A','+5500000000001'),
 ('bbbbbbbb-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','B','Restaurante B','+5500000000002');
insert into insumos (id, cliente_id, nome, unidade_medida, tamanho_embalagem, preco_embalagem) values
 ('aaaaaaaa-1111-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Tomate A','kg',1,10),
 ('bbbbbbbb-1111-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000002','Camarão B','kg',1,80);
insert into estoque (insumo_id, saldo_atual) values ('aaaaaaaa-1111-0000-0000-000000000001',5),('bbbbbbbb-1111-0000-0000-000000000002',7);
insert into checklists (id, cliente_id, nome, momento) values ('bbbbbbbb-2222-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000002','Praça B','praca');

-- Restaurante A logado
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
insert into resultado select 'A lê só os próprios insumos', 'Tomate A', coalesce(string_agg(nome, ','),'(nada)') from insumos;
insert into resultado select 'A vê só o próprio cliente', 'Restaurante A', coalesce(string_agg(nome_restaurante, ','),'(nada)') from clientes;
insert into resultado select 'A vê checklists de B', '0', count(*)::text from checklists;
do $$ begin
  begin insert into insumos (cliente_id, nome, unidade_medida, tamanho_embalagem, preco_embalagem) values ('bbbbbbbb-0000-0000-0000-000000000002','Invasor','kg',1,1);
    insert into resultado values ('A grava insumo em nome de B','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('A grava insumo em nome de B','bloqueado','bloqueado'); end;
  begin perform ajustar_saldo_estoque('bbbbbbbb-1111-0000-0000-000000000002', -7);
    insert into resultado values ('A mexe no estoque de B via função','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('A mexe no estoque de B via função','bloqueado','bloqueado'); end;
  begin perform substituir_receita_insumos('bbbbbbbb-2222-0000-0000-000000000002', '[]'::jsonb);
    insert into resultado values ('A troca ficha de B via função','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('A troca ficha de B via função','bloqueado','bloqueado'); end;
  begin insert into checklist_areas (checklist_id, nome) values ('bbbbbbbb-2222-0000-0000-000000000002','Área invasora');
    insert into resultado values ('A cria área na praça de B','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('A cria área na praça de B','bloqueado','bloqueado'); end;
end $$;
update insumos set preco_embalagem = 0 where id = 'bbbbbbbb-1111-0000-0000-000000000002';
select ajustar_saldo_estoque('aaaaaaaa-1111-0000-0000-000000000001', 2);
reset role;
insert into resultado select 'preço de B depois do UPDATE de A', '80', preco_embalagem::text from insumos where id='bbbbbbbb-1111-0000-0000-000000000002';
insert into resultado select 'estoque de B depois', '7', saldo_atual::text from estoque where insumo_id='bbbbbbbb-1111-0000-0000-000000000002';
insert into resultado select 'A ajusta o próprio estoque (5+2)', '7', saldo_atual::text from estoque where insumo_id='aaaaaaaa-1111-0000-0000-000000000001';

-- Visitante sem login
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into resultado select 'visitante lê insumos', '0', count(*)::text from insumos;
insert into resultado select 'visitante lê clientes', '0', count(*)::text from clientes;
do $$ begin
  begin perform ajustar_saldo_estoque(gen_random_uuid(), 1);
    insert into resultado values ('visitante chama função que altera estoque','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('visitante chama função que altera estoque','bloqueado','bloqueado'); end;
end $$;
reset role;

select teste, esperado, obtido, case when esperado = obtido then 'OK' else 'FALHOU' end as status from resultado;
rollback;
