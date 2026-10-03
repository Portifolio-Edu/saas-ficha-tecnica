-- Teste da ligação produto do PDV -> ficha (2026-10-03): só a gestão grava e vê;
-- o produto sem ficha vira pendência (e continua pendente se a ficha for
-- apagada); outra casa não enxerga nem liga na ficha dos outros; preparo não
-- é vendido. Roda numa transação e desfaz no fim.
begin;
create temp table resultado (teste text, esperado text, obtido text) on commit drop;
grant all on resultado to authenticated, anon, service_role;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, 'x', now(), now(), now(), '{}', '{}'
from (values
  ('b9111111-0000-0000-0000-000000000001', 'pdv-dono@exemplo.invalid'),
  ('b9111111-0000-0000-0000-000000000002', 'pdv-gestor@exemplo.invalid'),
  ('b9111111-0000-0000-0000-000000000003', 'pdv-estoque@exemplo.invalid'),
  ('b9111111-0000-0000-0000-000000000004', 'pdv-cozinha@exemplo.invalid'),
  ('b9222222-0000-0000-0000-000000000001', 'pdv-outro@exemplo.invalid')
) as u(id, email);
insert into clientes (id, user_id, nome, nome_restaurante, telefone) values
 ('b9a00000-0000-0000-0000-000000000001','b9111111-0000-0000-0000-000000000001','Dono PDV','Restaurante PDV','5500000000091'),
 ('b9b00000-0000-0000-0000-000000000001','b9222222-0000-0000-0000-000000000001','Outro','Restaurante Outro PDV','5500000000092');
insert into membros (cliente_id, user_id, papel, nome, ativo) values
 ('b9a00000-0000-0000-0000-000000000001','b9111111-0000-0000-0000-000000000002','gestor','Gestor PDV', true),
 ('b9a00000-0000-0000-0000-000000000001','b9111111-0000-0000-0000-000000000003','estoquista','Estoque PDV', true),
 ('b9a00000-0000-0000-0000-000000000001','b9111111-0000-0000-0000-000000000004','cozinha','Tablet PDV', true);
insert into receitas (id, cliente_id, nome_prato, tipo, preco_venda, rendimento) values
 ('b9a00000-3333-0000-0000-000000000001','b9a00000-0000-0000-0000-000000000001','Pizza Margherita','prato_final',50,1),
 ('b9a00000-3333-0000-0000-000000000002','b9a00000-0000-0000-0000-000000000001','Lasanha','prato_final',60,1),
 ('b9a00000-3333-0000-0000-000000000003','b9a00000-0000-0000-0000-000000000001','Massa base','preparo_base',null,1),
 ('b9b00000-3333-0000-0000-000000000001','b9b00000-0000-0000-0000-000000000001','Prato do vizinho','prato_final',40,1);

set local role authenticated;

