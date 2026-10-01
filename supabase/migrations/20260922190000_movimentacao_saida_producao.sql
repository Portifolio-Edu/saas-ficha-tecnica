-- Consumo de insumo por lote de produção ganha tipo próprio. Antes era gravado
-- como 'ajuste', o mesmo tipo usado pra perda e correção de inventário, e o
-- histórico de estoque não distinguia produção normal de quebra.
alter table movimentacoes_estoque drop constraint if exists movimentacoes_estoque_tipo_check;
alter table movimentacoes_estoque
  add constraint movimentacoes_estoque_tipo_check
  check (tipo in ('entrada', 'saida_venda', 'saida_producao', 'ajuste'));
