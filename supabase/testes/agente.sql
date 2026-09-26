-- Teste do agente IA (2026-09-26): propostas (quem propõe, quem vê, quem
-- decide, uma vez só) e WhatsApp vinculado (só o servidor verifica; número
-- verificado é de uma pessoa só). Roda numa transação e desfaz no fim.
begin;
create temp table resultado (teste text, esperado text, obtido text) on commit drop;
grant all on resultado to authenticated, anon, service_role;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, 'x', now(), now(), now(), '{}', '{}'
from (values
  ('d1111111-0000-0000-0000-000000000001', 'ag-dono@exemplo.invalid'),
  ('d1111111-0000-0000-0000-000000000002', 'ag-estoque@exemplo.invalid'),
  ('d1111111-0000-0000-0000-000000000003', 'ag-cozinha@exemplo.invalid'),
  ('d2222222-0000-0000-0000-000000000001', 'ag-outro@exemplo.invalid')
) as u(id, email);
insert into clientes (id, user_id, nome, nome_restaurante, telefone) values
 ('d1a00000-0000-0000-0000-000000000001','d1111111-0000-0000-0000-000000000001','Dono A','Restaurante A','5500000000101'),
 ('d2a00000-0000-0000-0000-000000000001','d2222222-0000-0000-0000-000000000001','Outro','Restaurante B','5500000000102');
insert into membros (cliente_id, user_id, papel, nome, ativo) values
 ('d1a00000-0000-0000-0000-000000000001','d1111111-0000-0000-0000-000000000002','estoquista','Estoque A', true),
 ('d1a00000-0000-0000-0000-000000000001','d1111111-0000-0000-0000-000000000003','cozinha','Tablet A', true);

set local role authenticated;