-- DONO grava uma importação: 1 ligado, 1 "sem ficha", 1 pendente
select set_config('request.jwt.claims', '{"sub":"b9111111-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultado select 'dono: grava a importação e recebe 1 pendente', '1', public.salvar_produtos_pdv('importacao', '[
  {"chave":"1|PIZZA MARGUERITA G","codigo":"1","descricao":"PIZZA MARGUERITA G","receita_id":"b9a00000-3333-0000-0000-000000000001","quantidade":10,"valor":500,"data":"2026-10-01"},
  {"chave":"2|COCA 2L","codigo":"2","descricao":"COCA 2L","sem_ficha":true,"quantidade":5,"valor":40,"data":"2026-10-01"},
  {"chave":"3|ESCONDIDINHO","codigo":"3","descricao":"ESCONDIDINHO","quantidade":7,"valor":210,"data":"2026-10-02"}
]'::jsonb)::text;
insert into resultado select 'dono: vê os 3 produtos', '3', count(id)::text from produtos_pdv;
insert into resultado select 'dono: o pendente é o escondidinho', 'ESCONDIDINHO', (select descricao from produtos_pdv where receita_id is null and not sem_ficha);
insert into resultado select 'dono: guarda o tamanho da pendência (qtd)', '7', (select ultima_quantidade::text from produtos_pdv where chave = '3|ESCONDIDINHO');
insert into resultado select 'dono: autoria carimbada pelo banco', 'b9111111-0000-0000-0000-000000000001', (select criado_por::text from produtos_pdv where chave = '3|ESCONDIDINHO');

-- Importar de novo troca a decisão e não duplica; produto repetido na mesma lista conta uma vez
insert into resultado select 'dono: decide o pendente e zera a pendência', '0', public.salvar_produtos_pdv('importacao', '[
  {"chave":"3|ESCONDIDINHO","codigo":"3","descricao":"ESCONDIDINHO","receita_id":"b9a00000-3333-0000-0000-000000000002","quantidade":9,"valor":270,"data":"2026-10-03"},
  {"chave":"3|ESCONDIDINHO","codigo":"3","descricao":"ESCONDIDINHO","receita_id":"b9a00000-3333-0000-0000-000000000002","quantidade":9,"valor":270,"data":"2026-10-03"}
]'::jsonb)::text;
insert into resultado select 'dono: continua com 3 linhas (sem duplicar)', '3', count(id)::text from produtos_pdv;
insert into resultado select 'dono: o escondidinho agora é a lasanha', 'b9a00000-3333-0000-0000-000000000002', (select receita_id::text from produtos_pdv where chave = '3|ESCONDIDINHO');
insert into resultado select 'dono: guarda a última quantidade', '9', (select ultima_quantidade::text from produtos_pdv where chave = '3|ESCONDIDINHO');

-- Receita apagada devolve o produto pra pendente (venda não some em silêncio)
reset role;
delete from receitas where id = 'b9a00000-3333-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b9111111-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultado select 'ficha apagada: o produto volta a pendente', '1', count(id)::text from produtos_pdv where receita_id is null and not sem_ficha;

do $$ begin
  -- sem_ficha e ficha ao mesmo tempo (direto na tabela)
  begin update produtos_pdv set sem_ficha = true where chave = '1|PIZZA MARGUERITA G';
    insert into resultado values ('dono: sem ficha E ficha ao mesmo tempo','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('dono: sem ficha E ficha ao mesmo tempo','bloqueado','bloqueado'); end;
  -- preparo não é vendido
  begin update produtos_pdv set receita_id = 'b9a00000-3333-0000-0000-000000000003' where chave = '2|COCA 2L';
    insert into resultado values ('dono: liga a um preparo','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('dono: liga a um preparo','bloqueado','bloqueado'); end;
  -- ficha de outra casa
  begin update produtos_pdv set receita_id = 'b9b00000-3333-0000-0000-000000000001' where chave = '2|COCA 2L';
    insert into resultado values ('dono: liga na ficha de outra casa','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('dono: liga na ficha de outra casa','bloqueado','bloqueado'); end;
  begin perform public.salvar_produtos_pdv('importacao', '[{"chave":"9|X","descricao":"X","receita_id":"b9b00000-3333-0000-0000-000000000001","quantidade":1,"valor":1}]'::jsonb);
    insert into resultado values ('dono: grava em lote com ficha de outra casa','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('dono: grava em lote com ficha de outra casa','bloqueado','bloqueado'); end;
  -- nome de canal inválido
  begin perform public.salvar_produtos_pdv('Canal Com Espaço', '[{"chave":"9|Y","descricao":"Y","quantidade":1,"valor":1}]'::jsonb);
    insert into resultado values ('dono: canal inválido','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('dono: canal inválido','bloqueado','bloqueado'); end;
  -- não troca de restaurante nem de chave pela API
  begin update produtos_pdv set cliente_id = 'b9b00000-0000-0000-0000-000000000001' where chave = '2|COCA 2L';
    insert into resultado values ('dono: muda o restaurante da linha','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('dono: muda o restaurante da linha','bloqueado','bloqueado'); end;
  begin update produtos_pdv set criado_por = 'b9111111-0000-0000-0000-000000000002' where chave = '2|COCA 2L';
    insert into resultado values ('dono: troca a autoria','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('dono: troca a autoria','bloqueado','bloqueado'); end;
end $$;
insert into resultado select 'dono: o lote recusado não gravou nada', '3', count(id)::text from produtos_pdv;

-- GESTOR também decide (resolve o pendente direto na tabela)
select set_config('request.jwt.claims', '{"sub":"b9111111-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into resultado select 'gestor: vê', '3', count(id)::text from produtos_pdv;
update produtos_pdv set sem_ficha = true where receita_id is null and not sem_ficha;
insert into resultado select 'gestor: resolve a pendência', '0', count(id)::text from produtos_pdv where receita_id is null and not sem_ficha;

-- ESTOQUISTA e COZINHA: nada
select set_config('request.jwt.claims', '{"sub":"b9111111-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into resultado select 'estoquista: não vê', '0', count(id)::text from produtos_pdv;
do $$ begin
  begin perform public.salvar_produtos_pdv('importacao', '[{"chave":"8|Z","descricao":"Z","quantidade":1,"valor":1}]'::jsonb);
    insert into resultado values ('estoquista: grava','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('estoquista: grava','bloqueado','bloqueado'); end;
end $$;
delete from produtos_pdv;
select set_config('request.jwt.claims', '{"sub":"b9111111-0000-0000-0000-000000000004","role":"authenticated"}', true);
insert into resultado select 'cozinha: não vê', '0', count(id)::text from produtos_pdv;
do $$ begin
  begin perform public.salvar_produtos_pdv('importacao', '[{"chave":"8|Z","descricao":"Z","quantidade":1,"valor":1}]'::jsonb);
    insert into resultado values ('cozinha: grava','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('cozinha: grava','bloqueado','bloqueado'); end;
end $$;

-- OUTRA CASA: não vê, não apaga, grava só nas próprias
select set_config('request.jwt.claims', '{"sub":"b9222222-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultado select 'outra casa: não vê', '0', count(id)::text from produtos_pdv;
delete from produtos_pdv;
insert into resultado select 'outra casa: grava a dela (mesma chave, sem choque)', '1', public.salvar_produtos_pdv('importacao', '[{"chave":"3|ESCONDIDINHO","descricao":"ESCONDIDINHO","quantidade":1,"valor":10}]'::jsonb)::text;
insert into resultado select 'outra casa: vê só a dela', '1', count(id)::text from produtos_pdv;

-- Voltando ao dono: a linha da outra casa não aparece e a dele sobreviveu ao delete dos outros
select set_config('request.jwt.claims', '{"sub":"b9111111-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultado select 'dono: as 3 dele continuam (ninguém apagou)', '3', count(id)::text from produtos_pdv;
reset role;

-- VISITANTE
set local role anon;
do $$ begin
  begin perform count(id) from produtos_pdv;
    insert into resultado values ('visitante: lê','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('visitante: lê','bloqueado','bloqueado'); end;
  begin perform public.salvar_produtos_pdv('importacao', '[]'::jsonb);
    insert into resultado values ('visitante: chama a função','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('visitante: chama a função','bloqueado','bloqueado'); end;
end $$;
reset role;

select teste, esperado, obtido, case when esperado = obtido then 'OK' else 'FALHOU' end as status from resultado;
rollback;
