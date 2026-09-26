-- Reverte 20260928130000_requisicoes_compra (os pedidos da cozinha vão junto;
-- os dias de entrega voltam como texto).
begin;
drop function if exists public.agenda_fornecedores();
drop table if exists requisicoes;
drop function if exists interno.carimbar_resolucao();
alter table fornecedores add column dias_entrega text;
update fornecedores set dias_entrega = nullif(array_to_string(array(
  select (array['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'])[d + 1] from unnest(entrega_dias) d order by d), ', '), '');
alter table fornecedores
  drop column entrega_dias, drop column pedido_ate, drop column pedido_antecedencia, drop column categorias_pedido;
commit;
