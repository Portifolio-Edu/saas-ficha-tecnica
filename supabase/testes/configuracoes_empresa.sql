-- Teste das Configurações (2026-10-01): dados da empresa, formatos, quem grava,
-- cobrança protegida, balde do logo e "meu nome". Roda numa transação e desfaz.
begin;
create temp table resultado (teste text, esperado text, obtido text) on commit drop;
grant all on resultado to authenticated, anon, service_role;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, 'x', now(), now(), now(), '{}', '{}'
from (values
  ('cf111111-0000-0000-0000-000000000001', 'cfg-dono@exemplo.invalid'),
  ('cf111111-0000-0000-0000-000000000002', 'cfg-gestor@exemplo.invalid'),
  ('cf111111-0000-0000-0000-000000000003', 'cfg-estoque@exemplo.invalid'),
  ('cf222222-0000-0000-0000-000000000001', 'cfg-outro@exemplo.invalid')
) as u(id, email);
insert into clientes (id, user_id, nome, nome_restaurante, telefone) values
 ('cfa00000-0000-0000-0000-000000000001','cf111111-0000-0000-0000-000000000001','Dona C','Restaurante C','5500000000081'),
 ('cfb00000-0000-0000-0000-000000000001','cf222222-0000-0000-0000-000000000001','Outro','Restaurante D','5500000000082');
insert into membros (cliente_id, user_id, papel, nome, ativo) values
 ('cfa00000-0000-0000-0000-000000000001','cf111111-0000-0000-0000-000000000002','gestor','Gestor C', true),
 ('cfa00000-0000-0000-0000-000000000001','cf111111-0000-0000-0000-000000000003','estoquista','Estoque C', true);

set local role authenticated;

-- Dono grava os dados da empresa.
select set_config('request.jwt.claims', '{"sub":"cf111111-0000-0000-0000-000000000001","role":"authenticated"}', true);
update clientes set razao_social = 'Restaurante C Ltda', cnpj = '11222333000181', inscricao_estadual = 'ISENTO',
  email_contato = 'contato@restc.com.br', telefone_contato = '551133334444', cep = '01310100', logradouro = 'Av. Paulista',
  numero = '1000', bairro = 'Bela Vista', cidade = 'São Paulo', uf = 'SP', cor_destaque = '#0f766e',
  logo_path = 'cfa00000-0000-0000-0000-000000000001/logo.png';
insert into resultado select 'dono: grava a empresa', 'Restaurante C Ltda SP #0f766e',
  (select razao_social || ' ' || uf || ' ' || cor_destaque from clientes where id = 'cfa00000-0000-0000-0000-000000000001');

do $$ begin
  begin update clientes set cnpj = '11.222.333/0001-81';
    insert into resultado values ('trava: CNPJ com pontuação','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('trava: CNPJ com pontuação','bloqueado','bloqueado'); end;
  begin update clientes set cep = '01310-100';
    insert into resultado values ('trava: CEP com traço','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('trava: CEP com traço','bloqueado','bloqueado'); end;
  begin update clientes set uf = 'sp';
    insert into resultado values ('trava: UF minúscula','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('trava: UF minúscula','bloqueado','bloqueado'); end;
  begin update clientes set email_contato = 'sem-arroba';
    insert into resultado values ('trava: e-mail inválido','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('trava: e-mail inválido','bloqueado','bloqueado'); end;
  begin update clientes set cor_destaque = 'red';
    insert into resultado values ('trava: cor fora do formato','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('trava: cor fora do formato','bloqueado','bloqueado'); end;
  begin update clientes set logo_path = 'cfb00000-0000-0000-0000-000000000001/logo.png';
    insert into resultado values ('trava: logo na pasta de outra casa','bloqueado','PASSOU (falha)');
  exception when check_violation then insert into resultado values ('trava: logo na pasta de outra casa','bloqueado','bloqueado'); end;
  begin update clientes set plano = 'pro', status_assinatura = 'ativa';
    insert into resultado values ('trava: cobrança fora do alcance','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('trava: cobrança fora do alcance','bloqueado','bloqueado'); end;
end $$;

-- Gestor também edita a empresa; estoquista e outra casa não.
select set_config('request.jwt.claims', '{"sub":"cf111111-0000-0000-0000-000000000002","role":"authenticated"}', true);
update clientes set numero = '1001';
select set_config('request.jwt.claims', '{"sub":"cf111111-0000-0000-0000-000000000003","role":"authenticated"}', true);
update clientes set numero = '9999';
insert into resultado select 'estoquista: lê a empresa', 'Restaurante C Ltda', (select razao_social from clientes);
select set_config('request.jwt.claims', '{"sub":"cf222222-0000-0000-0000-000000000001","role":"authenticated"}', true);
update clientes set numero = '7777' where id = 'cfa00000-0000-0000-0000-000000000001';
insert into resultado select 'outra casa: não enxerga a empresa', '0', (select count(*)::text from clientes where id = 'cfa00000-0000-0000-0000-000000000001');

-- Meu nome: cada um o seu; o do dono vale também no cadastro.
select set_config('request.jwt.claims', '{"sub":"cf111111-0000-0000-0000-000000000003","role":"authenticated"}', true);
select atualizar_meu_perfil('  Estoque Novo  ');
select set_config('request.jwt.claims', '{"sub":"cf111111-0000-0000-0000-000000000001","role":"authenticated"}', true);
select atualizar_meu_perfil('Dona Carla');
do $$ begin
  begin perform atualizar_meu_perfil('x');
    insert into resultado values ('trava: nome curto demais','bloqueado','PASSOU (falha)');
  exception when invalid_parameter_value then insert into resultado values ('trava: nome curto demais','bloqueado','bloqueado'); end;
end $$;

reset role;
insert into resultado select 'gestor gravou, estoquista e outra casa não', '1001', (select numero from clientes where id = 'cfa00000-0000-0000-0000-000000000001');
insert into resultado select 'atualizado_em carimbado', 'true', (select (atualizado_em >= now())::text from clientes where id = 'cfa00000-0000-0000-0000-000000000001');
insert into resultado select 'estoquista trocou só o próprio nome', 'Gestor C|Estoque Novo',
  (select string_agg(nome, '|' order by papel desc) from membros where cliente_id = 'cfa00000-0000-0000-0000-000000000001' and papel in ('estoquista', 'gestor'));
insert into resultado select 'dono: nome no membro e no cadastro', 'Dona Carla Dona Carla',
  (select m.nome || ' ' || c.nome from membros m join clientes c on c.id = m.cliente_id where m.user_id = 'cf111111-0000-0000-0000-000000000001');

-- Balde do logo: só imagem, até 2 MB, público pra leitura.
insert into resultado select 'balde marcas: público, 2 MB, sem SVG', 'true 2097152 false',
  (select public::text || ' ' || file_size_limit || ' ' || ('image/svg+xml' = any(allowed_mime_types))::text from storage.buckets where id = 'marcas');
insert into resultado select 'visitante não chama atualizar_meu_perfil', 'false',
  (select has_function_privilege('anon', 'public.atualizar_meu_perfil(text)', 'execute')::text);

select teste, esperado, obtido, case when esperado = obtido then 'OK' else 'FALHOU' end as status from resultado;
rollback;
