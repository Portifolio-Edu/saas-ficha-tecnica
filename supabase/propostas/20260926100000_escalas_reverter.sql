-- Reverte a proposta 20260926100000_escalas (se tiver sido aplicada).
begin;
drop table if exists perfis_extra, banco_extras, prontuario_ocorrencias, escalas_config, escalas_regras;
alter table funcionarios drop constraint if exists funcionarios_id_cliente_uk;
alter table funcionarios drop constraint if exists funcionarios_datas_ok;
alter table funcionarios
  drop column if exists setor, drop column if exists cargo, drop column if exists nivel,
  drop column if exists habilidades, drop column if exists admitido_em, drop column if exists desligado_em;
commit;
