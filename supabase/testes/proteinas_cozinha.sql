-- Teste da manipulação de proteínas pelo tablet (2026-09-25). Roda numa
-- transação e desfaz no fim. Toda linha precisa sair OK.
begin;
create temp table resultado (teste text, esperado text, obtido text) on commit drop;
grant all on resultado to authenticated, anon;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, 'x', now(), now(), now(), '{}', '{}'
from (values
  ('44444444-4444-4444-4444-444444444441', 'prot-dono@exemplo.invalid'),
  ('44444444-4444-4444-4444-444444444444', 'prot-cozinha@exemplo.invalid'),
  ('55555555-5555-5555-5555-555555555555', 'prot-outro@exemplo.invalid')
) as u(id, email);
insert into clientes (id, user_id, nome, nome_restaurante, telefone) values
 ('dddddddd-0000-0000-0000-000000000001','44444444-4444-4444-4444-444444444441','Dona D','Restaurante D','+5500000000041'),
 ('eeeeeeee-0000-0000-0000-000000000002','55555555-5555-5555-5555-555555555555','Dono E','Restaurante E','+5500000000042');
insert into membros (cliente_id, user_id, papel, nome, ativo) values
 ('dddddddd-0000-0000-0000-000000000001','44444444-4444-4444-4444-444444444444','cozinha','Aparelho', true);
insert into insumos (id, cliente_id, nome, categoria, unidade_medida, tamanho_embalagem, preco_embalagem, fator_correcao) values
 ('dddddddd-1111-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000001','Picanha','proteina','kg',1,89.9,1.15),
 ('dddddddd-1111-0000-0000-000000000002','dddddddd-0000-0000-0000-000000000001','Tomate','hortalica','kg',1,7,1.1),
 ('eeeeeeee-1111-0000-0000-000000000001','eeeeeeee-0000-0000-0000-000000000002','Salmão E','proteina','kg',1,120,1.3);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
insert into resultado select 'cozinha: registra lote e recebe o FC', '1.25',
  round(registrar_processamento_cozinha('dddddddd-1111-0000-0000-000000000001', 'Pedro', 5, 4, 0.3, 'peça com gordura'), 2)::text;
insert into resultado select 'cozinha: vê o lote sem valor', 'Pedro 5 4 0.7', string_agg(responsavel || ' ' || peso_bruto || ' ' || peso_limpo || ' ' || descarte, ',') from lotes_proteina_cozinha(10);
insert into resultado select 'cozinha: continua sem ler a tabela (valor pago)', '0', count(*)::text from processamentos_proteina;
do $$ begin
  begin perform registrar_processamento_cozinha('dddddddd-1111-0000-0000-000000000001', 'Pedro', 5, 4.9, 0.3, null);
    insert into resultado values ('cozinha: limpo + aparas maior que bruto','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('cozinha: limpo + aparas maior que bruto','bloqueado','bloqueado'); end;
  begin perform registrar_processamento_cozinha('dddddddd-1111-0000-0000-000000000002', 'Pedro', 5, 4, 0, null);
    insert into resultado values ('cozinha: insumo que não é proteína','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('cozinha: insumo que não é proteína','bloqueado','bloqueado'); end;
  begin perform registrar_processamento_cozinha('eeeeeeee-1111-0000-0000-000000000001', 'Pedro', 5, 4, 0, null);
    insert into resultado values ('cozinha: proteína de outro restaurante','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('cozinha: proteína de outro restaurante','bloqueado','bloqueado'); end;
  begin perform registrar_processamento_cozinha('dddddddd-1111-0000-0000-000000000001', '  ', 5, 4, 0, null);
    insert into resultado values ('cozinha: sem nome de quem fez','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('cozinha: sem nome de quem fez','bloqueado','bloqueado'); end;
end $$;

-- Dono vê na tela Proteínas (listarProcessamentos), com o valor do cadastro
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444441","role":"authenticated"}', true);
insert into resultado select 'dono: vê o lote com valor do cadastro e autor', '89.90 Pedro true',
  string_agg(round(valor_pago_kg, 2)::text || ' ' || responsavel || ' ' || (criado_por = '44444444-4444-4444-4444-444444444444')::text, ',') from processamentos_proteina;

-- Outro restaurante não vê
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);
insert into resultado select 'outro restaurante: não vê o lote', '0', count(*)::text from lotes_proteina_cozinha(10);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  begin perform lotes_proteina_cozinha(10);
    insert into resultado values ('visitante chama a função','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('visitante chama a função','bloqueado','bloqueado'); end;
end $$;
reset role;

select teste, esperado, obtido, case when esperado = obtido then 'OK' else 'FALHOU' end as status from resultado;
rollback;
