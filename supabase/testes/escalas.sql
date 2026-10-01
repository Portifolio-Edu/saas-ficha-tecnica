-- Teste do módulo de escalas (2026-09-26). Roda numa transação e desfaz no
-- fim. Toda linha precisa sair OK.
begin;
create temp table resultado (teste text, esperado text, obtido text) on commit drop;
grant all on resultado to authenticated, anon;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, 'x', now(), now(), now(), '{}', '{}'
from (values
  ('66666666-6666-6666-6666-666666666661', 'esc-dono@exemplo.invalid'),
  ('66666666-6666-6666-6666-666666666662', 'esc-gestor@exemplo.invalid'),
  ('66666666-6666-6666-6666-666666666663', 'esc-estoq@exemplo.invalid'),
  ('66666666-6666-6666-6666-666666666664', 'esc-cozinha@exemplo.invalid'),
  ('77777777-7777-7777-7777-777777777777', 'esc-outro@exemplo.invalid')
) as u(id, email);
insert into clientes (id, user_id, nome, nome_restaurante, telefone) values
 ('f0000000-0000-0000-0000-000000000001','66666666-6666-6666-6666-666666666661','Dona F','Restaurante F','5500000000061'),
 ('f0000000-0000-0000-0000-000000000002','77777777-7777-7777-7777-777777777777','Dono G','Restaurante G','5500000000062');
insert into membros (cliente_id, user_id, papel, nome, ativo) values
 ('f0000000-0000-0000-0000-000000000001','66666666-6666-6666-6666-666666666662','gestor','Gestor F', true),
 ('f0000000-0000-0000-0000-000000000001','66666666-6666-6666-6666-666666666663','estoquista','Estoquista F', true),
 ('f0000000-0000-0000-0000-000000000001','66666666-6666-6666-6666-666666666664','cozinha','Tablet F', true);

set local role authenticated;

-- GESTOR cadastra
select set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666662","role":"authenticated"}', true);
insert into funcionarios (id, cliente_id, nome, setor, cargo, admitido_em) values
 ('f1000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000001','Kenji','cozinha','Sushiman','2026-01-10'),
 ('f1000000-0000-0000-0000-000000000002','f0000000-0000-0000-0000-000000000001','Rui','outro','Segurança','2026-02-01');
insert into escalas_config (cliente_id, funcionario_id, tipo, ancora, folgas_preferidas) values
 ('f0000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000001','6x1','2026-09-22','{2}'),
 ('f0000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000002','12x36','2026-10-01','{}');
insert into resultado select 'gestor: cadastra escalas', '2', count(*)::text from escalas_config;
insert into prontuario_ocorrencias (cliente_id, funcionario_id, tipo, inicio, fim, nota) values
 ('f0000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000001','atestado','2026-10-09','2026-10-10','consulta'),
 ('f0000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000001','ferias','2026-11-02','2026-11-15',null),
 ('f0000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000002','afastamento','2026-10-20','2026-10-24','INSS');
insert into prontuario_ocorrencias (cliente_id, funcionario_id, tipo, inicio, fim, restricoes) values
 ('f0000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000002','restricao','2026-10-05','2026-10-18','{sem_escala_longa}'),
 ('f0000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000002','restricao','2026-10-05','2026-10-18','{sem_carga_pesada}');
insert into escalas_regras (cliente_id, intervalo_domingo_semanas, cobertura_minima) values
 ('f0000000-0000-0000-0000-000000000001', 3, '{"cozinha:Sushiman": 1}');

