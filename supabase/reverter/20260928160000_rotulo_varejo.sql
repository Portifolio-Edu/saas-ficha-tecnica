-- Reverte 20260928160000_rotulo_varejo (os campos estruturados do rótulo somem;
-- os textos antigos continuam).
begin;
alter table rotulagem drop constraint if exists rotulagem_alergenicos_validos;
alter table rotulagem
  drop column if exists alergenicos, drop column if exists gluten_status, drop column if exists lactose_status,
  drop column if exists medida_caseira, drop column if exists modo_preparo;
drop function if exists interno.alergenicos_validos(jsonb);
commit;
