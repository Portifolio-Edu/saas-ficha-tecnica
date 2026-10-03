-- Reverte 20261003110000_notas_compra (notas importadas e ligações lembradas vão junto;
-- as entradas de estoque e os preços já lançados ficam: são movimentações e histórico normais).
begin;
drop function if exists public.registrar_nota_compra(jsonb);
drop table if exists ligacoes_item_nota;
drop table if exists notas_compra_itens;
drop table if exists notas_compra;
commit;
