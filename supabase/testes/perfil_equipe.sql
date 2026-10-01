-- Teste do prontuário de competências e do banco de extras (2026-09-27).
-- Roda numa transação e desfaz no fim. Toda linha precisa sair OK.
begin;
create temp table resultado (teste text, esperado text, obtido text) on commit drop;
create temp table ids (id uuid) on commit drop;
grant all on resultado, ids to authenticated, anon;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, 'x', now(), now(), now(), '{}', '{}'
from (values
  ('88888888-8888-8888-8888-888888888881', 'pf-dono@exemplo.invalid'),
  ('88888888-8888-8888-8888-888888888882', 'pf-gestor@exemplo.invalid'),
  ('88888888-8888-8888-8888-888888888883', 'pf-estoq@exemplo.invalid'),
  ('88888888-8888-8888-8888-888888888884', 'pf-cozinha@exemplo.invalid'),
  ('99999999-9999-9999-9999-999999999999', 'pf-outro@exemplo.invalid')
) as u(id, email);
insert into clientes (id, user_id, nome, nome_restaurante, telefone) values
 ('e0000000-0000-0000-0000-000000000001','88888888-8888-8888-8888-888888888881','Dona H','Restaurante H','5500000000081'),
 ('e0000000-0000-0000-0000-000000000002','99999999-9999-9999-9999-999999999999','Dono I','Restaurante I','5500000000082');
insert into membros (cliente_id, user_id, papel, nome, ativo) values
 ('e0000000-0000-0000-0000-000000000001','88888888-8888-8888-8888-888888888882','gestor','Gestora Helena', true),
 ('e0000000-0000-0000-0000-000000000001','88888888-8888-8888-8888-888888888883','estoquista','Estoquista H', true),
 ('e0000000-0000-0000-0000-000000000001','88888888-8888-8888-8888-888888888884','cozinha','Tablet H', true);
insert into funcionarios (id, cliente_id, nome, setor, cargo, admitido_em) values
 ('e1000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001','Marta','cozinha','Cozinheiro','2025-03-01'),
 ('e1000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000002','Outro','cozinha','Cozinheiro','2025-03-01');

insert into resultado select 'funcionarios não tem mais nível nem habilidades', '0',
  (select count(*)::text from information_schema.columns where table_schema = 'public' and table_name = 'funcionarios' and column_name in ('nivel', 'habilidades'));

set local role authenticated;

-- GESTOR
select set_config('request.jwt.claims', '{"sub":"88888888-8888-8888-8888-888888888882","role":"authenticated"}', true);
insert into perfil_funcionario (funcionario_id, cliente_id, nivel, pracas, pontos_fortes, limitacoes, observacoes) values
 ('e1000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001','pleno','{Grelha,Chapa}','{"Agilidade sob pressão"}','{"Precisa de supervisão no pico"}','Evoluindo bem.');
insert into resultado select 'gestor: grava o perfil', 'pleno {Grelha,Chapa}', nivel || ' ' || pracas::text from perfil_funcionario;
insert into resultado select 'gestor: banco carimba quem alterou', '88888888-8888-8888-8888-888888888882', atualizado_por::text from perfil_funcionario;
insert into perfil_notas (cliente_id, funcionario_id, data, tipo, texto) values
 ('e0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001','2026-09-20','elogio','Segurou a grelha sozinha no sábado.');
insert into resultado select 'gestor: nota sai com o nome de quem escreveu', 'Gestora Helena', autor from perfil_notas;
insert into banco_extras (cliente_id, nome, telefone, setor, cargos, nivel, pracas, aceita_whatsapp, consentimento_em) values
 ('e0000000-0000-0000-0000-000000000001','Lia','5511987654321','cozinha','{Cozinheiro}','senior','{Grelha}', true, now());
insert into resultado select 'gestor: cadastra extra', '1', count(*)::text from banco_extras;

