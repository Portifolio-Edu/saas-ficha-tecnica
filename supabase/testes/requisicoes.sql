-- Teste dos pedidos da cozinha (2026-09-26): quem pede, quem resolve, quem
-- vê a agenda do fornecedor. Roda numa transação e desfaz no fim.
begin;
create temp table resultado (teste text, esperado text, obtido text) on commit drop;
grant all on resultado to authenticated, anon, service_role;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, 'x', now(), now(), now(), '{}', '{}'
from (values
  ('f1111111-0000-0000-0000-000000000001', 'req-dono@exemplo.invalid'),
  ('f1111111-0000-0000-0000-000000000002', 'req-cozinha@exemplo.invalid'),
  ('f1111111-0000-0000-0000-000000000003', 'req-estoque@exemplo.invalid'),
  ('f2222222-0000-0000-0000-000000000001', 'req-outro@exemplo.invalid')
) as u(id, email);
insert into clientes (id, user_id, nome, nome_restaurante, telefone) values
 ('fa000000-0000-0000-0000-000000000001','f1111111-0000-0000-0000-000000000001','Dona R','Restaurante R','5500000000061'),
 ('fb000000-0000-0000-0000-000000000001','f2222222-0000-0000-0000-000000000001','Outro','Restaurante S','5500000000062');
insert into membros (cliente_id, user_id, papel, nome, ativo) values
 ('fa000000-0000-0000-0000-000000000001','f1111111-0000-0000-0000-000000000002','cozinha','Tablet R', true),
 ('fa000000-0000-0000-0000-000000000001','f1111111-0000-0000-0000-000000000003','estoquista','Estoque R', true);
insert into insumos (id, cliente_id, nome, categoria, unidade_medida, tamanho_embalagem, preco_embalagem) values
 ('fa000000-1111-0000-0000-000000000001','fa000000-0000-0000-0000-000000000001','Tomate','hortalica','kg',1,8),
 ('fb000000-1111-0000-0000-000000000001','fb000000-0000-0000-0000-000000000001','Tomate S','hortalica','kg',1,8);
insert into fornecedores (cliente_id, empresa, telefone, email, entrega_dias, pedido_ate, pedido_antecedencia, categorias_pedido) values
 ('fa000000-0000-0000-0000-000000000001','Verde Horta','11988887777','segredo@verde.invalid','{1,3,5}','18:00',1,'{hortifruti}'),
 ('fa000000-0000-0000-0000-000000000001','Sem agenda','11988886666',null,'{}',null,1,'{secos}'),
 ('fb000000-0000-0000-0000-000000000001','Do vizinho','11988885555',null,'{1}','10:00',1,'{hortifruti}');

