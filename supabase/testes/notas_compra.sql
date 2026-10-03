-- Teste da importação de NF-e de compra (2026-10-03): a nota entra inteira ou
-- não entra; a mesma nota não entra duas vezes; estoque e preço do insumo
-- mudam juntos; a ligação item -> insumo fica lembrada; só dono, gestor e
-- estoquista importam; outra casa não vê nem mexe. Roda numa transação e
-- desfaz no fim.
begin;
create temp table resultado (teste text, esperado text, obtido text) on commit drop;
grant all on resultado to authenticated, anon, service_role;
create temp table ret (j jsonb) on commit drop;
grant all on ret to authenticated;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, 'x', now(), now(), now(), '{}', '{}'
from (values
  ('ba111111-0000-0000-0000-000000000001', 'nota-dono@exemplo.invalid'),
  ('ba111111-0000-0000-0000-000000000002', 'nota-estoque@exemplo.invalid'),
  ('ba111111-0000-0000-0000-000000000003', 'nota-cozinha@exemplo.invalid'),
  ('ba222222-0000-0000-0000-000000000001', 'nota-outro@exemplo.invalid')
) as u(id, email);
insert into clientes (id, user_id, nome, nome_restaurante, telefone) values
 ('baa00000-0000-0000-0000-000000000001','ba111111-0000-0000-0000-000000000001','Dono N','Restaurante N','5500000000101'),
 ('bab00000-0000-0000-0000-000000000001','ba222222-0000-0000-0000-000000000001','Outro','Restaurante Outro N','5500000000102');
insert into membros (cliente_id, user_id, papel, nome, ativo) values
 ('baa00000-0000-0000-0000-000000000001','ba111111-0000-0000-0000-000000000002','estoquista','Estoque N', true),
 ('baa00000-0000-0000-0000-000000000001','ba111111-0000-0000-0000-000000000003','cozinha','Tablet N', true);
insert into insumos (id, cliente_id, nome, unidade_medida, tamanho_embalagem, preco_embalagem) values
 ('baa00000-1111-0000-0000-000000000001','baa00000-0000-0000-0000-000000000001','Tomate','kg',1,5),
 ('baa00000-1111-0000-0000-000000000002','baa00000-0000-0000-0000-000000000001','Cebola','kg',1,4),
 ('baa00000-1111-0000-0000-000000000003','baa00000-0000-0000-0000-000000000001','Óleo','l',0.9,9),
 ('bab00000-1111-0000-0000-000000000001','bab00000-0000-0000-0000-000000000001','Tomate do vizinho','kg',1,3);
-- Tomate já é rastreado (saldo 10); a cebola ainda não.
insert into estoque (insumo_id, saldo_atual, estoque_minimo) values ('baa00000-1111-0000-0000-000000000001', 10, 2);

set local role authenticated;

-- ESTOQUISTA importa a nota 1234: tomate (preço sobe), cebola (preço igual, insumo não rastreado), 1 item que não é insumo
select set_config('request.jwt.claims', '{"sub":"ba111111-0000-0000-0000-000000000002","role":"authenticated"}', true);
insert into ret select public.registrar_nota_compra('{
  "chave":"35260912345678000190550010000012341000012345","numero":"1234","serie":"1","fornecedor":"Verde Horta",
  "cnpj":"12.345.678/0001-90","emitida_em":"2026-09-25","valor_total":150.5,"atualizar_precos":true,"incluiu_extras":true,
  "itens":[
    {"ordem":1,"codigo":"10","descricao":"TOMATE ITALIANO KG","quantidade":12.5,"unidade":"KG","valor":86.25,"custos_extras":0,"insumo_id":"baa00000-1111-0000-0000-000000000001","ignorado":false,"quantidade_insumo":12.5,"preco_unitario_novo":6.9,"custo":86.25,"fator":null},
    {"ordem":2,"codigo":"22","descricao":"CEBOLA BRANCA","quantidade":5,"unidade":"KG","valor":20,"custos_extras":0,"insumo_id":"baa00000-1111-0000-0000-000000000002","ignorado":false,"quantidade_insumo":5,"preco_unitario_novo":4,"custo":20,"fator":null},
    {"ordem":3,"codigo":"90","descricao":"DETERGENTE","quantidade":2,"unidade":"UN","valor":6,"custos_extras":0,"insumo_id":null,"ignorado":true}
  ]}'::jsonb);
