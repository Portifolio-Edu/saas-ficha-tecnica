-- Vincula opcionalmente uma leitura de temperatura a um insumo especifico,
-- pra registrar quando a checagem foi motivada por ele (nao so ronda geral
-- do local). Nula quando a leitura for so a ronda geral.
alter table registros_temperatura
  add column insumo_id uuid references insumos(id) on delete set null;

create index registros_temperatura_insumo_id_idx on registros_temperatura(insumo_id);
