-- ESCALAS (2026-09-26): escala_publica passa a separar as ausências da
-- cozinha em dois tipos, sem revelar o motivo:
--   ausencia            = falta ou atestado (só nos dias em que trabalharia);
--   ausencia_prolongada = afastamento (período todo, folga inclusive).
-- Antes tudo virava "ausencia" e uma falta lançada num dia de folga aparecia
-- como "Ausente" no tablet enquanto o gestor via "Folga".
-- Reverter: supabase/reverter/20260926120000_escalas_publica_ausencias.sql

create or replace function escala_publica(p_inicio date, p_fim date)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_cliente uuid := auth_cliente_id();
begin
  if v_cliente is null then
    raise exception 'Sem acesso';
  end if;
  if p_inicio is null or p_fim is null or p_fim < p_inicio or p_fim - p_inicio > 62 then
    raise exception 'Período inválido';
  end if;

  return jsonb_build_object(
    'intervalo_domingo_semanas', coalesce((select r.intervalo_domingo_semanas from escalas_regras r where r.cliente_id = v_cliente), 3),
    'funcionarios', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'nome', f.nome, 'setor', f.setor, 'cargo', f.cargo,
        'admitido_em', f.admitido_em, 'desligado_em', f.desligado_em,
        'tipo', c.tipo, 'ancora', c.ancora, 'folgas_preferidas', c.folgas_preferidas,
        'intervalo_domingo_semanas', c.intervalo_domingo_semanas,
        'turno_inicio', c.turno_inicio, 'turno_fim', c.turno_fim
      ) order by f.nome)
      from funcionarios f
      join escalas_config c on c.funcionario_id = f.id
      where f.cliente_id = v_cliente
        and f.setor is not null and f.cargo is not null and f.admitido_em is not null
        and f.admitido_em <= p_fim
        and (f.desligado_em is null or f.desligado_em >= p_inicio - 14)
    ), '[]'::jsonb),
    -- Sem motivo: falta e atestado viram "ausencia" (só conta em dia de
    -- trabalho); afastamento vira "ausencia_prolongada" (vale no período
    -- todo, folga inclusive). Restrição só vai quando muda a escala
    -- (sem_escala_longa), e sem dizer qual é o motivo.
    'ausencias', coalesce((
      select jsonb_agg(jsonb_build_object(
        'funcionario_id', o.funcionario_id,
        'tipo', case o.tipo
          when 'ferias' then 'ferias'
          when 'restricao' then 'restricao'
          when 'afastamento' then 'ausencia_prolongada'
          else 'ausencia'
        end,
        'inicio', o.inicio, 'fim', o.fim
      ) order by o.inicio, o.id)
      from prontuario_ocorrencias o
      where o.cliente_id = v_cliente
        and o.fim >= p_inicio - 14 and o.inicio <= p_fim
        and (o.tipo <> 'restricao' or 'sem_escala_longa' = any (o.restricoes))
    ), '[]'::jsonb)
  );
end;
$$;
