-- Teste dos papéis (dono/gestor/estoquista/cozinha). Roda numa transação e
-- desfaz no fim: não grava nada. Rodar depois de 20260925120000_equipe_papeis
-- (e de qualquer migration que mexa em policy). Toda linha precisa sair OK.
-- Criado em 2026-09-25.
begin;
create temp table resultado (teste text, esperado text, obtido text) on commit drop;
grant all on resultado to authenticated, anon, service_role;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, 'x', now(), now(), now(), '{}', '{}'
from (values
  ('11111111-1111-1111-1111-111111111111', 'papel-dono@exemplo.invalid'),
  ('11111111-1111-1111-1111-111111111112', 'papel-gestor@exemplo.invalid'),
  ('11111111-1111-1111-1111-111111111113', 'papel-estoquista@exemplo.invalid'),
  ('11111111-1111-1111-1111-111111111114', 'papel-cozinha@exemplo.invalid'),
  ('11111111-1111-1111-1111-111111111115', 'papel-ex@exemplo.invalid'),
  ('22222222-2222-2222-2222-222222222222', 'papel-outro@exemplo.invalid')
) as u(id, email);

-- O trigger cria o dono de cada restaurante.
insert into clientes (id, user_id, nome, nome_restaurante, telefone) values
 ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Dona A','Restaurante A','5500000000011'),
 ('bbbbbbbb-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','Dono B','Restaurante B','5500000000012');
insert into membros (cliente_id, user_id, papel, nome, ativo) values
 ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111112','gestor','Gestor A', true),
 ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111113','estoquista','Estoquista A', true),
 ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111114','cozinha','Tablet A', true),
 ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111115','estoquista','Ex-funcionário A', false);

insert into insumos (id, cliente_id, nome, unidade_medida, tamanho_embalagem, preco_embalagem) values
 ('aaaaaaaa-1111-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Picanha A','kg',1,90),
 ('bbbbbbbb-1111-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000002','Camarão B','kg',1,80);
insert into estoque (insumo_id, saldo_atual) values ('aaaaaaaa-1111-0000-0000-000000000001',10),('bbbbbbbb-1111-0000-0000-000000000002',7);
insert into receitas (id, cliente_id, nome_prato, preco_venda, rendimento) values
 ('aaaaaaaa-3333-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Picanha na chapa',89.9,1);
insert into receita_insumos (receita_id, insumo_id, peso_liquido, unidade) values
 ('aaaaaaaa-3333-0000-0000-000000000001','aaaaaaaa-1111-0000-0000-000000000001',0.3,'kg');
insert into fechamentos_cmv (cliente_id, periodo_inicio, periodo_fim, estoque_inicial, compras, estoque_final, faturamento) values
 ('aaaaaaaa-0000-0000-0000-000000000001','2026-08-01','2026-08-31',1000,5000,1200,20000);
insert into canais_venda (cliente_id, nome_canal, comissao_percentual) values ('aaaaaaaa-0000-0000-0000-000000000001','iFood',0.23);
insert into locais_armazenamento (id, cliente_id, nome) values ('aaaaaaaa-4444-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Câmara fria');
insert into checklists (id, cliente_id, nome, momento) values ('aaaaaaaa-2222-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Abertura','abertura');
insert into checklist_itens (id, checklist_id, texto) values ('aaaaaaaa-5555-0000-0000-000000000001','aaaaaaaa-2222-0000-0000-000000000001','Ligar coifa');
insert into producoes (id, cliente_id, lote, receita_id, quantidade, responsavel) values
 ('aaaaaaaa-6666-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','PC-0109-01','aaaaaaaa-3333-0000-0000-000000000001',2,'Ana');

set local role authenticated;

-- DONO
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
insert into resultado select 'dono: trigger criou o membro dono', 'dono', coalesce(interno.auth_papel(),'(nada)');
insert into resultado select 'dono: lê receitas', '1', count(*)::text from receitas;
insert into resultado select 'dono: lê faturamento', '20000', coalesce(max(faturamento)::text,'(nada)') from fechamentos_cmv;
insert into resultado select 'dono: vê a equipe inteira', '5', count(*)::text from membros;

-- GESTOR
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111112","role":"authenticated"}', true);
insert into resultado select 'gestor: lê receitas', '1', count(*)::text from receitas;
insert into resultado select 'gestor: lê faturamento', '20000', coalesce(max(faturamento)::text,'(nada)') from fechamentos_cmv;
insert into resultado select 'gestor: lê insumos com preço', '90', coalesce(max(preco_embalagem)::text,'(nada)') from insumos;
insert into resultado select 'gestor: não vê outro restaurante', '1', count(*)::text from insumos;

