-- Ajuste atômico do saldo de estoque. Antes, registrarMovimentacao lia
-- saldo_atual, calculava o novo valor em JS e fazia um UPDATE com o valor
-- absoluto -- duas movimentações concorrentes pro mesmo insumo liam o mesmo
-- saldo inicial e uma sobrescrevia o efeito da outra. Aqui o incremento é
-- feito dentro do próprio UPDATE, então o Postgres serializa as duas linhas.
create or replace function ajustar_saldo_estoque(p_insumo_id uuid, p_delta numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- security definer ignora a RLS de "estoque" -- reforça o tenant check aqui.
  if not exists (
    select 1 from estoque e
    join insumos i on i.id = e.insumo_id
    where e.insumo_id = p_insumo_id and i.cliente_id = auth_cliente_id()
  ) then
    raise exception 'Estoque não encontrado para o insumo %', p_insumo_id;
  end if;

  update estoque
  set saldo_atual = saldo_atual + p_delta, atualizado_em = now()
  where insumo_id = p_insumo_id;
end;
$$;
