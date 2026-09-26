-- Reverte 20260927110000_telefone_cliente (os telefones continuam normalizados).
begin;
drop function if exists telefone_disponivel(text);
alter table clientes drop constraint if exists clientes_telefone_normalizado;
drop function if exists telefone_normalizado(text);
commit;
