-- Reverte 20260927100000_perfil_equipe. Devolve nível e habilidades pra
-- funcionarios (níveis novos voltam: júnior → junior, especialista → chefe),
-- volta a assinatura antiga de salvar_pessoa_escala e apaga o prontuário de
-- competências e as notas. Atenção: pontos fortes, limitações, observações e
-- notas são perdidos.
begin;
alter table funcionarios
  add column if not exists nivel text check (nivel in ('auxiliar', 'junior', 'pleno', 'senior', 'chefe')),
  add column if not exists habilidades text[] not null default '{}';
update funcionarios f set
  nivel = case p.nivel when 'especialista' then 'chefe' else p.nivel end,
  habilidades = array(select lower(x) from unnest(p.pracas) x)
from perfil_funcionario p where p.funcionario_id = f.id;

drop function if exists salvar_pessoa_escala(uuid, text, text, text, date, date, text, date, smallint[], smallint, time, time);
create or replace function salvar_pessoa_escala(
  p_id uuid,
  p_nome text,
  p_setor text,
  p_cargo text,
  p_nivel text,
  p_habilidades text[],
  p_admissao date,
  p_desligamento date,
  p_tipo text,
  p_ancora date,
  p_folgas smallint[],
  p_intervalo smallint,
  p_turno_inicio time,
  p_turno_fim time
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cliente uuid := auth_cliente_id();
  v_id uuid := p_id;
  v_longo boolean := p_tipo in ('12x36', '24x48');
begin
  if v_cliente is null or not auth_gestao() then
    raise exception 'Só o dono e o gestor mexem na escala.';
  end if;

  if v_id is null then
    insert into funcionarios (cliente_id, nome, setor, cargo, nivel, habilidades, admitido_em, desligado_em)
    values (v_cliente, trim(p_nome), p_setor, trim(p_cargo), p_nivel, coalesce(p_habilidades, '{}'), p_admissao, p_desligamento)
    returning id into v_id;
  elsif v_longo then
    update funcionarios set nome = trim(p_nome), setor = p_setor, cargo = trim(p_cargo), nivel = p_nivel,
      habilidades = coalesce(p_habilidades, '{}'), admitido_em = p_admissao, desligado_em = p_desligamento
    where id = v_id and cliente_id = v_cliente;
    if not found then raise exception 'Pessoa não encontrada.'; end if;
  end if;

  insert into escalas_config (cliente_id, funcionario_id, tipo, ancora, folgas_preferidas, intervalo_domingo_semanas, turno_inicio, turno_fim)
  values (v_cliente, v_id, p_tipo, p_ancora, coalesce(p_folgas, '{}'), p_intervalo, p_turno_inicio, p_turno_fim)
  on conflict (funcionario_id) do update set
    tipo = excluded.tipo, ancora = excluded.ancora, folgas_preferidas = excluded.folgas_preferidas,
    intervalo_domingo_semanas = excluded.intervalo_domingo_semanas,
    turno_inicio = excluded.turno_inicio, turno_fim = excluded.turno_fim;

  if p_id is not null and not v_longo then
    update funcionarios set nome = trim(p_nome), setor = p_setor, cargo = trim(p_cargo), nivel = p_nivel,
      habilidades = coalesce(p_habilidades, '{}'), admitido_em = p_admissao, desligado_em = p_desligamento
    where id = v_id and cliente_id = v_cliente;
    if not found then raise exception 'Pessoa não encontrada.'; end if;
  end if;

  return v_id;
end;
$$;
revoke execute on function salvar_pessoa_escala(uuid, text, text, text, text, text[], date, date, text, date, smallint[], smallint, time, time) from public, anon;
grant execute on function salvar_pessoa_escala(uuid, text, text, text, text, text[], date, date, text, date, smallint[], smallint, time, time) to authenticated;

alter table perfis_extra rename column pracas to habilidades;
alter table perfis_extra drop constraint if exists perfis_extra_nivel_minimo_check;
update perfis_extra set nivel_minimo = case nivel_minimo when 'especialista' then 'chefe' else nivel_minimo end;
alter table perfis_extra add constraint perfis_extra_nivel_minimo_check check (nivel_minimo in ('auxiliar', 'junior', 'pleno', 'senior', 'chefe'));

alter table banco_extras
  drop constraint if exists banco_extras_pracas_ok, drop constraint if exists banco_extras_cargos_ok,
  drop constraint if exists banco_extras_telefone_ok, drop constraint if exists banco_extras_nome_ok,
  drop constraint if exists banco_extras_nota_ok, drop constraint if exists banco_extras_nivel_check;
alter table banco_extras rename column pracas to habilidades;
update banco_extras set nivel = case nivel when 'especialista' then 'chefe' else nivel end;
alter table banco_extras add constraint banco_extras_nivel_check check (nivel in ('auxiliar', 'junior', 'pleno', 'senior', 'chefe'));

drop table if exists perfil_notas, perfil_funcionario;
drop function if exists perfil_nota_autor();
drop function if exists perfil_carimbar();
drop function if exists tags_validas(text[]);
commit;