insert into resultado select 'estoquista: nota entra (entradas)', '2', (select j->>'entradas' from ret);
insert into resultado select 'estoquista: um preço atualizado', '1', (select j->>'precos_atualizados' from ret);
insert into resultado select 'estoquista: um item ignorado', '1', (select j->>'ignorados' from ret);
insert into resultado select 'estoque do tomate somou', '22.5', (select saldo_atual::text from estoque where insumo_id = 'baa00000-1111-0000-0000-000000000001');
insert into resultado select 'insumo não rastreado passou a ser (cebola)', '5', (select saldo_atual::text from estoque where insumo_id = 'baa00000-1111-0000-0000-000000000002');
insert into resultado select 'preço do tomate virou o da nota', '6.9000', (select round(preco_unitario, 4)::text from insumos where id = 'baa00000-1111-0000-0000-000000000001');
insert into resultado select 'preço da cebola não mexeu (igual ao da nota)', '4.0000', (select round(preco_unitario, 4)::text from insumos where id = 'baa00000-1111-0000-0000-000000000002');
insert into resultado select 'histórico de preço: 1 linha (tomate 5 -> 6.9)', '5.0000>6.9000', (select round(preco_anterior, 4)::text || '>' || round(preco_novo, 4)::text from historico_preco_insumo where insumo_id = 'baa00000-1111-0000-0000-000000000001');
insert into resultado select 'movimentação de entrada com a origem da nota', '2', (select count(*)::text from movimentacoes_estoque where tipo = 'entrada' and origem = 'NF-e 1234 - Verde Horta');
insert into resultado select 'movimentação carimbada com quem importou', 'ba111111-0000-0000-0000-000000000002', (select distinct criado_por::text from movimentacoes_estoque where origem = 'NF-e 1234 - Verde Horta');
insert into resultado select 'nota gravada com 2 itens que entraram', '2', (select qtd_itens::text from notas_compra where numero = '1234');
insert into resultado select 'nota: CNPJ guardado só com dígitos', '12345678000190', (select cnpj_fornecedor from notas_compra where numero = '1234');
insert into resultado select 'nota: autoria carimbada pelo banco', 'ba111111-0000-0000-0000-000000000002', (select criado_por::text from notas_compra where numero = '1234');
insert into resultado select 'itens: 3 linhas (2 entraram, 1 ignorado)', '3', (select count(*)::text from notas_compra_itens);
insert into resultado select 'item guarda o preço anterior e o novo', '5.0000>6.9000', (select round(preco_unitario_anterior, 4)::text || '>' || round(preco_unitario_novo, 4)::text from notas_compra_itens where ordem = 1);
insert into resultado select 'item guarda o custo da entrada', '86.25', (select custo::text from notas_compra_itens where ordem = 1);
insert into resultado select 'ligações lembradas (tomate e cebola)', '2', (select count(*)::text from ligacoes_item_nota);

-- Mesma nota de novo: barrada, e nada mexe
do $$ begin
  begin perform public.registrar_nota_compra('{"chave":"35260912345678000190550010000012341000012345","numero":"1234","itens":[{"ordem":1,"codigo":"10","descricao":"TOMATE","quantidade":1,"unidade":"KG","valor":1,"insumo_id":"baa00000-1111-0000-0000-000000000001","quantidade_insumo":1,"preco_unitario_novo":1,"custo":1}]}'::jsonb);
    insert into resultado values ('nota repetida','bloqueado','PASSOU (falha)');
  exception when unique_violation then insert into resultado values ('nota repetida','bloqueado','bloqueado'); end;
end $$;
insert into resultado select 'nota repetida: estoque não mexeu', '22.5', (select saldo_atual::text from estoque where insumo_id = 'baa00000-1111-0000-0000-000000000001');
insert into resultado select 'nota repetida: continua 1 nota', '1', (select count(*)::text from notas_compra);

-- Segunda nota, sem atualizar preços, com conversão por caixa (1 CX = 12 L de óleo? aqui 1 CX = 18 l) e ligação trocada
delete from ret;
insert into ret select public.registrar_nota_compra('{
  "chave":"35260912345678000190550010000012351000012346","numero":"1235","serie":"1","fornecedor":"Verde Horta","cnpj":"12345678000190",
  "emitida_em":"2026-09-26","atualizar_precos":false,"incluiu_extras":false,
  "itens":[
    {"ordem":1,"codigo":"10","descricao":"TOMATE ITALIANO KG","quantidade":3,"unidade":"KG","valor":30,"custos_extras":4,"insumo_id":"baa00000-1111-0000-0000-000000000001","quantidade_insumo":3,"preco_unitario_novo":10,"custo":30},
    {"ordem":2,"codigo":"31","descricao":"OLEO DE SOJA CX","quantidade":2,"unidade":"CX","valor":180,"custos_extras":0,"insumo_id":"baa00000-1111-0000-0000-000000000003","quantidade_insumo":36,"preco_unitario_novo":5,"custo":180,"fator":18}
  ]}'::jsonb);
