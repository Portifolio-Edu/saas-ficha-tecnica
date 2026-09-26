-- Teste da exclusão do restaurante (LGPD, 2026-09-26): um restaurante com
-- todas as ligações que não apagam em cascata some inteiro; o vizinho fica.
-- Roda numa transação e desfaz no fim. Toda linha precisa sair OK.
begin;
create temp table resultado (teste text, esperado text, obtido text) on commit drop;
grant all on resultado to authenticated, service_role;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, 'x', now(), now(), now(), '{}', '{}'
from (values ('e1111111-0000-0000-0000-000000000001', 'lgpd-a@exemplo.invalid'), ('e2222222-0000-0000-0000-000000000001', 'lgpd-b@exemplo.invalid')) as u(id, email);

do $$
declare c uuid; loc uuid; ins uuid; rec uuid; sub uuid; tur uuid; can uuid; fic uuid; fec uuid; chk uuid; itm uuid;
begin
  foreach c in array array['ea000000-0000-0000-0000-000000000001'::uuid, 'eb000000-0000-0000-0000-000000000001'::uuid] loop
    insert into clientes (id, user_id, nome, nome_restaurante, telefone)
    values (c, case when c = 'ea000000-0000-0000-0000-000000000001' then 'e1111111-0000-0000-0000-000000000001'::uuid else 'e2222222-0000-0000-0000-000000000001'::uuid end,
            'Dono', 'Restaurante ' || left(c::text, 2), case when c = 'ea000000-0000-0000-0000-000000000001' then '5500000000071' else '5500000000072' end);
    insert into locais_armazenamento (cliente_id, nome) values (c, 'Geladeira') returning id into loc;
    insert into insumos (cliente_id, nome, unidade_medida, tamanho_embalagem, preco_embalagem, local_armazenamento_id) values (c, 'Tomate', 'kg', 1, 8, loc) returning id into ins;
    insert into estoque (insumo_id, saldo_atual) values (ins, 10);
    insert into receitas (cliente_id, nome_prato, preco_venda, rendimento) values (c, 'Molho', 30, 1) returning id into sub;
    insert into receitas (cliente_id, nome_prato, preco_venda, rendimento) values (c, 'Prato', 60, 1) returning id into rec;
    insert into receita_insumos (receita_id, insumo_id, peso_liquido, unidade) values (rec, ins, 0.2, 'kg');
    insert into receita_insumos (receita_id, sub_receita_id, peso_liquido, unidade) values (rec, sub, 0.1, 'kg');
    insert into receita_embalagens (receita_id, insumo_id) values (rec, ins);
    insert into turnos (cliente_id, nome) values (c, 'Almoço') returning id into tur;
    insert into producoes (cliente_id, lote, receita_id, quantidade, responsavel, status, turno_id) values (c, 'L1', rec, 1, 'Ana', 'em_producao', tur);
    insert into canais_venda (cliente_id, nome_canal, comissao_percentual) values (c, 'iFood', 0.2) returning id into can;
    insert into fichas_tecnicas (receita_id, cmv_calculado, margem_calculada) values (rec, 0.3, 0.7) returning id into fic;
    insert into precos_canal (ficha_tecnica_id, canal_id, preco_sugerido, margem_liquida_canal) values (fic, can, 70, 0.5);
    insert into fechamentos_cmv (cliente_id, periodo_inicio, periodo_fim, estoque_inicial, compras, estoque_final, faturamento) values (c, '2026-09-01', '2026-09-30', 1, 1, 1, 10) returning id into fec;
    insert into vendas_periodo (fechamento_id, receita_id, quantidade) values (fec, rec, 3);
    insert into checklists (cliente_id, nome, momento) values (c, 'Abertura', 'abertura') returning id into chk;
    insert into checklist_itens (checklist_id, texto) values (chk, 'Ligar coifa') returning id into itm;
    insert into checklist_execucoes (checklist_item_id, turno_id, responsavel) values (itm, tur, 'Ana');
    insert into registros_temperatura (local_armazenamento_id, temperatura_c, responsavel, insumo_id) values (loc, 4, 'Ana', ins);
    insert into funcionarios (cliente_id, nome) values (c, 'Bruno');
  end loop;
end $$;


set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e1111111-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$ begin
  begin perform excluir_restaurante('ea000000-0000-0000-0000-000000000001');
    insert into resultado values ('dono logado chama a função direto (só o servidor pode)','bloqueado','PASSOU (falha)');
  exception when insufficient_privilege then insert into resultado values ('dono logado chama a função direto (só o servidor pode)','bloqueado','bloqueado'); end;
end $$;
reset role;

set local role service_role;
select excluir_restaurante('ea000000-0000-0000-0000-000000000001');
reset role;

insert into resultado select 'A: não sobra nada', '0',
  ((select count(*) from clientes where id = 'ea000000-0000-0000-0000-000000000001')
 + (select count(*) from insumos where cliente_id = 'ea000000-0000-0000-0000-000000000001')
 + (select count(*) from receitas where cliente_id = 'ea000000-0000-0000-0000-000000000001')
 + (select count(*) from producoes where cliente_id = 'ea000000-0000-0000-0000-000000000001')
 + (select count(*) from turnos where cliente_id = 'ea000000-0000-0000-0000-000000000001')
 + (select count(*) from locais_armazenamento where cliente_id = 'ea000000-0000-0000-0000-000000000001')
 + (select count(*) from funcionarios where cliente_id = 'ea000000-0000-0000-0000-000000000001')
 + (select count(*) from membros where cliente_id = 'ea000000-0000-0000-0000-000000000001'))::text;
insert into resultado select 'A: nem as linhas ligadas (ficha, venda, execução, temperatura)', '0',
  ((select count(*) from receita_insumos ri join receitas r on r.id = ri.receita_id where r.cliente_id = 'ea000000-0000-0000-0000-000000000001')
 + (select count(*) from vendas_periodo v left join fechamentos_cmv f on f.id = v.fechamento_id where f.id is null)
 + (select count(*) from checklist_execucoes e left join checklist_itens i on i.id = e.checklist_item_id where i.id is null)
 + (select count(*) from registros_temperatura t left join locais_armazenamento l on l.id = t.local_armazenamento_id where l.id is null))::text;
insert into resultado select 'B: continua inteiro', '1 1 2 1 1 1 1',
  (select count(*) from clientes where id = 'eb000000-0000-0000-0000-000000000001')::text || ' ' ||
  (select count(*) from insumos where cliente_id = 'eb000000-0000-0000-0000-000000000001')::text || ' ' ||
  (select count(*) from receitas where cliente_id = 'eb000000-0000-0000-0000-000000000001')::text || ' ' ||
  (select count(*) from producoes where cliente_id = 'eb000000-0000-0000-0000-000000000001')::text || ' ' ||
  (select count(*) from vendas_periodo v join fechamentos_cmv f on f.id = v.fechamento_id where f.cliente_id = 'eb000000-0000-0000-0000-000000000001')::text || ' ' ||
  (select count(*) from estoque e join insumos i on i.id = e.insumo_id where i.cliente_id = 'eb000000-0000-0000-0000-000000000001')::text || ' ' ||
  (select count(*) from membros where cliente_id = 'eb000000-0000-0000-0000-000000000001')::text;

select teste, esperado, obtido, case when esperado = obtido then 'OK' else 'FALHOU' end as status from resultado;
rollback;
