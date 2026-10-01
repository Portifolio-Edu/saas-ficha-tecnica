-- Teste do link só de consulta (2026-09-26): quem cria, quem vê, o que o
-- link devolve e quando para de abrir. Roda numa transação e desfaz no fim.
begin;
create temp table resultado (teste text, esperado text, obtido text) on commit drop;
grant all on resultado to authenticated, anon, service_role;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, 'x', now(), now(), now(), '{}', '{}'
from (values
  ('a7111111-0000-0000-0000-000000000001', 'link-dono@exemplo.invalid'),
  ('a7111111-0000-0000-0000-000000000002', 'link-cozinha@exemplo.invalid'),
  ('a7111111-0000-0000-0000-000000000003', 'link-estoque@exemplo.invalid'),
  ('a7111111-0000-0000-0000-000000000004', 'link-gestor@exemplo.invalid'),
  ('a7222222-0000-0000-0000-000000000001', 'link-outro@exemplo.invalid')
) as u(id, email);
insert into clientes (id, user_id, nome, nome_restaurante, telefone) values
 ('a7a00000-0000-0000-0000-000000000001','a7111111-0000-0000-0000-000000000001','Dona L','Restaurante L','5500000000071'),
 ('a7b00000-0000-0000-0000-000000000001','a7222222-0000-0000-0000-000000000001','Outro','Restaurante M','5500000000072');
insert into membros (cliente_id, user_id, papel, nome, ativo) values
 ('a7a00000-0000-0000-0000-000000000001','a7111111-0000-0000-0000-000000000002','cozinha','Tablet L', true),
 ('a7a00000-0000-0000-0000-000000000001','a7111111-0000-0000-0000-000000000003','estoquista','Estoque L', true),
 ('a7a00000-0000-0000-0000-000000000001','a7111111-0000-0000-0000-000000000004','gestor','Gestor L', true);
insert into funcionarios (id, cliente_id, nome, setor, cargo, admitido_em) values
 ('a7a00000-2222-0000-0000-000000000001','a7a00000-0000-0000-0000-000000000001','Juliana','cozinha','Cozinheira','2026-01-10'),
 ('a7a00000-2222-0000-0000-000000000002','a7a00000-0000-0000-0000-000000000001','Pedro','cozinha','Auxiliar','2026-01-10'),
 ('a7b00000-2222-0000-0000-000000000001','a7b00000-0000-0000-0000-000000000001','Vizinho','cozinha','Chef','2026-01-10');
insert into escalas_config (cliente_id, funcionario_id, tipo, ancora, folgas_preferidas, turno_inicio, turno_fim) values
 ('a7a00000-0000-0000-0000-000000000001','a7a00000-2222-0000-0000-000000000001','6x1','2026-09-22','{2}','10:00','18:20');
insert into insumos (id, cliente_id, nome, unidade_medida, tamanho_embalagem, preco_embalagem) values
 ('a7a00000-1111-0000-0000-000000000001','a7a00000-0000-0000-0000-000000000001','Tomate','kg',1,8);
insert into estoque (insumo_id, saldo_atual) values ('a7a00000-1111-0000-0000-000000000001',10);
insert into receitas (id, cliente_id, nome_prato, preco_venda, rendimento) values
 ('a7a00000-3333-0000-0000-000000000001','a7a00000-0000-0000-0000-000000000001','Molho de tomate',30,1),
 ('a7b00000-3333-0000-0000-000000000001','a7b00000-0000-0000-0000-000000000001','Prato do vizinho',40,1);
insert into receita_insumos (receita_id, insumo_id, peso_liquido, unidade) values
 ('a7a00000-3333-0000-0000-000000000001','a7a00000-1111-0000-0000-000000000001',0.5,'kg');
insert into checklists (id, cliente_id, nome, momento) values ('a7a00000-4444-0000-0000-000000000001','a7a00000-0000-0000-0000-000000000001','Abertura','abertura');
insert into checklist_itens (id, checklist_id, texto, ordem) values
 ('a7a00000-5555-0000-0000-000000000001','a7a00000-4444-0000-0000-000000000001','Ligar coifa',1),
 ('a7a00000-5555-0000-0000-000000000002','a7a00000-4444-0000-0000-000000000001','Conferir gás',2);
insert into checklist_execucoes (checklist_item_id, responsavel) values ('a7a00000-5555-0000-0000-000000000001','Ana');

