-- Teste do endurecimento da etapa 3 (2026-09-28): referência cruzada entre
-- restaurantes, colunas protegidas, carimbo de autoria e funções fora da API.
-- Roda numa transação e desfaz no fim. Toda linha precisa sair OK.
begin;
create temp table resultado (teste text, esperado text, obtido text) on commit drop;
grant all on resultado to authenticated, anon, service_role;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, 'x', now(), now(), now(), '{}', '{}'
from (values
  ('d1111111-0000-0000-0000-000000000001', 'end-dono-a@exemplo.invalid'),
  ('d1111111-0000-0000-0000-000000000002', 'end-cozinha-a@exemplo.invalid'),
  ('d2222222-0000-0000-0000-000000000001', 'end-dono-b@exemplo.invalid'),
  ('d3333333-0000-0000-0000-000000000001', 'end-novo@exemplo.invalid')
) as u(id, email);
insert into clientes (id, user_id, nome, nome_restaurante, telefone) values
 ('da000000-0000-0000-0000-000000000001','d1111111-0000-0000-0000-000000000001','Dona A','Restaurante A','5500000000091'),
 ('db000000-0000-0000-0000-000000000001','d2222222-0000-0000-0000-000000000001','Dono B','Restaurante B','5500000000092');
insert into membros (cliente_id, user_id, papel, nome, ativo) values
 ('da000000-0000-0000-0000-000000000001','d1111111-0000-0000-0000-000000000002','cozinha','Tablet A', true);

insert into insumos (id, cliente_id, nome, unidade_medida, tamanho_embalagem, preco_embalagem) values
 ('da000000-1111-0000-0000-000000000001','da000000-0000-0000-0000-000000000001','Tomate A','kg',1,8),
 ('db000000-1111-0000-0000-000000000001','db000000-0000-0000-0000-000000000001','Trufa B','kg',1,900);
insert into receitas (id, cliente_id, nome_prato, preco_venda, rendimento) values
 ('da000000-3333-0000-0000-000000000001','da000000-0000-0000-0000-000000000001','Molho A',30,1),
 ('db000000-3333-0000-0000-000000000001','db000000-0000-0000-0000-000000000001','Prato B',90,1);
insert into locais_armazenamento (id, cliente_id, nome) values
 ('da000000-4444-0000-0000-000000000001','da000000-0000-0000-0000-000000000001','Geladeira A'),
 ('db000000-4444-0000-0000-000000000001','db000000-0000-0000-0000-000000000001','Câmara B');
insert into checklists (id, cliente_id, nome, momento) values
 ('da000000-2222-0000-0000-000000000001','da000000-0000-0000-0000-000000000001','Abertura A','abertura'),
 ('db000000-2222-0000-0000-000000000001','db000000-0000-0000-0000-000000000001','Abertura B','abertura');
insert into checklist_areas (id, checklist_id, nome) values
 ('db000000-5555-0000-0000-000000000001','db000000-2222-0000-0000-000000000001','Pista B');

insert into resultado select 'auth_* fora da API (schema public)', '0',
  (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname in ('auth_cliente_id','auth_papel','auth_gestao','auth_estoque'));

set local role authenticated;

