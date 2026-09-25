-- Teste do caminho cozinha → painel do gestor (2026-09-25). O aparelho da
-- cozinha grava do jeito que src/app/cozinha/actions.ts grava, e o gestor lê
-- com as mesmas consultas das telas (src/lib/dados/*). Se algo que a cozinha
-- registra não aparece no painel, alguma linha aqui sai FALHOU.
-- Roda numa transação e desfaz no fim: não grava nada. Toda linha precisa sair OK.
begin;
create temp table resultado (teste text, esperado text, obtido text) on commit drop;
grant all on resultado to authenticated, anon, service_role;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, 'x', now(), now(), now(), '{}', '{}'
from (values
  ('33333333-3333-3333-3333-333333333331', 'fluxo-dono@exemplo.invalid'),
  ('33333333-3333-3333-3333-333333333332', 'fluxo-gestor@exemplo.invalid'),
  ('33333333-3333-3333-3333-333333333334', 'fluxo-cozinha@exemplo.invalid')
) as u(id, email);

insert into clientes (id, user_id, nome, nome_restaurante, telefone) values
 ('cccccccc-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333331','Dona C','Restaurante C','+5500000000031');
insert into membros (cliente_id, user_id, papel, nome, ativo) values
 ('cccccccc-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333332','gestor','Gestor C', true),
 ('cccccccc-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333334','cozinha','Aparelho da cozinha 1', true);

insert into insumos (id, cliente_id, nome, unidade_medida, tamanho_embalagem, preco_embalagem) values
 ('cccccccc-1111-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001','Tomate','kg',1,8);
insert into estoque (insumo_id, saldo_atual) values ('cccccccc-1111-0000-0000-000000000001',10);
insert into receitas (id, cliente_id, nome_prato, preco_venda, rendimento) values
 ('cccccccc-3333-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001','Molho de tomate',30,1);
insert into receita_insumos (receita_id, insumo_id, peso_liquido, unidade) values
 ('cccccccc-3333-0000-0000-000000000001','cccccccc-1111-0000-0000-000000000001',0.5,'kg');
insert into locais_armazenamento (id, cliente_id, nome) values ('cccccccc-4444-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001','Geladeira 1');
insert into checklists (id, cliente_id, nome, momento) values ('cccccccc-2222-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001','Abertura','abertura');
insert into checklist_itens (id, checklist_id, texto) values ('cccccccc-5555-0000-0000-000000000001','cccccccc-2222-0000-0000-000000000001','Ligar coifa');

set local role authenticated;

-- COZINHA registra (mesmos inserts/updates das server actions)
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333334","role":"authenticated"}', true);
with nova as (
  insert into producoes (id, cliente_id, lote, receita_id, quantidade, responsavel, status)
  values ('cccccccc-6666-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001','MD-2509-01','cccccccc-3333-0000-0000-000000000001',4,'Ana','em_producao')
  returning id)
insert into resultado select 'cozinha: registra produção e recebe o id (insert + select)', '1', count(*)::text from nova;
insert into producoes (id, cliente_id, lote, receita_id, quantidade, responsavel, status)
values ('cccccccc-6666-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000001','MD-2509-02','cccccccc-3333-0000-0000-000000000001',2,'Ana','em_producao');
with mudou as (
  update producoes set status = 'perda', motivo_perda = 'Queimou' where id = 'cccccccc-6666-0000-0000-000000000002' returning id)
insert into resultado select 'cozinha: marca perda (update chega na linha)', '1', count(*)::text from mudou;
insert into checklist_execucoes (checklist_item_id, turno_id, chefe_turno, responsavel) values ('cccccccc-5555-0000-0000-000000000001', null, null, 'Ana');
insert into registros_temperatura (local_armazenamento_id, temperatura_c, responsavel, insumo_id) values ('cccccccc-4444-0000-0000-000000000001', 9.5, 'Ana', null);
insert into resultado select 'cozinha: envia contagem cega', 'ok',
  case when enviar_contagem('Ana', '[{"insumoId":"cccccccc-1111-0000-0000-000000000001","quantidade":7}]'::jsonb) is not null then 'ok' else 'falhou' end;
insert into resultado select 'cozinha: vê as produções de hoje (tela do tablet)', '2', count(*)::text from producoes
  where criado_em >= (date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');
insert into resultado select 'cozinha: vê o checklist marcado', '1', count(*)::text from checklist_execucoes;
insert into resultado select 'cozinha: continua sem ver saldo', '0', count(*)::text from estoque;

-- SERVIDOR baixa o estoque da produção (acaoRegistrarProducao → baixar_estoque_producao)
reset role;
set local role service_role;
select baixar_estoque_producao('cccccccc-6666-0000-0000-000000000001', '[{"insumoId":"cccccccc-1111-0000-0000-000000000001","quantidade":2}]'::jsonb);
reset role;
set local role authenticated;

-- GESTOR lê com as consultas das telas
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333332","role":"authenticated"}', true);

-- Produções (listarProducoes: join em receitas e turnos; sem receita a linha é descartada)
insert into resultado select 'gestor/Produções: vê as 2 produções da cozinha com a receita', '2', count(*)::text
  from producoes p join receitas r on r.id = p.receita_id left join turnos t on t.id = p.turno_id where p.responsavel = 'Ana';
insert into resultado select 'gestor/Produções: vê a perda com o motivo', 'Queimou', coalesce(max(motivo_perda), '(nada)') from producoes where status = 'perda';
insert into resultado select 'gestor/Produções: marca a origem (criado_por = aparelho)', '33333333-3333-3333-3333-333333333334',
  coalesce(max(criado_por::text), '(nada)') from producoes where id = 'cccccccc-6666-0000-0000-000000000001';

-- Checklists (listarChecklists: execuções desde a meia-noite de Brasília)
insert into resultado select 'gestor/Checklists: item aparece feito hoje', '1', count(*)::text from checklist_execucoes
  where checklist_item_id = 'cccccccc-5555-0000-0000-000000000001'
    and concluido_em >= (date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');

-- Segurança alimentar (listarRegistrosTemperatura: join no local)
insert into resultado select 'gestor/Segurança: vê a temperatura com o equipamento', 'Geladeira 1 9.5 Ana',
  coalesce(max(l.nome || ' ' || r.temperatura_c::text || ' ' || r.responsavel), '(nada)')
  from registros_temperatura r join locais_armazenamento l on l.id = r.local_armazenamento_id;

-- Estoque (saldo, movimentação da baixa e contagem cega)
insert into resultado select 'gestor/Estoque: saldo baixou pela ficha (10 - 2)', '8', saldo_atual::text from estoque where insumo_id = 'cccccccc-1111-0000-0000-000000000001';
insert into resultado select 'gestor/Estoque: movimentação "saída produção" com o insumo', 'saida_producao 2 Tomate',
  coalesce(max(m.tipo || ' ' || m.quantidade::text || ' ' || i.nome), '(nada)')
  from movimentacoes_estoque m join insumos i on i.id = m.insumo_id;
-- A contagem saiu antes da baixa: o saldo guardado é o da hora do envio (10).
insert into resultado select 'gestor/Estoque: contagem cega com contado, saldo da hora e preço', '7 de 10 a 8.00',
  coalesce(max(ci.quantidade_contada::text || ' de ' || ci.saldo_sistema::text || ' a ' || round(i.preco_unitario, 2)::text), '(nada)')
  from contagens_estoque c join contagem_itens ci on ci.contagem_id = c.id join insumos i on i.id = ci.insumo_id;

-- GESTOR desmarca o item: o tablet deixa de ver
delete from checklist_execucoes where checklist_item_id = 'cccccccc-5555-0000-0000-000000000001';
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333334","role":"authenticated"}', true);
insert into resultado select 'cozinha: vê o que o gestor desmarcou', '0', count(*)::text from checklist_execucoes;
reset role;

select teste, esperado, obtido, case when esperado = obtido then 'OK' else 'FALHOU' end as status from resultado;
rollback;