do $$ begin
  begin update perfil_funcionario set nivel = 'chefe';
    insert into resultado values ('trava: nível fora da lista','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('trava: nível fora da lista','bloqueado','bloqueado'); end;
  begin update perfil_funcionario set pracas = array[repeat('x', 41)];
    insert into resultado values ('trava: praça com mais de 40 letras','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('trava: praça com mais de 40 letras','bloqueado','bloqueado'); end;
  begin update perfil_funcionario set pontos_fortes = array(select 'p' || g from generate_series(1, 21) g);
    insert into resultado values ('trava: mais de 20 pontos fortes','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('trava: mais de 20 pontos fortes','bloqueado','bloqueado'); end;
  begin update perfil_funcionario set limitacoes = '{"  "}';
    insert into resultado values ('trava: limitação vazia','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('trava: limitação vazia','bloqueado','bloqueado'); end;
  begin insert into perfil_notas (cliente_id, funcionario_id, tipo, texto) values ('e0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001','elogio','  ');
    insert into resultado values ('trava: nota vazia','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('trava: nota vazia','bloqueado','bloqueado'); end;
  begin insert into perfil_funcionario (funcionario_id, cliente_id, nivel) values ('e1000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000001','pleno');
    insert into resultado values ('trava: perfil de funcionário de outro restaurante','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('trava: perfil de funcionário de outro restaurante','bloqueado','bloqueado'); end;
  begin insert into banco_extras (cliente_id, nome, telefone, setor, cargos) values ('e0000000-0000-0000-0000-000000000001','Zé','1199','cozinha','{Cozinheiro}');
    insert into resultado values ('trava: extra com telefone inválido','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('trava: extra com telefone inválido','bloqueado','bloqueado'); end;
  begin insert into banco_extras (cliente_id, nome, telefone, setor, cargos) values ('e0000000-0000-0000-0000-000000000001','Zé','5511987654321','cozinha','{}');
    insert into resultado values ('trava: extra sem cargo','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('trava: extra sem cargo','bloqueado','bloqueado'); end;
  begin insert into banco_extras (cliente_id, nome, telefone, setor, cargos, aceita_whatsapp) values ('e0000000-0000-0000-0000-000000000001','Zé','5511987654321','cozinha','{Cozinheiro}', true);
    insert into resultado values ('trava: WhatsApp sem consentimento registrado','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('trava: WhatsApp sem consentimento registrado','bloqueado','bloqueado'); end;
end $$;

-- ESTOQUISTA não vê nem grava
select set_config('request.jwt.claims', '{"sub":"88888888-8888-8888-8888-888888888883","role":"authenticated"}', true);
insert into resultado select 'estoquista: não vê perfil', '0', count(*)::text from perfil_funcionario;
insert into resultado select 'estoquista: não vê notas', '0', count(*)::text from perfil_notas;
insert into resultado select 'estoquista: não vê extras', '0', count(*)::text from banco_extras;
do $$ begin
  begin insert into perfil_notas (cliente_id, funcionario_id, tipo, texto) values ('e0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001','atencao','x');
    insert into resultado values ('estoquista: não escreve nota','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('estoquista: não escreve nota','bloqueado','bloqueado'); end;
end $$;

-- COZINHA vê o nome da pessoa (tablet), nunca o perfil
select set_config('request.jwt.claims', '{"sub":"88888888-8888-8888-8888-888888888884","role":"authenticated"}', true);
insert into resultado select 'cozinha: continua vendo o nome da equipe', '1', count(*)::text from funcionarios;
insert into resultado select 'cozinha: não vê perfil', '0', count(*)::text from perfil_funcionario;
insert into resultado select 'cozinha: não vê notas', '0', count(*)::text from perfil_notas;
insert into resultado select 'cozinha: não vê extras', '0', count(*)::text from banco_extras;
do $$ begin
  begin update perfil_funcionario set nivel = 'especialista';
    if found then insert into resultado values ('cozinha: não altera perfil','bloqueado','PASSOU (falha)');
    else insert into resultado values ('cozinha: não altera perfil','bloqueado','bloqueado'); end if;
  exception when others then insert into resultado values ('cozinha: não altera perfil','bloqueado','bloqueado'); end;
end $$;

-- OUTRO RESTAURANTE
select set_config('request.jwt.claims', '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}', true);
insert into resultado select 'outro restaurante: não vê perfil', '0', count(*)::text from perfil_funcionario;
insert into resultado select 'outro restaurante: não vê notas', '0', count(*)::text from perfil_notas;
insert into resultado select 'outro restaurante: não vê extras', '0', count(*)::text from banco_extras;

-- DONO: salvar pessoa com a assinatura nova; apagar a pessoa leva o perfil junto
select set_config('request.jwt.claims', '{"sub":"88888888-8888-8888-8888-888888888881","role":"authenticated"}', true);
insert into ids select salvar_pessoa_escala(null, 'Bruno', 'salao', 'Garçom', '2026-01-05', null, '6x1', '2026-01-05', '{2}', null, '11:00', '19:20');
insert into resultado select 'dono: salva pessoa + escala (assinatura nova)', 'Bruno 6x1',
  (select f.nome || ' ' || c.tipo from funcionarios f join escalas_config c on c.funcionario_id = f.id where f.id = (select id from ids));
delete from funcionarios where id = 'e1000000-0000-0000-0000-000000000001';
insert into resultado select 'apagar pessoa apaga perfil e notas', '0 0',
  (select count(*) from perfil_funcionario)::text || ' ' || (select count(*) from perfil_notas)::text;

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  begin perform count(*) from (select 1 from perfil_funcionario) x;
    insert into resultado values ('visitante: não vê perfil','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('visitante: não vê perfil','bloqueado','bloqueado'); end;
end $$;
do $$ begin
  begin perform count(*) from (select 1 from perfil_notas) x;
    insert into resultado values ('visitante: não vê notas','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('visitante: não vê notas','bloqueado','bloqueado'); end;
end $$;
do $$ begin
  begin perform count(*) from (select 1 from banco_extras) x;
    insert into resultado values ('visitante: não vê extras','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('visitante: não vê extras','bloqueado','bloqueado'); end;
end $$;
reset role;

select teste, esperado, obtido, case when esperado = obtido then 'OK' else 'FALHOU' end as status from resultado;
rollback;