create temp table codigos (nome text primary key, codigo text, hash text) on commit drop;
grant all on codigos to authenticated, anon, service_role;
insert into codigos select n, c, encode(sha256(convert_to(c, 'UTF8')), 'hex') from (values
  ('juliana', 'codigo-da-juliana-0123456789abcdef0123456789'),
  ('pedro',   'codigo-do-pedro-0123456789abcdef0123456789ab'),
  ('outra',   'codigo-outra-casa-0123456789abcdef0123456789')) v(n, c);

set local role authenticated;

-- DONO
select set_config('request.jwt.claims', '{"sub":"a7111111-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into links_consulta (cliente_id, funcionario_id, token_hash)
select 'a7a00000-0000-0000-0000-000000000001','a7a00000-2222-0000-0000-000000000001', hash from codigos where nome = 'juliana';
insert into resultado select 'dono: cria link e vê', '1', count(id)::text from links_consulta;
insert into resultado select 'dono: autoria carimbada', 'a7111111-0000-0000-0000-000000000001', (select criado_por::text from links_consulta limit 1);
do $$ begin
  begin perform token_hash from links_consulta;
    insert into resultado values ('dono: não lê o hash do código','bloqueado','LEU (falha)');
  exception when insufficient_privilege then insert into resultado values ('dono: não lê o hash do código','bloqueado','bloqueado'); end;
  begin insert into links_consulta (cliente_id, funcionario_id, token_hash)
      values ('a7a00000-0000-0000-0000-000000000001','a7a00000-2222-0000-0000-000000000001', repeat('b', 64));
    insert into resultado values ('dono: dois links ativos pra mesma pessoa','bloqueado','PASSOU (falha)');
  exception when unique_violation then insert into resultado values ('dono: dois links ativos pra mesma pessoa','bloqueado','bloqueado'); end;
  begin insert into links_consulta (cliente_id, funcionario_id, token_hash)
      values ('a7a00000-0000-0000-0000-000000000001','a7b00000-2222-0000-0000-000000000001', repeat('c', 64));
    insert into resultado values ('dono: link pra pessoa de outra casa','bloqueado','PASSOU (falha)');
  exception when foreign_key_violation or insufficient_privilege then insert into resultado values ('dono: link pra pessoa de outra casa','bloqueado','bloqueado'); end;
  begin insert into links_consulta (cliente_id, funcionario_id, token_hash)
      values ('a7b00000-0000-0000-0000-000000000001','a7b00000-2222-0000-0000-000000000001', repeat('d', 64));
    insert into resultado values ('dono: link em nome de outra casa','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('dono: link em nome de outra casa','bloqueado','bloqueado'); end;
  begin perform consulta_por_link('codigo-da-juliana-0123456789abcdef0123456789', current_date, current_date + 6);
    insert into resultado values ('dono: abre o link direto no banco','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('dono: abre o link direto no banco','bloqueado','bloqueado'); end;
end $$;

-- GESTOR cria o do Pedro
select set_config('request.jwt.claims', '{"sub":"a7111111-0000-0000-0000-000000000004","role":"authenticated"}', true);
insert into links_consulta (cliente_id, funcionario_id, token_hash)
select 'a7a00000-0000-0000-0000-000000000001','a7a00000-2222-0000-0000-000000000002', hash from codigos where nome = 'pedro';
insert into resultado select 'gestor: cria link e vê os da casa', '2', count(id)::text from links_consulta;

-- ESTOQUISTA e TABLET não veem nem criam
select set_config('request.jwt.claims', '{"sub":"a7111111-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into resultado select 'estoquista: não vê links', '0', count(id)::text from links_consulta;
do $$ begin
  begin insert into links_consulta (cliente_id, funcionario_id, token_hash)
      values ('a7a00000-0000-0000-0000-000000000001','a7a00000-2222-0000-0000-000000000002', repeat('e', 64));
    insert into resultado values ('estoquista: cria link','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('estoquista: cria link','bloqueado','bloqueado'); end;
end $$;
select set_config('request.jwt.claims', '{"sub":"a7111111-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into resultado select 'tablet: não vê links', '0', count(id)::text from links_consulta;
insert into resultado select 'tablet: dados_cozinha segue igual', 'Molho de tomate', (select string_agg(r->>'nome_prato', ',') from jsonb_array_elements(dados_cozinha()->'receitas') r);
insert into resultado select 'tablet: escala_publica segue igual', 'Juliana', (select string_agg(f->>'nome', ',') from jsonb_array_elements(escala_publica(current_date, current_date + 6)->'funcionarios') f);

-- OUTRA CASA
select set_config('request.jwt.claims', '{"sub":"a7222222-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultado select 'outra casa: não vê links', '0', count(id)::text from links_consulta;
reset role;

-- VISITANTE
set local role anon;
do $$ begin
  begin perform consulta_por_link('codigo-da-juliana-0123456789abcdef0123456789', current_date, current_date + 6);
    insert into resultado values ('visitante: abre o link direto no banco','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('visitante: abre o link direto no banco','bloqueado','bloqueado'); end;
  begin perform count(id) from links_consulta;
    insert into resultado values ('visitante: lê links','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('visitante: lê links','bloqueado','bloqueado'); end;
end $$;
reset role;

-- SERVIDOR (service role) abre o link
set local role service_role;
create temp table aberto on commit drop as
  select consulta_por_link('codigo-da-juliana-0123456789abcdef0123456789', current_date, current_date + 6) as j;
insert into resultado select 'link: pessoa e restaurante', 'Juliana · Restaurante L', (select (j->'pessoa'->>'nome') || ' · ' || (j->>'restaurante') from aberto);
insert into resultado select 'link: só as fichas da casa', 'Molho de tomate', (select string_agg(r->>'nome_prato', ',') from aberto, jsonb_array_elements(j->'cozinha'->'receitas') r);
insert into resultado select 'link: checklist do dia com o que já foi feito', 'Ligar coifa=true; Conferir gás=false',
  (select string_agg((i->>'texto') || '=' || (i->>'concluido_hoje'), '; ' order by (i->>'ordem')::int) from aberto, jsonb_array_elements(j->'checklists') c, jsonb_array_elements(c->'itens') i);
insert into resultado select 'link: escala da casa pro cálculo', 'Juliana 10:00:00', (select string_agg((f->>'nome') || ' ' || (f->>'turno_inicio'), ',') from aberto, jsonb_array_elements(j->'escala'->'funcionarios') f);
insert into resultado select 'link: nenhum preço, custo, saldo ou contato', 'nada',
  (select case when j::text ~* '(preco|custo|saldo|telefone|email|valor)' then 'VAZOU' else 'nada' end from aberto);
insert into resultado select 'link: código errado', 'nulo', coalesce(consulta_por_link('codigo-errado-0123456789abcdef0123456789abcd', current_date, current_date + 6)::text, 'nulo');
insert into resultado select 'link: código curto', 'nulo', coalesce(consulta_por_link('curto', current_date, current_date + 6)::text, 'nulo');
insert into resultado select 'link: marca o último acesso', 'sim', (select case when ultimo_acesso_em is not null then 'sim' else 'não' end from links_consulta where funcionario_id = 'a7a00000-2222-0000-0000-000000000001');
reset role;

-- DONO desliga o da Juliana; Pedro fica inativo
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a7111111-0000-0000-0000-000000000001","role":"authenticated"}', true);
update links_consulta set revogado_em = '2000-01-01' where funcionario_id = 'a7a00000-2222-0000-0000-000000000001';
insert into resultado select 'desligar: hora é a do banco', 'agora', (select case when revogado_em > now() - interval '1 minute' then 'agora' else revogado_em::text end from links_consulta where funcionario_id = 'a7a00000-2222-0000-0000-000000000001');
do $$ begin
  begin update links_consulta set revogado_em = null where funcionario_id = 'a7a00000-2222-0000-0000-000000000001';
    insert into resultado values ('desligar: religa o link','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('desligar: religa o link','bloqueado','bloqueado'); end;
  begin update links_consulta set ultimo_acesso_em = null;
    insert into resultado values ('dono: mexe no último acesso','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('dono: mexe no último acesso','bloqueado','bloqueado'); end;
end $$;
update funcionarios set ativo = false where id = 'a7a00000-2222-0000-0000-000000000002';
reset role;

set local role service_role;
insert into resultado select 'desligado: link não abre mais', 'nulo', coalesce(consulta_por_link('codigo-da-juliana-0123456789abcdef0123456789', current_date, current_date + 6)::text, 'nulo');
insert into resultado select 'pessoa inativa: link não abre', 'nulo', coalesce(consulta_por_link('codigo-do-pedro-0123456789abcdef0123456789ab', current_date, current_date + 6)::text, 'nulo');
reset role;

-- Link novo depois de desligar: pode.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a7111111-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into links_consulta (cliente_id, funcionario_id, token_hash) values ('a7a00000-0000-0000-0000-000000000001','a7a00000-2222-0000-0000-000000000001', repeat('f', 64));
insert into resultado select 'link novo depois de desligar', '1 ativo', (select count(id)::text || ' ativo' from links_consulta where funcionario_id = 'a7a00000-2222-0000-0000-000000000001' and revogado_em is null);
reset role;

select teste, esperado, obtido, case when esperado = obtido then 'OK' else 'FALHOU' end as status from resultado;
rollback;
