-- AVISOS PRA GESTÃO (2026-10-02): os avisos no WhatsApp passam a cobrir o que
-- o dono/gestor precisa saber pra agir: falta de insumo, problema com
-- fornecedor (prazo de pedido, preço que subiu, carne rendendo menos), falta
-- de gente na equipe, desperdício e fechamento de vendas/CMV.
-- Temperatura sai daqui: quem cobra é a nutricionista (canal próprio depois).
--
--  - avisos.detalhe: o que entrou em cada aviso (ex.: ids dos insumos). O
--    servidor usa pra não repetir o mesmo item e juntar vários num aviso só.
--  - avisos_config: uma chave liga/desliga por assunto + "a partir de" da
--    equipe. Sem linha continua = tudo ligado.
--
-- Reverter: supabase/reverter/20261002120000_avisos_gestao.sql

alter table avisos add column detalhe jsonb;

delete from avisos where tipo = 'temperatura';
alter table avisos drop constraint avisos_tipo_check;
alter table avisos add constraint avisos_tipo_check check (tipo in (
  'estoque_baixo', 'compras_prazo', 'preco_subiu', 'rendimento_baixo',
  'equipe', 'desperdicio', 'vendas', 'checklist_abertura', 'resumo_diario'
));
create index avisos_ja_avisados on avisos (cliente_id, tipo, criado_em desc);

alter table avisos_config
  drop column temperatura,
  add column estoque_baixo boolean not null default true,
  add column fornecedor boolean not null default true,
  add column equipe boolean not null default true,
  add column equipe_hora time not null default '07:00',
  add column desperdicio boolean not null default true,
  add column vendas boolean not null default true;

grant insert (estoque_baixo, fornecedor, equipe, equipe_hora, desperdicio, vendas) on avisos_config to authenticated;
grant update (estoque_baixo, fornecedor, equipe, equipe_hora, desperdicio, vendas) on avisos_config to authenticated;
