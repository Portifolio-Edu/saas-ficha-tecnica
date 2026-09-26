-- Reverte 20260928150000_plano_producao (a lista de produção vai junto).
begin;
drop table if exists plano_producao;
commit;