-- ESTOQUISTA propõe
select set_config('request.jwt.claims', '{"sub":"d1111111-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into agente_acoes (cliente_id, user_id, tipo, resumo, dados, canal)
values ('d1a00000-0000-0000-0000-000000000001','d1111111-0000-0000-0000-000000000002','entrada_estoque','Entrada da nota 123: 10 kg de tomate','{"itens":[]}','whatsapp');
insert into resultado select 'estoquista: propõe e vê a proposta', '1', count(id)::text from agente_acoes;
do $$ begin
  begin insert into agente_acoes (cliente_id, user_id, tipo, resumo, dados, canal)
      values ('d1a00000-0000-0000-0000-000000000001','d1111111-0000-0000-0000-000000000001','pedido_compra','x','{}','web');
    insert into resultado values ('estoquista: propõe em nome de outra pessoa','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('estoquista: propõe em nome de outra pessoa','bloqueado','bloqueado'); end;
  begin insert into agente_acoes (cliente_id, user_id, tipo, resumo, dados, canal)
      values ('d1a00000-0000-0000-0000-000000000001','d1111111-0000-0000-0000-000000000002','apagar_tudo','x','{}','web');
    insert into resultado values ('trava: tipo de proposta desconhecido','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('trava: tipo de proposta desconhecido','bloqueado','bloqueado'); end;
end $$;
do $$ begin
  begin update agente_acoes set dados = '{"hack":true}', resumo = 'trocado';
    insert into resultado values ('trocar o conteúdo da proposta','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('trocar o conteúdo da proposta','bloqueado','bloqueado'); end;
end $$;
update agente_acoes set status = 'confirmada', resultado = 'aplicando';
update agente_acoes set status = 'confirmada', resultado = 'Entrada lançada.';
insert into resultado select 'estoquista: confirma; conteúdo fica e a hora é do banco', 'confirmada Entrada da nota 123: 10 kg de tomate {"itens": []} sim',
  (select status || ' ' || resumo || ' ' || dados::text || ' ' || case when decidido_em is not null then 'sim' else 'não' end from agente_acoes);
do $$ begin
  begin update agente_acoes set status = 'confirmada', resultado = 'aplicando';
    if found then insert into resultado values ('aplicar de novo','bloqueado','PASSOU (falha)');
    else insert into resultado values ('aplicar de novo','bloqueado','bloqueado'); end if;
  exception when insufficient_privilege then insert into resultado values ('aplicar de novo','bloqueado','bloqueado'); end;
  begin update agente_acoes set status = 'cancelada';
    if found then insert into resultado values ('decidir de novo','bloqueado','PASSOU (falha)');
    else insert into resultado values ('decidir de novo','bloqueado','bloqueado'); end if;
  exception when insufficient_privilege then insert into resultado values ('decidir de novo','bloqueado','bloqueado'); end;
end $$;

-- DONO vê a proposta do estoquista mas não decide por ele
insert into agente_acoes (cliente_id, user_id, tipo, resumo, dados, canal)
values ('d1a00000-0000-0000-0000-000000000001','d1111111-0000-0000-0000-000000000002','pedido_compra','Comprar coentro','{"itens":[]}','web');
select set_config('request.jwt.claims', '{"sub":"d1111111-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultado select 'dono: vê as propostas da equipe', '2', count(id)::text from agente_acoes;
update agente_acoes set status = 'confirmada' where resumo = 'Comprar coentro';
insert into resultado select 'dono: não decide a proposta de outra pessoa', 'pendente', (select status from agente_acoes where resumo = 'Comprar coentro');

-- TABLET da cozinha não usa o agente
select set_config('request.jwt.claims', '{"sub":"d1111111-0000-0000-0000-000000000003","role":"authenticated"}', true);
do $$ begin
  begin insert into agente_acoes (cliente_id, user_id, tipo, resumo, dados, canal)
      values ('d1a00000-0000-0000-0000-000000000001','d1111111-0000-0000-0000-000000000003','pedido_compra','x','{}','web');
    insert into resultado values ('tablet: propõe','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('tablet: propõe','bloqueado','bloqueado'); end;
end $$;
insert into resultado select 'tablet: não vê propostas', '0', count(id)::text from agente_acoes;

-- OUTRA CASA
select set_config('request.jwt.claims', '{"sub":"d2222222-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultado select 'outra casa: não vê propostas', '0', count(id)::text from agente_acoes;

-- WHATSAPP: estoquista vincula; não consegue se marcar verificado
select set_config('request.jwt.claims', '{"sub":"d1111111-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into agente_whatsapp (cliente_id, user_id, telefone, codigo_hash, codigo_expira_em)
values ('d1a00000-0000-0000-0000-000000000001','d1111111-0000-0000-0000-000000000002','5511988887777', repeat('a', 64), now() + interval '15 minutes');
do $$ begin
  begin update agente_whatsapp set verificado_em = now();
    insert into resultado values ('pessoa: se marca verificada','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('pessoa: se marca verificada','bloqueado','bloqueado'); end;
  begin perform codigo_hash from agente_whatsapp;
    insert into resultado values ('pessoa: lê o hash do código','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('pessoa: lê o hash do código','bloqueado','bloqueado'); end;
end $$;
reset role;

-- SERVIDOR verifica (recebeu "ATIVAR <código>" do número certo)
set local role service_role;
update agente_whatsapp set verificado_em = now(), codigo_hash = null where user_id = 'd1111111-0000-0000-0000-000000000002';
insert into resultado select 'servidor: verifica o número', 'sim', (select case when verificado_em is not null then 'sim' else 'não' end from agente_whatsapp where user_id = 'd1111111-0000-0000-0000-000000000002');
reset role;

-- Trocar o número desfaz a verificação
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d1111111-0000-0000-0000-000000000002","role":"authenticated"}', true);
update agente_whatsapp set telefone = '5511977776666';
insert into resultado select 'trocar o número desfaz a verificação', 'não', (select case when verificado_em is not null then 'sim' else 'não' end from agente_whatsapp where user_id = 'd1111111-0000-0000-0000-000000000002');
reset role;

-- Mesmo número verificado pra duas pessoas: não
set local role service_role;
update agente_whatsapp set verificado_em = now() where user_id = 'd1111111-0000-0000-0000-000000000002';
insert into agente_whatsapp (cliente_id, user_id, telefone, verificado_em) values ('d2a00000-0000-0000-0000-000000000001','d2222222-0000-0000-0000-000000000001','5511977776666', null);
do $$ begin
  begin update agente_whatsapp set verificado_em = now() where user_id = 'd2222222-0000-0000-0000-000000000001';
    insert into resultado values ('número verificado de uma pessoa só','bloqueado','PASSOU (falha)');
  exception when unique_violation then insert into resultado values ('número verificado de uma pessoa só','bloqueado','bloqueado'); end;
end $$;
reset role;

-- Outra casa não vê o WhatsApp da equipe; visitante não vê nada
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d2222222-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultado select 'outra casa: só vê o próprio número', '1', count(id)::text from agente_whatsapp;
reset role;
set local role anon;
do $$ begin
  begin perform count(id) from agente_acoes;
    insert into resultado values ('visitante: lê propostas','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('visitante: lê propostas','bloqueado','bloqueado'); end;
end $$;
reset role;

select teste, esperado, obtido, case when esperado = obtido then 'OK' else 'FALHOU' end as status from resultado;
rollback;