-- Travas
do $$ begin
  begin update escalas_config set tipo = '12x36', folgas_preferidas = '{}' where funcionario_id = 'f1000000-0000-0000-0000-000000000001';
    insert into resultado values ('trava: cozinha em 12x36','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('trava: cozinha em 12x36','bloqueado','bloqueado'); end;
  begin update funcionarios set setor = 'salao' where id = 'f1000000-0000-0000-0000-000000000002';
    insert into resultado values ('trava: 12x36 mudando pra salão','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('trava: 12x36 mudando pra salão','bloqueado','bloqueado'); end;
  begin update escalas_config set folgas_preferidas = '{5}' where funcionario_id = 'f1000000-0000-0000-0000-000000000001';
    insert into resultado values ('trava: folga fixa na sexta','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('trava: folga fixa na sexta','bloqueado','bloqueado'); end;
  begin update escalas_config set folgas_preferidas = '{6}' where funcionario_id = 'f1000000-0000-0000-0000-000000000001';
    insert into resultado values ('trava: folga fixa no sábado','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('trava: folga fixa no sábado','bloqueado','bloqueado'); end;
  begin update escalas_config set folgas_preferidas = '{1,2}' where funcionario_id = 'f1000000-0000-0000-0000-000000000001';
    insert into resultado values ('trava: 6x1 com 2 folgas','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('trava: 6x1 com 2 folgas','bloqueado','bloqueado'); end;
  begin insert into prontuario_ocorrencias (cliente_id, funcionario_id, tipo, inicio, fim) values ('f0000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000001','falta','2026-10-10','2026-10-09');
    insert into resultado values ('trava: ocorrência com fim antes do início','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('trava: ocorrência com fim antes do início','bloqueado','bloqueado'); end;
  begin insert into escalas_config (cliente_id, funcionario_id, tipo, ancora) values ('f0000000-0000-0000-0000-000000000002','f1000000-0000-0000-0000-000000000002','5x2','2026-10-01');
    insert into resultado values ('trava: escala ligando funcionário de outro restaurante','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('trava: escala ligando funcionário de outro restaurante','bloqueado','bloqueado'); end;
end $$;
update escalas_config set tipo = '5x2', folgas_preferidas = '{1,3}' where funcionario_id = 'f1000000-0000-0000-0000-000000000001';
insert into resultado select 'gestor: troca pra 5x2 com seg e qua', '5x2 {1,3}', tipo || ' ' || folgas_preferidas::text from escalas_config where funcionario_id = 'f1000000-0000-0000-0000-000000000001';

-- ESTOQUISTA não vê
select set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666663","role":"authenticated"}', true);
insert into resultado select 'estoquista: não vê escalas', '0', count(*)::text from escalas_config;
insert into resultado select 'estoquista: não vê prontuário', '0', count(*)::text from prontuario_ocorrencias;

-- COZINHA vê só pela função pública, sem motivo
select set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666664","role":"authenticated"}', true);
insert into resultado select 'cozinha: não lê prontuário direto', '0', count(*)::text from prontuario_ocorrencias;
insert into resultado select 'cozinha: não lê escalas_config direto', '0', count(*)::text from escalas_config;
do $$ begin
  begin insert into escalas_config (cliente_id, funcionario_id, tipo, ancora) values ('f0000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000002','5x2','2026-10-01');
    insert into resultado values ('cozinha: não altera escala','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('cozinha: não altera escala','bloqueado','bloqueado'); end;
end $$;
insert into resultado select 'cozinha: vê as 2 pessoas na escala', '2', jsonb_array_length(escala_publica('2026-10-01','2026-10-31')->'funcionarios')::text;
insert into resultado select 'cozinha: atestado aparece só como ausência', 'ausencia',
  (select a->>'tipo' from jsonb_array_elements(escala_publica('2026-10-01','2026-10-31')->'ausencias') a where a->>'inicio' = '2026-10-09');
insert into resultado select 'cozinha: afastamento aparece só como ausência prolongada', 'ausencia_prolongada',
  (select a->>'tipo' from jsonb_array_elements(escala_publica('2026-10-01','2026-10-31')->'ausencias') a where a->>'inicio' = '2026-10-20');
insert into resultado select 'cozinha: nenhum motivo no retorno', 'false',
  (escala_publica('2026-10-01','2026-11-30')::text ~ '(falta|atestado|afastamento|INSS)')::text;
insert into resultado select 'cozinha: não recebe nota nem restrição de peso', 'false',
  (escala_publica('2026-10-01','2026-11-30')::text ~ '(consulta|nota|sem_carga_pesada|nivel|habilidades)')::text;
insert into resultado select 'cozinha: recebe só a restrição que muda a escala', '1',
  (select count(*)::text from jsonb_array_elements(escala_publica('2026-10-01','2026-10-31')->'ausencias') a where a->>'tipo' = 'restricao');
do $$ begin
  begin perform escala_publica('2026-01-01','2026-12-31');
    insert into resultado values ('cozinha: período grande demais','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('cozinha: período grande demais','bloqueado','bloqueado'); end;
end $$;

-- OUTRO RESTAURANTE
select set_config('request.jwt.claims', '{"sub":"77777777-7777-7777-7777-777777777777","role":"authenticated"}', true);
insert into resultado select 'outro restaurante: não vê escala', '0', jsonb_array_length(escala_publica('2026-10-01','2026-10-31')->'funcionarios')::text;
insert into resultado select 'outro restaurante: não vê prontuário', '0', count(*)::text from prontuario_ocorrencias;

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  begin perform escala_publica('2026-10-01','2026-10-31');
    insert into resultado values ('visitante: função pública','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('visitante: função pública','bloqueado','bloqueado'); end;
end $$;
reset role;

select teste, esperado, obtido, case when esperado = obtido then 'OK' else 'FALHOU' end as status from resultado;
rollback;
