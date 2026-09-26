-- Reverte 20260928140000_link_consulta: os links param de abrir (tabela
-- apagada) e dados_cozinha()/escala_publica() voltam a ter o corpo próprio
-- (mesmo resultado; ver 20260925120000 e 20260926120000).
begin;
drop function if exists public.consulta_por_link(text, date, date);
drop table if exists links_consulta;
drop function if exists interno.links_consulta_so_desligar();

create or replace function public.dados_cozinha()
returns jsonb language plpgsql security definer set search_path = public, interno stable
as $$
declare v_cliente uuid := interno.auth_cliente_id();
begin
  if v_cliente is null then raise exception 'Sem acesso'; end if;
  return jsonb_build_object(
    'receitas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'nome_prato', r.nome_prato, 'tipo', r.tipo, 'categoria', r.categoria,
        'rendimento', r.rendimento, 'unidade_rendimento', r.unidade_rendimento,
        'peso_porcao_g', r.peso_porcao_g, 'modo_preparo', r.modo_preparo, 'foto_url', r.foto_url,
        'ficha', coalesce((select jsonb_agg(jsonb_build_object('id', ri.id, 'insumo_id', ri.insumo_id, 'sub_receita_id', ri.sub_receita_id, 'peso_liquido', ri.peso_liquido, 'unidade', ri.unidade)) from receita_insumos ri where ri.receita_id = r.id), '[]'::jsonb),
        'etapas', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'ordem', e.ordem, 'titulo', e.titulo, 'texto', e.texto, 'foto_url', e.foto_url) order by e.ordem) from receita_etapas e where e.receita_id = r.id), '[]'::jsonb)
      ) order by r.nome_prato) from receitas r where r.cliente_id = v_cliente), '[]'::jsonb),
    'insumos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'nome', i.nome, 'categoria', i.categoria, 'unidade_medida', i.unidade_medida,
        'fator_correcao', i.fator_correcao, 'peso_por_unidade', i.peso_por_unidade,
        'local_armazenamento_id', i.local_armazenamento_id,
        'tem_estoque', exists (select 1 from estoque e where e.insumo_id = i.id)
      ) order by i.nome) from insumos i where i.cliente_id = v_cliente), '[]'::jsonb),
    'processamentos', coalesce((
      select jsonb_agg(jsonb_build_object('insumo_id', p.insumo_id, 'peso_bruto_recebido', p.peso_bruto_recebido, 'peso_liquido_resultante', p.peso_liquido_resultante, 'processado_em', p.processado_em))
      from processamentos_proteina p join insumos i on i.id = p.insumo_id where i.cliente_id = v_cliente), '[]'::jsonb)
  );
end;
$$;

create or replace function public.escala_publica(p_inicio date, p_fim date)
returns jsonb language plpgsql security definer set search_path = public, interno stable
as $$
declare v_cliente uuid := interno.auth_cliente_id();
begin
  if v_cliente is null then raise exception 'Sem acesso'; end if;
  if p_inicio is null or p_fim is null or p_fim < p_inicio or p_fim - p_inicio > 62 then raise exception 'Período inválido'; end if;
  return jsonb_build_object(
    'intervalo_domingo_semanas', coalesce((select r.intervalo_domingo_semanas from escalas_regras r where r.cliente_id = v_cliente), 3),
    'funcionarios', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'nome', f.nome, 'setor', f.setor, 'cargo', f.cargo, 'admitido_em', f.admitido_em, 'desligado_em', f.desligado_em,
        'tipo', c.tipo, 'ancora', c.ancora, 'folgas_preferidas', c.folgas_preferidas, 'intervalo_domingo_semanas', c.intervalo_domingo_semanas,
        'turno_inicio', c.turno_inicio, 'turno_fim', c.turno_fim) order by f.nome)
      from funcionarios f join escalas_config c on c.funcionario_id = f.id
      where f.cliente_id = v_cliente and f.setor is not null and f.cargo is not null and f.admitido_em is not null
        and f.admitido_em <= p_fim and (f.desligado_em is null or f.desligado_em >= p_inicio - 14)), '[]'::jsonb),
    'ausencias', coalesce((
      select jsonb_agg(jsonb_build_object(
        'funcionario_id', o.funcionario_id,
        'tipo', case o.tipo when 'ferias' then 'ferias' when 'restricao' then 'restricao' when 'afastamento' then 'ausencia_prolongada' else 'ausencia' end,
        'inicio', o.inicio, 'fim', o.fim) order by o.inicio, o.id)
      from prontuario_ocorrencias o
      where o.cliente_id = v_cliente and o.fim >= p_inicio - 14 and o.inicio <= p_fim
        and (o.tipo <> 'restricao' or 'sem_escala_longa' = any (o.restricoes))), '[]'::jsonb)
  );
end;
$$;

drop function if exists interno.dados_cozinha_de(uuid);
drop function if exists interno.escala_publica_de(uuid, date, date);
commit;
