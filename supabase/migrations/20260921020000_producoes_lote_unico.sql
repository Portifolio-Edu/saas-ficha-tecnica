-- O código de lote era derivado de um COUNT sem lock: duas "iniciar
-- produção" concorrentes pra mesma receita podiam calcular a mesma
-- sequência e gerar o mesmo lote. Escopo por cliente_id (não receita_id):
-- lote é o código de rastreabilidade do lote físico pro restaurante inteiro,
-- então precisa ser único por cliente, não só dentro de uma receita.
alter table producoes
  add constraint producoes_cliente_lote_unico unique (cliente_id, lote);