insert into resultado select 'segunda nota: nenhum preço atualizado (pedido da pessoa)', '0', (select j->>'precos_atualizados' from ret);
insert into resultado select 'segunda nota: preço do tomate ficou', '6.9000', (select round(preco_unitario, 4)::text from insumos where id = 'baa00000-1111-0000-0000-000000000001');
insert into resultado select 'segunda nota: estoque do tomate somou de novo', '25.5', (select saldo_atual::text from estoque where insumo_id = 'baa00000-1111-0000-0000-000000000001');
insert into resultado select 'segunda nota: óleo entrou com a conversão (36 l)', '36', (select saldo_atual::text from estoque where insumo_id = 'baa00000-1111-0000-0000-000000000003');
insert into resultado select 'ligação do óleo lembra o fator', '18', (select fator::text from ligacoes_item_nota where codigo = '31');
insert into resultado select 'ligação do tomate segue 1 só (atualizada, não duplicada)', '1', (select count(*)::text from ligacoes_item_nota where codigo = '10');

-- Só insumo da própria casa; tudo ou nada
do $$ begin
  begin perform public.registrar_nota_compra('{"chave":"35260912345678000190550010000012361000012347","numero":"1236","cnpj":"12345678000190","itens":[
      {"ordem":1,"codigo":"10","descricao":"TOMATE","quantidade":1,"unidade":"KG","valor":1,"insumo_id":"baa00000-1111-0000-0000-000000000001","quantidade_insumo":1,"preco_unitario_novo":1,"custo":1},
      {"ordem":2,"codigo":"11","descricao":"TOMATE VIZINHO","quantidade":1,"unidade":"KG","valor":1,"insumo_id":"bab00000-1111-0000-0000-000000000001","quantidade_insumo":1,"preco_unitario_novo":1,"custo":1}]}'::jsonb);
    insert into resultado values ('insumo de outra casa','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('insumo de outra casa','bloqueado','bloqueado'); end;
  begin perform public.registrar_nota_compra('{"chave":"35260912345678000190550010000012371000012348","itens":[{"ordem":1,"codigo":"10","descricao":"TOMATE","quantidade":1,"unidade":"KG","valor":1,"insumo_id":"baa00000-1111-0000-0000-000000000001","quantidade_insumo":0,"custo":1}]}'::jsonb);
    insert into resultado values ('item sem quantidade','bloqueado','PASSOU (falha)');
  exception when invalid_parameter_value then insert into resultado values ('item sem quantidade','bloqueado','bloqueado'); end;
  begin perform public.registrar_nota_compra('{"chave":"123","itens":[{"ordem":1,"descricao":"X","quantidade":1,"insumo_id":"baa00000-1111-0000-0000-000000000001","quantidade_insumo":1}]}'::jsonb);
    insert into resultado values ('chave inválida','bloqueado','PASSOU (falha)');
  exception when invalid_parameter_value then insert into resultado values ('chave inválida','bloqueado','bloqueado'); end;
  begin perform public.registrar_nota_compra('{"chave":"35260912345678000190550010000012381000012349","itens":[{"ordem":1,"descricao":"DETERGENTE","quantidade":1,"insumo_id":null,"ignorado":true}]}'::jsonb);
    insert into resultado values ('nota sem nenhum item entrando','bloqueado','PASSOU (falha)');
  exception when invalid_parameter_value then insert into resultado values ('nota sem nenhum item entrando','bloqueado','bloqueado'); end;
  begin perform public.registrar_nota_compra('{"chave":"35260912345678000190550010000012391000012340","itens":[]}'::jsonb);
    insert into resultado values ('nota sem itens','bloqueado','PASSOU (falha)');
  exception when invalid_parameter_value then insert into resultado values ('nota sem itens','bloqueado','bloqueado'); end;
end $$;
insert into resultado select 'recusas: continuam 2 notas', '2', (select count(*)::text from notas_compra);
insert into resultado select 'recusa no meio da nota desfaz o primeiro item (tomate)', '25.5', (select saldo_atual::text from estoque where insumo_id = 'baa00000-1111-0000-0000-000000000001');

-- Ninguém grava nas tabelas direto
do $$ begin
  begin insert into notas_compra (cliente_id, chave) values ('baa00000-0000-0000-0000-000000000001', '35260912345678000190550010000012401000012341');
    insert into resultado values ('estoquista: insere nota direto','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('estoquista: insere nota direto','bloqueado','bloqueado'); end;
  begin update notas_compra set fornecedor = 'Outro';
    insert into resultado values ('estoquista: muda nota','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('estoquista: muda nota','bloqueado','bloqueado'); end;
  begin delete from ligacoes_item_nota;
    insert into resultado values ('estoquista: apaga ligação','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('estoquista: apaga ligação','bloqueado','bloqueado'); end;
end $$;

-- DONO vê tudo da casa
select set_config('request.jwt.claims', '{"sub":"ba111111-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultado select 'dono: vê as 2 notas', '2', (select count(*)::text from notas_compra);
insert into resultado select 'dono: vê os itens', '5', (select count(*)::text from notas_compra_itens);
insert into resultado select 'dono: importa também', '1', (select j->>'entradas' from (select public.registrar_nota_compra('{"chave":"35260912345678000190550010000012411000012342","numero":"1241","itens":[{"ordem":1,"codigo":"10","descricao":"TOMATE","quantidade":1,"unidade":"KG","valor":7,"insumo_id":"baa00000-1111-0000-0000-000000000001","quantidade_insumo":1,"preco_unitario_novo":7,"custo":7}]}'::jsonb) as j) x);

-- COZINHA: nada
select set_config('request.jwt.claims', '{"sub":"ba111111-0000-0000-0000-000000000003","role":"authenticated"}', true);
insert into resultado select 'cozinha: não vê notas', '0', (select count(*)::text from notas_compra);
insert into resultado select 'cozinha: não vê itens', '0', (select count(*)::text from notas_compra_itens);
insert into resultado select 'cozinha: não vê ligações', '0', (select count(*)::text from ligacoes_item_nota);
do $$ begin
  begin perform public.registrar_nota_compra('{"chave":"35260912345678000190550010000012421000012343","itens":[{"ordem":1,"descricao":"X","quantidade":1,"insumo_id":"baa00000-1111-0000-0000-000000000001","quantidade_insumo":1}]}'::jsonb);
    insert into resultado values ('cozinha: importa nota','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('cozinha: importa nota','bloqueado','bloqueado'); end;
end $$;

-- OUTRA CASA: não vê, e importa só no que é dela
select set_config('request.jwt.claims', '{"sub":"ba222222-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into resultado select 'outra casa: não vê notas', '0', (select count(*)::text from notas_compra);
insert into resultado select 'outra casa: não vê ligações', '0', (select count(*)::text from ligacoes_item_nota);
do $$ begin
  begin perform public.registrar_nota_compra('{"chave":"35260912345678000190550010000012431000012344","itens":[{"ordem":1,"descricao":"TOMATE","quantidade":1,"insumo_id":"baa00000-1111-0000-0000-000000000001","quantidade_insumo":1}]}'::jsonb);
    insert into resultado values ('outra casa: importa no insumo dos outros','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('outra casa: importa no insumo dos outros','bloqueado','bloqueado'); end;
end $$;
-- A chave da nota é por restaurante: outra casa pode importar a mesma chave (cada uma tem a sua cópia da nota do fornecedor).
insert into resultado select 'outra casa: mesma chave de nota, no insumo dela', '1', (select j->>'entradas' from (select public.registrar_nota_compra('{"chave":"35260912345678000190550010000012341000012345","numero":"1234","itens":[{"ordem":1,"descricao":"TOMATE","quantidade":2,"unidade":"KG","valor":6,"insumo_id":"bab00000-1111-0000-0000-000000000001","quantidade_insumo":2,"preco_unitario_novo":3,"custo":6}]}'::jsonb) as j) x);
reset role;

-- VISITANTE
set local role anon;
do $$ begin
  begin perform count(id) from notas_compra;
    insert into resultado values ('visitante: lê notas','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('visitante: lê notas','bloqueado','bloqueado'); end;
  begin perform public.registrar_nota_compra('{}'::jsonb);
    insert into resultado values ('visitante: importa','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('visitante: importa','bloqueado','bloqueado'); end;
end $$;
reset role;

select teste, esperado, obtido, case when esperado = obtido then 'OK' else 'FALHOU' end as status from resultado;
rollback;