do $$ begin
  begin insert into fornecedores (cliente_id, empresa, telefone, entrega_dias) values ('fa000000-0000-0000-0000-000000000001','X','1',array[7]::smallint[]);
    insert into resultado values ('trava: dia da semana inválido','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('trava: dia da semana inválido','bloqueado','bloqueado'); end;
  begin insert into fornecedores (cliente_id, empresa, telefone, categorias_pedido) values ('fa000000-0000-0000-0000-000000000001','X','1','{bebidas}');
    insert into resultado values ('trava: categoria de pedido inválida','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('trava: categoria de pedido inválida','bloqueado','bloqueado'); end;
end $$;

set local role authenticated;

-- TABLET
select set_config('request.jwt.claims', '{"sub":"f1111111-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into requisicoes (cliente_id, categoria, insumo_id, descricao, quantidade, unidade, responsavel)
values ('fa000000-0000-0000-0000-000000000001','hortifruti','fa000000-1111-0000-0000-000000000001','Tomate',8,'kg','Ana');
insert into requisicoes (cliente_id, categoria, descricao, responsavel)
values ('fa000000-0000-0000-0000-000000000001','hortifruti','Coentro','Ana');
insert into resultado select 'cozinha: pede e vê os pedidos', '2', count(*)::text from requisicoes;
insert into resultado select 'cozinha: autoria carimbada', 'f1111111-0000-0000-0000-000000000002', min(criado_por::text) from requisicoes;
insert into resultado select 'cozinha: vê a agenda sem telefone nem e-mail', 'Verde Horta {1,3,5} 18:00:00 1',
  (select string_agg(empresa || ' ' || entrega_dias::text || ' ' || pedido_ate::text || ' ' || pedido_antecedencia::text, '; ') from agenda_fornecedores());
do $$ begin
  begin perform count(*) from fornecedores where telefone is not null;
    if (select count(*) from fornecedores) = 0 then insert into resultado values ('cozinha: não lê o cadastro de fornecedores','0 linhas','0 linhas');
    else insert into resultado values ('cozinha: não lê o cadastro de fornecedores','0 linhas','LEU (falha)'); end if;
  exception when insufficient_privilege then insert into resultado values ('cozinha: não lê o cadastro de fornecedores','0 linhas','0 linhas'); end;
  begin update requisicoes set status = 'comprado';
    if found then insert into resultado values ('cozinha: marca comprado','bloqueado','PASSOU (falha)');
    else insert into resultado values ('cozinha: marca comprado','bloqueado','bloqueado'); end if;
  exception when insufficient_privilege then insert into resultado values ('cozinha: marca comprado','bloqueado','bloqueado'); end;
  begin insert into requisicoes (cliente_id, categoria, descricao, responsavel, status) values ('fa000000-0000-0000-0000-000000000001','secos','Arroz','Ana','comprado');
    insert into resultado values ('cozinha: cria pedido já comprado','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('cozinha: cria pedido já comprado','bloqueado','bloqueado'); end;
  begin insert into requisicoes (cliente_id, categoria, insumo_id, descricao, responsavel) values ('fa000000-0000-0000-0000-000000000001','hortifruti','fb000000-1111-0000-0000-000000000001','Tomate S','Ana');
    insert into resultado values ('cozinha: pede insumo de outro restaurante','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('cozinha: pede insumo de outro restaurante','bloqueado','bloqueado'); end;
  begin insert into requisicoes (cliente_id, categoria, descricao, responsavel) values ('fa000000-0000-0000-0000-000000000001','hortifruti','  ','Ana');
    insert into resultado values ('trava: pedido sem nome','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('trava: pedido sem nome','bloqueado','bloqueado'); end;
end $$;
delete from requisicoes where descricao = 'Coentro';
insert into resultado select 'cozinha: tira do pedido enquanto pendente', '1', count(*)::text from requisicoes;

-- ESTOQUISTA
select set_config('request.jwt.claims', '{"sub":"f1111111-0000-0000-0000-000000000003","role":"authenticated"}', true);
update requisicoes set status = 'comprado';
insert into resultado select 'estoque: marca comprado e o banco carimba quem e quando', 'comprado f1111111-0000-0000-0000-000000000003 sim',
  (select status || ' ' || resolvido_por::text || ' ' || case when resolvido_em is not null then 'sim' else 'não' end from requisicoes);

-- TABLET de novo: comprado não sai mais
select set_config('request.jwt.claims', '{"sub":"f1111111-0000-0000-0000-000000000002","role":"authenticated"}', true);
delete from requisicoes;
insert into resultado select 'cozinha: não apaga o que já foi comprado', '1', count(*)::text from requisicoes;

-- OUTRO RESTAURANTE
select set_config('request.jwt.claims', '{"sub":"f2222222-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultado select 'outro restaurante: não vê pedidos', '0', count(*)::text from requisicoes;
insert into resultado select 'outro restaurante: agenda só dele', 'Do vizinho', (select string_agg(empresa, ',') from agenda_fornecedores());
reset role;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  begin perform count(*) from requisicoes;
    insert into resultado values ('visitante lê pedidos','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('visitante lê pedidos','bloqueado','bloqueado'); end;
  begin perform count(*) from agenda_fornecedores();
    insert into resultado values ('visitante lê agenda','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('visitante lê agenda','bloqueado','bloqueado'); end;
end $$;
reset role;

select teste, esperado, obtido, case when esperado = obtido then 'OK' else 'FALHOU' end as status from resultado;
rollback;