-- ESTOQUISTA
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111113","role":"authenticated"}', true);
insert into resultado select 'estoquista: lê insumos', '1', count(*)::text from insumos;
insert into resultado select 'estoquista: lê estoque', '1', count(*)::text from estoque;
insert into resultado select 'estoquista: NÃO lê receitas (preço de venda)', '0', count(*)::text from receitas;
insert into resultado select 'estoquista: NÃO lê ficha com custo', '0', count(*)::text from receita_insumos;
insert into resultado select 'estoquista: NÃO lê fechamento com faturamento', '0', count(*)::text from fechamentos_cmv;
insert into resultado select 'estoquista: NÃO lê canais/comissões', '0', count(*)::text from canais_venda;
insert into resultado select 'estoquista: CMV do estoque (sem faturamento)', '5000', coalesce(max(compras)::text,'(nada)') from fechamentos_cmv_estoque();
insert into resultado select 'estoquista: vê só a si na equipe', '1', count(*)::text from membros;
insert into resultado select 'estoquista: NÃO vê contagens cegas', '0', count(*)::text from contagens_estoque;
do $$ begin
  begin perform substituir_receita_insumos('aaaaaaaa-3333-0000-0000-000000000001', '[]'::jsonb);
    insert into resultado values ('estoquista: troca ficha técnica','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('estoquista: troca ficha técnica','bloqueado','bloqueado'); end;
  begin perform ajustar_saldo_estoque('aaaaaaaa-1111-0000-0000-000000000001', 1);
    insert into resultado values ('estoquista: ajusta estoque','permitido','permitido');
  exception when others then insert into resultado values ('estoquista: ajusta estoque','permitido','BLOQUEADO (falha)'); end;
end $$;
update clientes set margem_alvo = 0.1;
insert into resultado select 'estoquista: NÃO edita dados do restaurante', '0.65', margem_alvo::text from clientes;

-- COZINHA
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111114","role":"authenticated"}', true);
insert into resultado select 'cozinha: NÃO lê insumos (preço)', '0', count(*)::text from insumos;
insert into resultado select 'cozinha: NÃO lê estoque (saldo)', '0', count(*)::text from estoque;
insert into resultado select 'cozinha: NÃO lê receitas (preço)', '0', count(*)::text from receitas;
insert into resultado select 'cozinha: NÃO lê fechamentos', '0', count(*)::text from fechamentos_cmv;
insert into resultado select 'cozinha: NÃO lê fornecedores', '0', count(*)::text from fornecedores;
insert into resultado select 'cozinha: NÃO lê movimentações', '0', count(*)::text from movimentacoes_estoque;
insert into resultado select 'cozinha: ficha sem custo tem a receita', 'Picanha na chapa', dados_cozinha()->'receitas'->0->>'nome_prato';
insert into resultado select 'cozinha: ficha sem custo tem a gramatura', '0.3', dados_cozinha()->'receitas'->0->'ficha'->0->>'peso_liquido';
insert into resultado select 'cozinha: ficha sem custo não traz preço nem saldo', 'false',
  (dados_cozinha()::text ~ '(preco|saldo|custo|margem|faturamento)')::text;
insert into resultado select 'cozinha: lê checklists', '1', count(*)::text from checklists;
insert into resultado select 'cozinha: lê locais de temperatura', '1', count(*)::text from locais_armazenamento;
insert into checklist_execucoes (checklist_item_id, responsavel) values ('aaaaaaaa-5555-0000-0000-000000000001','Ana');
insert into resultado select 'cozinha: marca item do checklist', '1', count(*)::text from checklist_execucoes;
insert into registros_temperatura (local_armazenamento_id, temperatura_c, responsavel) values ('aaaaaaaa-4444-0000-0000-000000000001',3,'Ana');
insert into resultado select 'cozinha: registra temperatura', '1', count(*)::text from registros_temperatura;
insert into producoes (cliente_id, lote, receita_id, quantidade, responsavel) values ('aaaaaaaa-0000-0000-0000-000000000001','PC-0109-02','aaaaaaaa-3333-0000-0000-000000000001',1,'Ana');
insert into resultado select 'cozinha: registra produção', '2', count(*)::text from producoes;
update producoes set status = 'perda', motivo_perda = 'Queimou' where lote = 'PC-0109-02';
insert into resultado select 'cozinha: marca perda', 'perda', status from producoes where lote = 'PC-0109-02';
insert into resultado select 'cozinha: envia contagem cega', 'ok',
  case when enviar_contagem('Ana', '[{"insumoId":"aaaaaaaa-1111-0000-0000-000000000001","quantidade":8}]'::jsonb) is not null then 'ok' else 'falhou' end;
insert into resultado select 'cozinha: NÃO vê o resultado da contagem', '0', count(*)::text from contagem_itens;
insert into resultado select 'cozinha: NÃO vê a equipe', '1', count(*)::text from membros;
do $$ begin
  begin perform ajustar_saldo_estoque('aaaaaaaa-1111-0000-0000-000000000001', 50);
    insert into resultado values ('cozinha: ajusta saldo pela função','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('cozinha: ajusta saldo pela função','bloqueado','bloqueado'); end;
  begin perform baixar_estoque_producao('aaaaaaaa-6666-0000-0000-000000000001', '[{"insumoId":"aaaaaaaa-1111-0000-0000-000000000001","quantidade":5}]'::jsonb);
    insert into resultado values ('cozinha: chama a baixa do servidor direto','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('cozinha: chama a baixa do servidor direto','bloqueado','bloqueado'); end;
  begin perform fechamentos_cmv_estoque();
    if (select count(*) from fechamentos_cmv_estoque()) = 0 then
      insert into resultado values ('cozinha: CMV do estoque','0 linhas','0 linhas');
    else insert into resultado values ('cozinha: CMV do estoque','0 linhas','VIU (falha)'); end if;
  end;
  begin insert into funcionarios (cliente_id, nome) values ('aaaaaaaa-0000-0000-0000-000000000001','Invasor');
    insert into resultado values ('cozinha: cadastra funcionário','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('cozinha: cadastra funcionário','bloqueado','bloqueado'); end;
  begin insert into checklist_itens (checklist_id, texto) values ('aaaaaaaa-2222-0000-0000-000000000001','Item novo');
    insert into resultado values ('cozinha: edita o checklist','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('cozinha: edita o checklist','bloqueado','bloqueado'); end;
end $$;
delete from producoes where lote = 'PC-0109-01';
insert into resultado select 'cozinha: NÃO apaga produção', '2', count(*)::text from producoes;

-- MEMBRO DESATIVADO
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111115","role":"authenticated"}', true);
insert into resultado select 'desativado: lê insumos', '0', count(*)::text from insumos;
insert into resultado select 'desativado: lê o restaurante', '0', count(*)::text from clientes;

-- OUTRO RESTAURANTE
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
insert into resultado select 'outro restaurante: vê insumos de A', 'Camarão B', string_agg(nome, ',') from insumos;
insert into resultado select 'outro restaurante: vê equipe de A', '1', count(*)::text from membros;

-- DONO de novo: vê a contagem com a diferença
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
insert into resultado select 'dono: vê contagem cega com saldo do sistema', '8 de 11', quantidade_contada::text || ' de ' || saldo_sistema::text from contagem_itens;

-- SERVIDOR (service role): baixa a produção uma vez só
reset role;
set local role service_role;
select baixar_estoque_producao('aaaaaaaa-6666-0000-0000-000000000001', '[{"insumoId":"aaaaaaaa-1111-0000-0000-000000000001","quantidade":0.6},{"insumoId":"bbbbbbbb-1111-0000-0000-000000000002","quantidade":3}]'::jsonb);
do $$ begin
  begin perform baixar_estoque_producao('aaaaaaaa-6666-0000-0000-000000000001', '[{"insumoId":"aaaaaaaa-1111-0000-0000-000000000001","quantidade":0.6}]'::jsonb);
    insert into resultado values ('servidor: baixa a mesma produção 2 vezes','bloqueado','PASSOU (falha)');
  exception when others then insert into resultado values ('servidor: baixa a mesma produção 2 vezes','bloqueado','bloqueado'); end;
end $$;
reset role;
insert into resultado select 'baixa da produção (10 + 1 do estoquista - 0,6)', '10.4', saldo_atual::text from estoque where insumo_id = 'aaaaaaaa-1111-0000-0000-000000000001';
insert into resultado select 'baixa não atinge insumo de outro restaurante', '7', saldo_atual::text from estoque where insumo_id = 'bbbbbbbb-1111-0000-0000-000000000002';

-- Visitante
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  begin perform count(*) from (select 1 from membros) x;
    insert into resultado values ('visitante lê membros','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('visitante lê membros','bloqueado','bloqueado'); end;
end $$;
do $$ begin
  begin perform count(*) from (select 1 from insumos) x;
    insert into resultado values ('visitante lê insumos','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('visitante lê insumos','bloqueado','bloqueado'); end;
end $$;
reset role;

select teste, esperado, obtido, case when esperado = obtido then 'OK' else 'FALHOU' end as status from resultado;
rollback;
