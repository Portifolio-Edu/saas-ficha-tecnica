-- Reverte 20261002120000_avisos_gestao: volta os avisos ao formato de
-- 20261002100000 (temperatura, abertura e resumo). Os avisos dos tipos novos
-- são apagados do histórico. Volte o código junto (src/lib/automacoes).
begin;
delete from avisos where tipo not in ('checklist_abertura', 'resumo_diario');
drop index if exists avisos_ja_avisados;
alter table avisos drop constraint avisos_tipo_check;
alter table avisos add constraint avisos_tipo_check check (tipo in ('temperatura', 'checklist_abertura', 'resumo_diario'));
alter table avisos drop column detalhe;
alter table avisos_config
  drop column estoque_baixo, drop column fornecedor, drop column equipe,
  drop column equipe_hora, drop column desperdicio, drop column vendas,
  add column temperatura boolean not null default true;
grant insert (temperatura) on avisos_config to authenticated;
grant update (temperatura) on avisos_config to authenticated;
commit;
