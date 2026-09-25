-- Teste de salvar_pessoa_escala (2026-09-26): transições de setor x regime
-- numa transação só, trava sem deixar nada pela metade, cozinha bloqueada.
-- Roda numa transação e desfaz no fim. Toda linha precisa sair OK.
begin;
create temp table resultado (teste text, esperado text, obtido text) on commit drop;
grant all on resultado to authenticated;
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, 'x', now(), now(), now(), '{}', '{}'
from (values ('66666666-6666-6666-6666-666666666661', 'esc-dono@exemplo.invalid'), ('66666666-6666-6666-6666-666666666664', 'esc-cozinha@exemplo.invalid')) as u(id, email);
insert into clientes (id, user_id, nome, nome_restaurante, telefone) values ('f0000000-0000-0000-0000-000000000001','66666666-6666-6666-6666-666666666661','Dona F','Restaurante F','+5500000000061');
insert into membros (cliente_id, user_id, papel, nome, ativo) values ('f0000000-0000-0000-0000-000000000001','66666666-6666-6666-6666-666666666664','cozinha','Tablet F', true);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666661","role":"authenticated"}', true);
create temp table ids (id uuid) on commit drop;
grant all on ids to authenticated;
insert into ids select salvar_pessoa_escala(null, ' Rui ', 'outro', 'Segurança', '2026-02-01', null, '12x36', '2026-10-01', '{}', null, '19:00', '07:00');
insert into resultado select 'salvar: cria pessoa + 12x36 no apoio', 'Rui outro 12x36', f.nome || ' ' || f.setor || ' ' || c.tipo from funcionarios f join escalas_config c on c.funcionario_id = f.id where f.id = (select id from ids);
select salvar_pessoa_escala((select id from ids), 'Rui', 'cozinha', 'Cozinheiro', '2026-02-01', null, '5x2', '2026-10-05', '{1,3}', null, null, null);
insert into resultado select 'salvar: apoio/12x36 → cozinha/5x2 numa vez', 'cozinha 5x2 {1,3}', f.setor || ' ' || c.tipo || ' ' || c.folgas_preferidas::text from funcionarios f join escalas_config c on c.funcionario_id = f.id where f.id = (select id from ids);
select salvar_pessoa_escala((select id from ids), 'Rui', 'outro', 'Segurança', '2026-02-01', null, '24x48', '2026-10-01', '{}', null, null, null);
insert into resultado select 'salvar: cozinha/5x2 → apoio/24x48 numa vez', 'outro 24x48', f.setor || ' ' || c.tipo from funcionarios f join escalas_config c on c.funcionario_id = f.id where f.id = (select id from ids);
do $$ begin
  begin perform salvar_pessoa_escala((select id from ids), 'Rui', 'bar', 'Barman', '2026-02-01', null, '12x36', '2026-10-01', '{}', null, null, null);
    insert into resultado values ('salvar: bar em 12x36','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('salvar: bar em 12x36','bloqueado','bloqueado'); end;
end $$;
insert into resultado select 'salvar: tentativa bloqueada não deixa nada pela metade', 'outro 24x48', f.setor || ' ' || c.tipo from funcionarios f join escalas_config c on c.funcionario_id = f.id where f.id = (select id from ids);
select set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666664","role":"authenticated"}', true);
do $$ begin
  begin perform salvar_pessoa_escala(null, 'X', 'cozinha', 'Cozinheiro', '2026-02-01', null, '5x2', '2026-10-01', '{}', null, null, null);
    insert into resultado values ('salvar: cozinha não salva escala','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('salvar: cozinha não salva escala','bloqueado','bloqueado'); end;
end $$;
reset role;
select teste, esperado, obtido, case when esperado = obtido then 'OK' else 'FALHOU' end as status from resultado;
rollback;
