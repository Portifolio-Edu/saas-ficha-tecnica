-- Reverte 20261003100000_produtos_pdv (as ligações produto do PDV -> ficha vão junto).
begin;
drop function if exists public.salvar_produtos_pdv(text, jsonb);
drop table if exists produtos_pdv;
drop function if exists interno.produto_pdv_so_prato();
commit;
