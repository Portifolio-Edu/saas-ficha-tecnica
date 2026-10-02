-- Teste dos avisos no WhatsApp (2026-10-02): quem configura, quem vê o
-- histórico, ninguém do app grava aviso, aviso não duplica e a fila do n8n
-- não entrega o mesmo aviso duas vezes. Roda numa transação e desfaz.
-- AVISOS PRA GESTÃO (2026-10-02): tipos de gestão; temperatura não é mais aviso.
begin;
create temp table resultado (teste text, esperado text, obtido text) on commit drop;
grant all on resultado to authenticated, anon, service_role;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, 'x', now(), now(), now(), '{}', '{}'
from (values
  ('a1111111-0000-0000-0000-000000000001', 'av-dono@exemplo.invalid'),
  ('a1111111-0000-0000-0000-000000000002', 'av-gestor@exemplo.invalid'),
  ('a1111111-0000-0000-0000-000000000003', 'av-estoque@exemplo.invalid'),
  ('a2222222-0000-0000-0000-000000000001', 'av-outro@exemplo.invalid')
) as u(id, email);
insert into clientes (id, user_id, nome, nome_restaurante, telefone) values
 ('aaa00000-0000-0000-0000-000000000001','a1111111-0000-0000-0000-000000000001','Dona A','Restaurante A','5500000000091'),
 ('aab00000-0000-0000-0000-000000000001','a2222222-0000-0000-0000-000000000001','Outro','Restaurante B','5500000000092');
insert into membros (cliente_id, user_id, papel, nome, ativo) values
 ('aaa00000-0000-0000-0000-000000000001','a1111111-0000-0000-0000-000000000002','gestor','Gestor A', true),
 ('aaa00000-0000-0000-0000-000000000001','a1111111-0000-0000-0000-000000000003','estoquista','Estoque A', true);

-- Avisos já gerados pelo servidor (service role).
insert into avisos (id, cliente_id, tipo, chave, user_id, telefone, texto) values
 ('a0000000-0000-0000-0000-00000000000a','aaa00000-0000-0000-0000-000000000001','estoque_baixo','ab12cd34','a1111111-0000-0000-0000-000000000001','5511999990001','Arroz abaixo do mínimo'),
 ('a0000000-0000-0000-0000-00000000000b','aaa00000-0000-0000-0000-000000000001','resumo_diario','2026-10-02','a1111111-0000-0000-0000-000000000002','5511999990002','Resumo de ontem');
