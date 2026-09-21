-- substituirFicha/substituirEtapas faziam DELETE + INSERT como duas chamadas
-- separadas ao Supabase, sem transação: se o INSERT falhar depois do DELETE
-- já commitado (ex. linha violando peso_liquido > 0), a receita fica sem
-- ficha/etapas nenhuma. Aqui delete+insert roda dentro da mesma function
-- plpgsql (uma única transação implícita) -- se o INSERT falhar, o Postgres
-- desfaz o DELETE sozinho.
create or replace function substituir_receita_insumos(p_receita_id uuid, p_linhas jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from receitas r where r.id = p_receita_id and r.cliente_id = auth_cliente_id()) then
    raise exception 'Receita não encontrada ou sem permissão';
  end if;

  delete from receita_insumos where receita_id = p_receita_id;

  insert into receita_insumos (receita_id, insumo_id, sub_receita_id, peso_liquido, unidade)
  select
    p_receita_id,
    (l->>'insumoId')::uuid,
    (l->>'subReceitaId')::uuid,
    (l->>'pesoLiquido')::numeric,
    l->>'unidade'
  from jsonb_array_elements(p_linhas) as l;
end;
$$;

create or replace function substituir_receita_etapas(p_receita_id uuid, p_etapas jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from receitas r where r.id = p_receita_id and r.cliente_id = auth_cliente_id()) then
    raise exception 'Receita não encontrada ou sem permissão';
  end if;

  delete from receita_etapas where receita_id = p_receita_id;

  insert into receita_etapas (receita_id, ordem, titulo, texto, foto_url)
  select
    p_receita_id,
    (e->>'ordem')::integer,
    e->>'titulo',
    e->>'texto',
    e->>'fotoUrl'
  from jsonb_array_elements(p_etapas) as e;
end;
$$;
