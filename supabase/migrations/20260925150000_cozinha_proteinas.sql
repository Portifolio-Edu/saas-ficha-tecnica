-- PROTEÍNAS NA COZINHA (2026-09-25): o tablet da cozinha registra a
-- manipulação de proteínas (pesou bruto, limpou, pesou de novo) sem ver nem
-- digitar valor em R$. A tabela processamentos_proteina continua só da
-- gestão/estoque na RLS; a cozinha passa por estas duas funções:
--   registrar_processamento_cozinha: grava o lote; o valor pago por kg vem do
--     cadastro do insumo (preco_unitario), no servidor. Devolve só o FC.
--   lotes_proteina_cozinha: últimos lotes, sem nenhuma coluna de valor.
-- Também guarda quem gravou (criado_por), como nas outras tabelas da cozinha.
-- Reverter: supabase/reverter/20260925150000_cozinha_proteinas.sql

alter table processamentos_proteina add column if not exists criado_por uuid default auth.uid();

create or replace function registrar_processamento_cozinha(
  p_insumo_id uuid,
  p_responsavel text,
  p_peso_bruto numeric,
  p_peso_limpo numeric,
  p_aparas numeric default 0,
  p_observacao text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente uuid := auth_cliente_id();
  v_preco numeric;
  v_fc numeric;
begin
  if v_cliente is null then
    raise exception 'Sem acesso';
  end if;
  if coalesce(trim(p_responsavel), '') = '' then
    raise exception 'Escolha quem está fazendo antes de registrar.';
  end if;
  if p_peso_bruto is null or p_peso_bruto <= 0 then
    raise exception 'Informe o peso bruto (como a peça chegou).';
  end if;
  if p_peso_limpo is null or p_peso_limpo <= 0 then
    raise exception 'Informe o peso limpo (pronto pra usar).';
  end if;
  if p_peso_limpo + coalesce(p_aparas, 0) > p_peso_bruto then
    raise exception 'O peso limpo mais as aparas passam do peso bruto. Confira a balança.';
  end if;

  select preco_unitario into v_preco
  from insumos
  where id = p_insumo_id and cliente_id = v_cliente and categoria = 'proteina';
  if not found then
    raise exception 'Proteína não encontrada.';
  end if;

  insert into processamentos_proteina (
    insumo_id, responsavel, peso_bruto_recebido, valor_pago_kg,
    peso_liquido_resultante, peso_aparas_reaproveitaveis, observacao, criado_por
  ) values (
    p_insumo_id, trim(p_responsavel), p_peso_bruto, coalesce(v_preco, 0),
    p_peso_limpo, coalesce(p_aparas, 0), nullif(trim(coalesce(p_observacao, '')), ''), auth.uid()
  )
  returning fc_observado into v_fc;

  return v_fc;
end;
$$;

create or replace function lotes_proteina_cozinha(p_limite int default 30)
returns table (
  id uuid,
  insumo_id uuid,
  responsavel text,
  peso_bruto numeric,
  peso_limpo numeric,
  aparas numeric,
  descarte numeric,
  fc numeric,
  observacao text,
  processado_em timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.insumo_id, p.responsavel, p.peso_bruto_recebido, p.peso_liquido_resultante,
         p.peso_aparas_reaproveitaveis, p.peso_descarte_puro, p.fc_observado, p.observacao, p.processado_em
  from processamentos_proteina p
  join insumos i on i.id = p.insumo_id
  where i.cliente_id = auth_cliente_id()
  order by p.processado_em desc
  limit least(greatest(coalesce(p_limite, 30), 1), 100);
$$;

revoke execute on function registrar_processamento_cozinha(uuid, text, numeric, numeric, numeric, text) from public, anon;
revoke execute on function lotes_proteina_cozinha(int) from public, anon;
grant execute on function registrar_processamento_cozinha(uuid, text, numeric, numeric, numeric, text) to authenticated;
grant execute on function lotes_proteina_cozinha(int) to authenticated;