do $$ begin
  begin insert into avisos (cliente_id, tipo, chave, user_id, telefone, texto) values
    ('aaa00000-0000-0000-0000-000000000001','estoque_baixo','ab12cd34','a1111111-0000-0000-0000-000000000001','5511999990001','de novo');
    insert into resultado values ('trava: mesmo aviso duas vezes','bloqueado','PASSOU (falha)');
  exception when unique_violation then insert into resultado values ('trava: mesmo aviso duas vezes','bloqueado','bloqueado'); end;
  begin insert into avisos (cliente_id, tipo, chave, user_id, telefone, texto) values
    ('aaa00000-0000-0000-0000-000000000001','promocao','x','a1111111-0000-0000-0000-000000000001','5511999990001','compre');
    insert into resultado values ('trava: tipo de aviso desconhecido','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('trava: tipo de aviso desconhecido','bloqueado','bloqueado'); end;
  begin insert into avisos (cliente_id, tipo, chave, user_id, telefone, texto) values
    ('aaa00000-0000-0000-0000-000000000001','temperatura','r1','a1111111-0000-0000-0000-000000000001','5511999990001','9 °C');
    insert into resultado values ('trava: temperatura não é aviso da gestão','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('trava: temperatura não é aviso da gestão','bloqueado','bloqueado'); end;
end $$;
insert into avisos (cliente_id, tipo, chave, user_id, telefone, texto, detalhe, status) values
 ('aaa00000-0000-0000-0000-000000000001','desperdicio','p1','a1111111-0000-0000-0000-000000000001','5511999990001','Perda','{"itens":["p1"]}','enviado'),
 ('aaa00000-0000-0000-0000-000000000001','vendas','f1','a1111111-0000-0000-0000-000000000001','5511999990001','Fechamento',null,'enviado');
insert into resultado select 'tipos da gestão entram na caixa de saída', '2',
  (select count(*)::text from avisos where tipo in ('desperdicio','vendas'));

set local role authenticated;

-- Dono configura; gestor muda; estoquista não; outra casa não vê.
select set_config('request.jwt.claims', '{"sub":"a1111111-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into avisos_config (cliente_id, resumo_hora, silencio_inicio, silencio_fim) values ('aaa00000-0000-0000-0000-000000000001', '07:30', '23:00', '06:00');
insert into resultado select 'dono: vê o histórico de avisos', '4', (select count(*)::text from avisos);
do $$ begin
  begin update avisos_config set silencio_inicio = '22:00', silencio_fim = null;
    insert into resultado values ('trava: silêncio pela metade','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('trava: silêncio pela metade','bloqueado','bloqueado'); end;
  begin insert into avisos (cliente_id, tipo, chave, user_id, telefone, texto) values
    ('aaa00000-0000-0000-0000-000000000001','vendas','falso','a1111111-0000-0000-0000-000000000001','5511999990001','aviso falso');
    insert into resultado values ('trava: app não grava aviso','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('trava: app não grava aviso','bloqueado','bloqueado'); end;
  begin perform reservar_avisos(10);
    insert into resultado values ('trava: app não reserva a fila','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('trava: app não reserva a fila','bloqueado','bloqueado'); end;
end $$;

select set_config('request.jwt.claims', '{"sub":"a1111111-0000-0000-0000-000000000002","role":"authenticated"}', true);
update avisos_config set checklist_abertura_ate = '10:30', equipe_hora = '06:30', vendas = false;
do $$ begin
  begin perform detalhe from avisos limit 1;
    insert into resultado values ('trava: app não lê o detalhe interno','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('trava: app não lê o detalhe interno','bloqueado','bloqueado'); end;
end $$;
select set_config('request.jwt.claims', '{"sub":"a1111111-0000-0000-0000-000000000003","role":"authenticated"}', true);
update avisos_config set estoque_baixo = false;
insert into resultado select 'estoquista: lê a config, não vê o histórico', 'true 0',
  (select (count(*) = 1)::text from avisos_config) || ' ' || (select count(*)::text from avisos);
select set_config('request.jwt.claims', '{"sub":"a2222222-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultado select 'outra casa: não vê config nem avisos', '0 0',
  (select count(*)::text from avisos_config) || ' ' || (select count(*)::text from avisos);

reset role;
insert into resultado select 'gestor mudou, estoquista não', '10:30:00 06:30:00 false true',
  (select checklist_abertura_ate::text || ' ' || equipe_hora::text || ' ' || vendas::text || ' ' || estoque_baixo::text from avisos_config where cliente_id = 'aaa00000-0000-0000-0000-000000000001');

-- Fila do n8n.
set local role service_role;
-- Conta só os desta casa: o banco local pode ter avisos de outros testes.
insert into resultado select 'fila: entrega os 2 pendentes', '2', (select count(*)::text from reservar_avisos(200) where cliente_id = 'aaa00000-0000-0000-0000-000000000001');
insert into resultado select 'fila: não entrega de novo o que está enviando', '0', (select count(*)::text from reservar_avisos(200) where cliente_id = 'aaa00000-0000-0000-0000-000000000001');
update avisos set reservado_em = now() - interval '11 minutes' where id = 'a0000000-0000-0000-0000-00000000000a';
insert into resultado select 'fila: travado há 10 min volta (2ª tentativa)', '2', (select tentativas::text from reservar_avisos(200) where id = 'a0000000-0000-0000-0000-00000000000a');
update avisos set reservado_em = now() - interval '11 minutes', tentativas = 3 where id = 'a0000000-0000-0000-0000-00000000000a';
select count(*) from reservar_avisos(10);
insert into resultado select 'fila: 3 tentativas sem resposta vira falhou', 'falhou', (select status from avisos where id = 'a0000000-0000-0000-0000-00000000000a');
reset role;

insert into resultado select 'visitante não chama reservar_avisos', 'false',
  (select has_function_privilege('anon', 'public.reservar_avisos(integer)', 'execute')::text);

select teste, esperado, obtido, case when esperado = obtido then 'OK' else 'FALHOU' end as status from resultado;
rollback;
