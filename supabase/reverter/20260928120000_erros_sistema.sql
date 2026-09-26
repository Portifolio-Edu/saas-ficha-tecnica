-- Reverte 20260928120000_erros_sistema (os erros gravados vão junto).
begin;
drop table if exists public.erros_sistema;
drop function if exists interno.limpar_erros_antigos();
commit;
