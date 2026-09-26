-- PLANO 9,5 (2026-09-26): telefone do restaurante num formato só.
-- Achado pelo teste de ponta a ponta: cadastrar com um telefone que já era de
-- outro restaurante criava o login e quebrava a tela (a pessoa ficava com
-- conta e sem restaurante). E o "telefone único" nem funcionava direito:
-- "(11) 98765-4321" e "11987654321" contavam como números diferentes.
--  - telefone_normalizado(): mesma regra de src/lib/telefone.ts (55 + DDD);
--  - clientes.telefone passa a ser gravado normalizado (check garante);
--  - telefone_disponivel(): o cadastro confere ANTES de criar o login, inclusive
--    quando o projeto exige confirmar o e-mail (a linha em clientes só nasce
--    no primeiro acesso). Só diz sim/não — não revela de quem é o número.
-- Reverter: supabase/reverter/20260927110000_telefone_cliente.sql

create or replace function telefone_normalizado(p text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when length(d) in (10, 11) then '55' || d
    else d
  end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) t
$$;

update clientes set telefone = telefone_normalizado(telefone) where telefone <> telefone_normalizado(telefone);
alter table clientes add constraint clientes_telefone_normalizado check (telefone ~ '^[0-9]{12,13}$');

create or replace function telefone_disponivel(p_telefone text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (select 1 from clientes where telefone = telefone_normalizado(p_telefone))
$$;

revoke execute on function telefone_disponivel(text) from public;
grant execute on function telefone_disponivel(text) to anon, authenticated;