-- DONA A
select set_config('request.jwt.claims', '{"sub":"d1111111-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into receita_insumos (receita_id, insumo_id, peso_liquido, unidade) values
 ('da000000-3333-0000-0000-000000000001','da000000-1111-0000-0000-000000000001',0.5,'kg');
insert into resultado select 'A: ficha com insumo próprio grava', '1', count(*)::text from receita_insumos;

do $$ begin
  begin insert into receita_insumos (receita_id, insumo_id, peso_liquido, unidade) values
      ('da000000-3333-0000-0000-000000000001','db000000-1111-0000-0000-000000000001',0.1,'kg');
    insert into resultado values ('A: ficha com insumo de B','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('A: ficha com insumo de B','bloqueado','bloqueado'); end;
  begin insert into receita_insumos (receita_id, sub_receita_id, peso_liquido, unidade) values
      ('da000000-3333-0000-0000-000000000001','db000000-3333-0000-0000-000000000001',0.1,'kg');
    insert into resultado values ('A: sub-receita de B','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('A: sub-receita de B','bloqueado','bloqueado'); end;
  begin perform substituir_receita_insumos('da000000-3333-0000-0000-000000000001',
      '[{"insumoId":"db000000-1111-0000-0000-000000000001","pesoLiquido":0.1,"unidade":"kg"}]'::jsonb);
    insert into resultado values ('A: função da ficha com insumo de B','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('A: função da ficha com insumo de B','bloqueado','bloqueado'); end;
  begin update insumos set local_armazenamento_id = 'db000000-4444-0000-0000-000000000001' where id = 'da000000-1111-0000-0000-000000000001';
    insert into resultado values ('A: insumo guardado no local de B','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('A: insumo guardado no local de B','bloqueado','bloqueado'); end;
  begin insert into checklist_itens (checklist_id, area_id, texto) values
      ('da000000-2222-0000-0000-000000000001','db000000-5555-0000-0000-000000000001','Item');
    insert into resultado values ('A: item de checklist na área de B','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('A: item de checklist na área de B','bloqueado','bloqueado'); end;
  begin update clientes set plano = 'premium', status_assinatura = 'ativa';
    insert into resultado values ('A: muda o próprio plano','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('A: muda o próprio plano','bloqueado','bloqueado'); end;
  begin update clientes set user_id = 'd3333333-0000-0000-0000-000000000001';
    insert into resultado values ('A: troca o dono do restaurante','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('A: troca o dono do restaurante','bloqueado','bloqueado'); end;
end $$;
update clientes set margem_alvo = 0.3 where id = 'da000000-0000-0000-0000-000000000001';
insert into resultado select 'A: ainda edita o cadastro (margem alvo)', '0.3', margem_alvo::text from clientes where id = 'da000000-0000-0000-0000-000000000001';
insert into resultado select 'substituir_receita_insumos com insumo próprio', '1',
  (select count(*)::text from (select substituir_receita_insumos('da000000-3333-0000-0000-000000000001',
     '[{"insumoId":"da000000-1111-0000-0000-000000000001","pesoLiquido":0.3,"unidade":"kg"}]'::jsonb)) x);

-- TABLET DA COZINHA A
select set_config('request.jwt.claims', '{"sub":"d1111111-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into producoes (id, cliente_id, lote, receita_id, quantidade, responsavel, status)
values ('da000000-6666-0000-0000-000000000001','da000000-0000-0000-0000-000000000001','MA-1','da000000-3333-0000-0000-000000000001',2,'Ana','em_producao');
insert into resultado select 'cozinha: produção sai com a autoria de quem registrou', 'd1111111-0000-0000-0000-000000000002',
  criado_por::text from producoes where id = 'da000000-6666-0000-0000-000000000001';
insert into registros_temperatura (local_armazenamento_id, temperatura_c, responsavel, criado_por)
values ('da000000-4444-0000-0000-000000000001', 4, 'Ana', 'd2222222-0000-0000-0000-000000000001');
insert into resultado select 'cozinha: temperatura ignora autoria forjada', 'd1111111-0000-0000-0000-000000000002',
  criado_por::text from registros_temperatura where local_armazenamento_id = 'da000000-4444-0000-0000-000000000001';
update producoes set status = 'produzido' where id = 'da000000-6666-0000-0000-000000000001';
insert into resultado select 'cozinha: ainda muda o status', 'produzido', status from producoes where id = 'da000000-6666-0000-0000-000000000001';
do $$ begin
  begin update producoes set estoque_baixado = false where id = 'da000000-6666-0000-0000-000000000001';
    insert into resultado values ('cozinha: mexe na baixa do estoque','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('cozinha: mexe na baixa do estoque','bloqueado','bloqueado'); end;
  begin insert into producoes (cliente_id, lote, receita_id, quantidade, responsavel, status, criado_por)
      values ('da000000-0000-0000-0000-000000000001','MA-4','da000000-3333-0000-0000-000000000001',1,'Ana','em_producao','d2222222-0000-0000-0000-000000000001');
    insert into resultado values ('cozinha: registra produção em nome de outro','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('cozinha: registra produção em nome de outro','bloqueado','bloqueado'); end;
  begin insert into producoes (cliente_id, lote, receita_id, quantidade, responsavel, status, estoque_baixado)
      values ('da000000-0000-0000-0000-000000000001','MA-2','da000000-3333-0000-0000-000000000001',1,'Ana','em_producao', true);
    insert into resultado values ('cozinha: registra já marcando estoque baixado','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('cozinha: registra já marcando estoque baixado','bloqueado','bloqueado'); end;
  begin insert into producoes (cliente_id, lote, receita_id, quantidade, responsavel, status)
      values ('da000000-0000-0000-0000-000000000001','MA-3','db000000-3333-0000-0000-000000000001',1,'Ana','em_producao');
    insert into resultado values ('cozinha: produz a receita de B','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('cozinha: produz a receita de B','bloqueado','bloqueado'); end;
  begin insert into clientes (user_id, nome, nome_restaurante, telefone)
      values ('d1111111-0000-0000-0000-000000000002','X','Fantasma','5500000000099');
    insert into resultado values ('membro abre um segundo restaurante','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('membro abre um segundo restaurante','bloqueado','bloqueado'); end;
  begin perform interno.auth_papel();
    insert into resultado values ('logado ainda usa as funções de papel (policies)','ok','ok');
  exception when others then insert into resultado values ('logado ainda usa as funções de papel (policies)','ok','falhou'); end;
end $$;

-- Erros do sistema (2026-09-28): só a service role lê e grava.
do $$ begin
  begin perform count(*) from erros_sistema;
    insert into resultado values ('logado lê a tabela de erros','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('logado lê a tabela de erros','bloqueado','bloqueado'); end;
  begin insert into erros_sistema (origem, mensagem) values ('navegador', 'forjado');
    insert into resultado values ('logado grava erro direto','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('logado grava erro direto','bloqueado','bloqueado'); end;
end $$;

-- PESSOA NOVA (cadastro): cria o próprio restaurante, sem escolher plano
select set_config('request.jwt.claims', '{"sub":"d3333333-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$ begin
  begin insert into clientes (user_id, nome, nome_restaurante, telefone, plano)
      values ('d3333333-0000-0000-0000-000000000001','Novo','Novo','5500000000093','premium');
    insert into resultado values ('cadastro escolhendo o plano','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('cadastro escolhendo o plano','bloqueado','bloqueado'); end;
end $$;
insert into clientes (user_id, nome, nome_restaurante, telefone)
values ('d3333333-0000-0000-0000-000000000001','Novo','Novo','5500000000093');
insert into resultado select 'cadastro normal cria restaurante em teste grátis', 'trial', plano from clientes where user_id = 'd3333333-0000-0000-0000-000000000001';
insert into resultado select 'cadastro normal vira dono', 'dono', interno.auth_papel();

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  begin perform count(*) from producoes;
    insert into resultado values ('visitante lê produções','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('visitante lê produções','bloqueado','bloqueado'); end;
  begin perform interno.auth_cliente_id();
    insert into resultado values ('visitante chama função de papel','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('visitante chama função de papel','bloqueado','bloqueado'); end;
end $$;
reset role;

select teste, esperado, obtido, case when esperado = obtido then 'OK' else 'FALHOU' end as status from resultado;
rollback;
