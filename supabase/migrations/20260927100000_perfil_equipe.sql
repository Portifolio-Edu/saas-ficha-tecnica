-- PERFIL (2026-09-27): prontuário de competências da equipe.
--  - perfil_funcionario: nível técnico, praças de domínio, pontos fortes,
--    limitações e observação interna do gestor (1 por pessoa);
--  - perfil_notas: notas rápidas de pontualidade, postura, elogio e atenção.
-- As duas só pra dono e gestor (RLS). Nível e habilidades SAEM de
-- funcionarios: aquela tabela a cozinha lê (nomes no tablet), então o que é
-- avaliação da pessoa não pode morar lá. Os valores atuais são copiados.
-- Níveis passam a ser júnior, pleno, sênior e especialista (auxiliar → júnior,
-- chefe → especialista), também no banco de extras.
-- Reverter: supabase/reverter/20260927100000_perfil_equipe.sql

-- 0. Lista de tags válida: até 20 itens, cada um com 1 a 40 caracteres.
create or replace function tags_validas(t text[])
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(cardinality(t), 0) <= 20
     and not exists (select 1 from unnest(t) x where x is null or char_length(btrim(x)) = 0 or char_length(x) > 40)
$$;

-- 1. Perfil de competências -------------------------------------------------------
create table perfil_funcionario (
  funcionario_id uuid primary key,
  cliente_id uuid not null references clientes(id) on delete cascade,
  nivel text check (nivel in ('junior', 'pleno', 'senior', 'especialista')),
  pracas text[] not null default '{}' check (tags_validas(pracas)),
  pontos_fortes text[] not null default '{}' check (tags_validas(pontos_fortes)),
  limitacoes text[] not null default '{}' check (tags_validas(limitacoes)),
  observacoes text check (char_length(observacoes) <= 2000),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid default auth.uid(),
  foreign key (funcionario_id, cliente_id) references funcionarios(id, cliente_id) on delete cascade
);

create or replace function perfil_carimbar()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := auth.uid();
  return new;
end;
$$;
create trigger perfil_funcionario_carimbo before insert or update on perfil_funcionario
  for each row execute function perfil_carimbar();

-- 2. Notas de assiduidade e comportamento -----------------------------------------
create table perfil_notas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  funcionario_id uuid not null,
  data date not null default current_date,
  tipo text not null check (tipo in ('pontualidade', 'postura', 'elogio', 'atencao')),
  texto text not null check (char_length(btrim(texto)) between 1 and 500),
  autor text,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  foreign key (funcionario_id, cliente_id) references funcionarios(id, cliente_id) on delete cascade
);
create index perfil_notas_pessoa_idx on perfil_notas (funcionario_id, data desc);

-- Quem escreveu: nome do membro (ou do dono), gravado pelo banco.
create or replace function perfil_nota_autor()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.criado_por := auth.uid();
  new.autor := coalesce(
    (select m.nome from membros m where m.user_id = auth.uid() and m.cliente_id = new.cliente_id limit 1),
    (select c.nome from clientes c where c.user_id = auth.uid() and c.id = new.cliente_id limit 1)
  );
  return new;
end;
$$;
create trigger perfil_notas_autor before insert on perfil_notas
  for each row execute function perfil_nota_autor();

-- 3. Copia nível e habilidades atuais e tira de funcionarios ----------------------
insert into perfil_funcionario (funcionario_id, cliente_id, nivel, pracas)
select f.id, f.cliente_id,
  case f.nivel when 'auxiliar' then 'junior' when 'chefe' then 'especialista' else f.nivel end,
  coalesce(array(select upper(left(x, 1)) || substr(x, 2) from unnest(f.habilidades) x where btrim(x) <> '' limit 20), '{}')
from funcionarios f
where f.nivel is not null or cardinality(f.habilidades) > 0;

drop function if exists salvar_pessoa_escala(uuid, text, text, text, text, text[], date, date, text, date, smallint[], smallint, time, time);
alter table funcionarios drop column nivel, drop column habilidades;

-- 4. Salvar pessoa + escala (sem nível e habilidades: agora é o perfil) -----------
create or replace function salvar_pessoa_escala(
  p_id uuid,
  p_nome text,
  p_setor text,
  p_cargo text,
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
    insert into funcionarios (cliente_id, nome, setor, cargo, admitido_em, desligado_em)
    values (v_cliente, trim(p_nome), p_setor, trim(p_cargo), p_admissao, p_desligamento)
    returning id into v_id;
  elsif v_longo then
    update funcionarios set nome = trim(p_nome), setor = p_setor, cargo = trim(p_cargo),
      admitido_em = p_admissao, desligado_em = p_desligamento
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
    update funcionarios set nome = trim(p_nome), setor = p_setor, cargo = trim(p_cargo),
      admitido_em = p_admissao, desligado_em = p_desligamento
    where id = v_id and cliente_id = v_cliente;
    if not found then raise exception 'Pessoa não encontrada.'; end if;
  end if;

  return v_id;
end;
$$;
revoke execute on function salvar_pessoa_escala(uuid, text, text, text, date, date, text, date, smallint[], smallint, time, time) from public, anon;
grant execute on function salvar_pessoa_escala(uuid, text, text, text, date, date, text, date, smallint[], smallint, time, time) to authenticated;

-- 5. Banco de extras: níveis novos, praças, telefone normalizado ------------------
alter table banco_extras drop constraint if exists banco_extras_nivel_check;
update banco_extras set nivel = case nivel when 'auxiliar' then 'junior' when 'chefe' then 'especialista' else nivel end;
alter table banco_extras add constraint banco_extras_nivel_check check (nivel in ('junior', 'pleno', 'senior', 'especialista'));
alter table banco_extras rename column habilidades to pracas;
alter table banco_extras
  add constraint banco_extras_pracas_ok check (tags_validas(pracas)),
  add constraint banco_extras_cargos_ok check (cardinality(cargos) between 1 and 10 and tags_validas(cargos)),
  add constraint banco_extras_telefone_ok check (telefone ~ '^[0-9]{12,13}$'),
  add constraint banco_extras_nome_ok check (char_length(btrim(nome)) between 1 and 80),
  add constraint banco_extras_nota_ok check (char_length(nota) <= 500);

alter table perfis_extra drop constraint if exists perfis_extra_nivel_minimo_check;
update perfis_extra set nivel_minimo = case nivel_minimo when 'auxiliar' then 'junior' when 'chefe' then 'especialista' else nivel_minimo end;
alter table perfis_extra add constraint perfis_extra_nivel_minimo_check check (nivel_minimo in ('junior', 'pleno', 'senior', 'especialista'));
alter table perfis_extra rename column habilidades to pracas;

-- 6. Acesso: só dono e gestor ------------------------------------------------------
alter table perfil_funcionario enable row level security;
alter table perfil_notas enable row level security;
create policy perfil_funcionario_gestao on perfil_funcionario for all
  using (cliente_id = auth_cliente_id() and auth_gestao()) with check (cliente_id = auth_cliente_id() and auth_gestao());
create policy perfil_notas_gestao on perfil_notas for all
  using (cliente_id = auth_cliente_id() and auth_gestao()) with check (cliente_id = auth_cliente_id() and auth_gestao());

revoke execute on function perfil_carimbar() from public, anon, authenticated;
revoke execute on function perfil_nota_autor() from public, anon, authenticated;
