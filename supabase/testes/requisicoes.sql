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
  ('f1111111-0000-0000-0000-000000000004', 'req-gestor@exemplo.invalid'),
  ('f2222222-0000-0000-0000-000000000001', 'req-outro@exemplo.invalid')
) as u(id, email);
insert into clientes (id, user_id, nome, nome_restaurante, telefone) values
 ('fa000000-0000-0000-0000-000000000001','f1111111-0000-0000-0000-000000000001','Dona R','Restaurante R','5500000000061'),
 ('fb000000-0000-0000-0000-000000000001','f2222222-0000-0000-0000-000000000001','Outro','Restaurante S','5500000000062');
insert into membros (cliente_id, user_id, papel, nome, ativo) values
 ('fa000000-0000-0000-0000-000000000001','f1111111-0000-0000-0000-000000000002','cozinha','Tablet R', true),
 ('fa000000-0000-0000-0000-000000000001','f1111111-0000-0000-0000-000000000003','estoquista','Estoque R', true),
 ('fa000000-0000-0000-0000-000000000001','f1111111-0000-0000-0000-000000000004','gestor','Gestor R', true);
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
do $$ begin
  begin update requisicoes set status='comprado'; insert into resultado values('estoque: não compra antes da aprovação','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values('estoque: não compra antes da aprovação','bloqueado','bloqueado'); end;
  begin update requisicoes set status='aprovado'; insert into resultado values('estoque: não aprova a própria compra','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values('estoque: não aprova a própria compra','bloqueado','bloqueado'); end;
  begin update requisicoes set status='cancelado'; insert into resultado values('estoque: não rejeita pedido da cozinha','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values('estoque: não rejeita pedido da cozinha','bloqueado','bloqueado'); end;
  begin update requisicoes set aprovado_por=auth.uid(); insert into resultado values('estoque: não forja aprovador','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values('estoque: não forja aprovador','bloqueado','bloqueado'); end;
end $$;
-- GESTOR aprova antes de o estoque executar.
select set_config('request.jwt.claims','{"sub":"f1111111-0000-0000-0000-000000000004","role":"authenticated"}',true);
update requisicoes set status='aprovado';
insert into resultado select 'gestor: aprovação identifica pessoa e data','aprovado Gestor R f1111111-0000-0000-0000-000000000004 sim',
 status||' '||aprovado_nome||' '||aprovado_por::text||' '||case when aprovado_em is not null and resolvido_em is null then 'sim' else 'não' end from requisicoes;
-- O tablet acompanha a aprovação e não consegue apagar/retirar autorização.
select set_config('request.jwt.claims','{"sub":"f1111111-0000-0000-0000-000000000002","role":"authenticated"}',true);
delete from requisicoes;
insert into resultado select 'cozinha: não retira item aprovado','1',count(*)::text from requisicoes;
select set_config('request.jwt.claims','{"sub":"f1111111-0000-0000-0000-000000000003","role":"authenticated"}',true);
update requisicoes set status = 'comprado';
insert into resultado select 'estoque: marca comprado e o banco carimba quem e quando', 'comprado f1111111-0000-0000-0000-000000000003 sim',
  (select status || ' ' || resolvido_por::text || ' ' || case when resolvido_em is not null then 'sim' else 'não' end from requisicoes);

insert into resultado select 'estoque: confirmação preserva aprovação original','Gestor R Estoque R',aprovado_nome||' '||resolvido_nome from requisicoes;
do $$ begin
  begin update requisicoes set status='comprado'; insert into resultado values('repetição não sobrescreve confirmação','bloqueado','PASSOU (falha)');
  exception when raise_exception then insert into resultado values('repetição não sobrescreve confirmação','bloqueado','bloqueado'); end;
  begin update requisicoes set status='pendente'; insert into resultado values('compra concluída não reabre sem controle','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values('compra concluída não reabre sem controle','bloqueado','bloqueado'); end;
end $$;

-- TABLET de novo: comprado não sai mais
select set_config('request.jwt.claims', '{"sub":"f1111111-0000-0000-0000-000000000002","role":"authenticated"}', true);
delete from requisicoes;
insert into resultado select 'cozinha: não apaga o que já foi comprado', '1', count(*)::text from requisicoes;

-- O dono também decide compras solicitadas pelo estoque.
select set_config('request.jwt.claims','{"sub":"f1111111-0000-0000-0000-000000000003","role":"authenticated"}',true);
insert into requisicoes(cliente_id,categoria,descricao,responsavel) values('fa000000-0000-0000-0000-000000000001','secos','Arroz','Estoque R');
insert into resultado select 'estoque: solicita com status pendente','pendente',status from requisicoes where descricao='Arroz';
select set_config('request.jwt.claims','{"sub":"f1111111-0000-0000-0000-000000000002","role":"authenticated"}',true);
delete from requisicoes where descricao='Arroz';
insert into resultado select 'tablet não exclui solicitação de outra pessoa','1',count(*)::text from requisicoes where descricao='Arroz';
select set_config('request.jwt.claims','{"sub":"f1111111-0000-0000-0000-000000000001","role":"authenticated"}',true);
update requisicoes set status='cancelado' where descricao='Arroz';
insert into resultado select 'dono: rejeita com autoria e sem aprovação fictícia','cancelado Dona R sim',status||' '||resolvido_nome||' '||case when aprovado_em is null and resolvido_em is not null then 'sim' else 'não' end from requisicoes where descricao='Arroz';

-- Um lote com estados diferentes é rejeitado inteiro, sem confirmação parcial.
insert into requisicoes(cliente_id,categoria,descricao,responsavel) values
 ('fa000000-0000-0000-0000-000000000001','secos','Lote autorizado','Dona R'),
 ('fa000000-0000-0000-0000-000000000001','secos','Lote aguardando','Dona R');
update requisicoes set status='aprovado' where descricao='Lote autorizado';
do $$ begin
 begin update requisicoes set status='comprado' where descricao in ('Lote autorizado','Lote aguardando');
 insert into resultado values('lote não compra item sem aprovação','bloqueado','PASSOU (falha)');
 exception when insufficient_privilege then insert into resultado values('lote não compra item sem aprovação','bloqueado','bloqueado'); end;
end $$;
insert into resultado select 'falha do lote não confirma parcialmente','aprovado',status from requisicoes where descricao='Lote autorizado';

-- OUTRO RESTAURANTE
select set_config('request.jwt.claims', '{"sub":"f2222222-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultado select 'outro restaurante: não vê pedidos', '0', count(*)::text from requisicoes;
with tentativa as (update requisicoes set status='aprovado' returning id) insert into resultado select 'outro restaurante: não aprova pedidos', '0',count(*)::text from tentativa;
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
