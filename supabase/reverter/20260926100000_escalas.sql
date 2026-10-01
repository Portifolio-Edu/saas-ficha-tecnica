-- Reverte 20260926100000_escalas. Apaga escalas, prontuário e extras.
-- Se 20260927100000_perfil_equipe estiver aplicada, reverta ela antes.
begin;
drop function if exists salvar_pessoa_escala(uuid, text, text, text, text, text[], date, date, text, date, smallint[], smallint, time, time);
drop function if exists salvar_pessoa_escala(uuid, text, text, text, date, date, text, date, smallint[], smallint, time, time);
drop function if exists escala_publica(date, date);
drop trigger if exists funcionarios_validar_setor on funcionarios;
drop function if exists validar_setor_funcionario();
drop table if exists perfis_extra, banco_extras, prontuario_ocorrencias, escalas_config, escalas_regras;
drop function if exists validar_escala_config();
alter table funcionarios drop constraint if exists funcionarios_id_cliente_uk;
alter table funcionarios drop constraint if exists funcionarios_datas_ok;
alter table funcionarios
  drop column if exists setor, drop column if exists cargo, drop column if exists nivel,
  drop column if exists habilidades, drop column if exists admitido_em, drop column if exists desligado_em;
commit;
