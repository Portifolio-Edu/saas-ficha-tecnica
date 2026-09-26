-- Reverte 20260925150000_cozinha_proteinas: a cozinha deixa de registrar
-- manipulação de proteínas. Os lotes já gravados continuam na tabela.
begin;
drop function if exists registrar_processamento_cozinha(uuid, text, numeric, numeric, numeric, text);
drop function if exists lotes_proteina_cozinha(int);
alter table processamentos_proteina drop column if exists criado_por;
commit;
