-- ESCALAS (2026-09-26): módulo de escalas e contingência — banco.
-- Motor de cálculo: src/lib/escalas (puro, testado). Aqui ficam os cadastros
-- e as travas que não podem depender da tela:
--  - cozinha, salão e bar só em 5x2/6x1 (12x36 e 24x48 fariam folga cair na
--    sexta ou no sábado) — trigger nas duas pontas (escala e setor);
--  - folga fixa só de segunda a quinta (check);
--  - escala, prontuário e extras só pra dono/gestor (RLS);
--  - o tablet da cozinha VÊ a escala por escala_publica(): quem trabalha e
--    quando, férias e "ausente" — nunca o motivo (falta, atestado, nota).
-- Prontuário guarda o efeito na escala, nunca diagnóstico/CID (LGPD).
-- Reverter: supabase/reverter/20260926100000_escalas.sql

-- 1. Funcionários (tabela já existe: nomes do tablet) --------------------------
alter table funcionarios
  add column if not exists setor text check (setor in ('cozinha', 'salao', 'bar', 'outro')),
  add column if not exists cargo text check (char_length(cargo) between 1 and 40),
  add column if not exists nivel text check (nivel in ('auxiliar', 'junior', 'pleno', 'senior', 'chefe')),
  add column if not exists habilidades text[] not null default '{}',
  add column if not exists admitido_em date,
  add column if not exists desligado_em date;
alter table funcionarios add constraint funcionarios_datas_ok
  check (desligado_em is null or admitido_em is null or desligado_em >= admitido_em);
alter table funcionarios add constraint funcionarios_id_cliente_uk unique (id, cliente_id);

-- 2. Regras do restaurante -----------------------------------------------------
-- Sexta/sábado protegidos, folga seg–qui e máximo de 6 dias seguidos NÃO são
-- configuráveis: estão fixos no motor.
create table escalas_regras (
  cliente_id uuid primary key references clientes(id) on delete cascade,
  intervalo_domingo_semanas smallint not null default 3 check (intervalo_domingo_semanas between 1 and 7),
  cobertura_minima jsonb not null default '{}' check (jsonb_typeof(cobertura_minima) = 'object'),
  atualizado_em timestamptz not null default now()
);

-- 3. Escala de cada funcionário --------------------------------------------------
create table escalas_config (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null,
  funcionario_id uuid not null unique,
  tipo text not null check (tipo in ('5x2', '6x1', '12x36', '24x48')),
  ancora date not null,
  folgas_preferidas smallint[] not null default '{}' check (folgas_preferidas <@ '{1,2,3,4}' and cardinality(folgas_preferidas) <= 2),
  intervalo_domingo_semanas smallint check (intervalo_domingo_semanas between 1 and 7),
  turno_inicio time,
  turno_fim time,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check ((turno_inicio is null) = (turno_fim is null)),
  foreign key (funcionario_id, cliente_id) references funcionarios(id, cliente_id) on delete cascade
);

create or replace function validar_escala_config()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_setor text;
  n int := cardinality(new.folgas_preferidas);
begin
  select setor into v_setor from funcionarios where id = new.funcionario_id;
  if v_setor in ('cozinha', 'salao', 'bar') and new.tipo in ('12x36', '24x48') then
    raise exception 'Cozinha, salão e bar só trabalham em 5x2 ou 6x1: em 12x36 e 24x48 a folga cairia na sexta ou no sábado.';
  end if;
  if new.tipo in ('12x36', '24x48') and n > 0 then
    raise exception '12x36 e 24x48 não têm folga fixa: os dias alternam.';
  end if;
  if (new.tipo = '5x2' and n not in (0, 2)) or (new.tipo = '6x1' and n not in (0, 1)) then
    raise exception 'Número de folgas não bate com o regime.';
  end if;
  if (select count(distinct x) from unnest(new.folgas_preferidas) x) <> n then
    raise exception 'Escolha dias de folga diferentes.';
  end if;
  new.atualizado_em := now();
  return new;
end;
$$;
create trigger escalas_config_validar before insert or update on escalas_config
  for each row execute function validar_escala_config();

create or replace function validar_setor_funcionario()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.setor in ('cozinha', 'salao', 'bar')
     and exists (select 1 from escalas_config where funcionario_id = new.id and tipo in ('12x36', '24x48')) then
    raise exception 'Essa pessoa está em 12x36/24x48: troque o regime pra 5x2 ou 6x1 antes de mudar o setor pra cozinha, salão ou bar.';
  end if;
  return new;
end;
$$;
create trigger funcionarios_validar_setor before update of setor on funcionarios
  for each row execute function validar_setor_funcionario();

-- 4. Prontuário de ocorrências -----------------------------------------------------
create table prontuario_ocorrencias (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null,
  funcionario_id uuid not null,
  tipo text not null check (tipo in ('falta', 'atestado', 'afastamento', 'ferias', 'restricao')),
  inicio date not null,
  fim date not null,
  restricoes text[] not null default '{}' check (restricoes <@ '{sem_escala_longa,sem_noturno,sem_carga_pesada}'),
  nota text check (char_length(nota) <= 500),
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  check (fim >= inicio and fim - inicio <= 366),
  check ((tipo = 'restricao') = (cardinality(restricoes) > 0)),
  foreign key (funcionario_id, cliente_id) references funcionarios(id, cliente_id) on delete cascade
);
create index prontuario_cliente_periodo_idx on prontuario_ocorrencias (cliente_id, inicio, fim);

-- 5. Banco de extras (usado na fase 3: contingência) -------------------------------
create table banco_extras (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  nome text not null,
  telefone text not null,
  setor text not null check (setor in ('cozinha', 'salao', 'bar', 'outro')),
  cargos text[] not null default '{}',
  nivel text check (nivel in ('auxiliar', 'junior', 'pleno', 'senior', 'chefe')),
  habilidades text[] not null default '{}',
  aceita_whatsapp boolean not null default false,
  consentimento_em timestamptz,
  ativo boolean not null default true,
  nota text,
  criado_em timestamptz not null default now(),
  check (not aceita_whatsapp or consentimento_em is not null)
);
create index banco_extras_busca_idx on banco_extras (cliente_id, setor) where ativo;

-- 6. Perfil ideal de extra por praça e turno (fase 3, cenário B) -------------------
create table perfis_extra (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  setor text not null check (setor in ('cozinha', 'salao', 'bar', 'outro')),
  cargo text not null,
  turno text not null check (turno in ('almoco', 'jantar', 'dia_todo')),
  nivel_minimo text check (nivel_minimo in ('auxiliar', 'junior', 'pleno', 'senior', 'chefe')),
  habilidades text[] not null default '{}',
  quantidade smallint not null default 1 check (quantidade between 1 and 20),
  unique (cliente_id, setor, cargo, turno)
);

-- 7. Acesso: só dono e gestor ------------------------------------------------------
alter table escalas_regras enable row level security;
alter table escalas_config enable row level security;
alter table prontuario_ocorrencias enable row level security;
alter table banco_extras enable row level security;
alter table perfis_extra enable row level security;

create policy escalas_regras_gestao on escalas_regras for all
  using (cliente_id = auth_cliente_id() and auth_gestao()) with check (cliente_id = auth_cliente_id() and auth_gestao());
create policy escalas_config_gestao on escalas_config for all
  using (cliente_id = auth_cliente_id() and auth_gestao()) with check (cliente_id = auth_cliente_id() and auth_gestao());
create policy prontuario_gestao on prontuario_ocorrencias for all
  using (cliente_id = auth_cliente_id() and auth_gestao()) with check (cliente_id = auth_cliente_id() and auth_gestao());
create policy banco_extras_gestao on banco_extras for all
  using (cliente_id = auth_cliente_id() and auth_gestao()) with check (cliente_id = auth_cliente_id() and auth_gestao());
create policy perfis_extra_gestao on perfis_extra for all
  using (cliente_id = auth_cliente_id() and auth_gestao()) with check (cliente_id = auth_cliente_id() and auth_gestao());

-- 8. Escala pro tablet da cozinha (só leitura, sem motivo de ausência) ------------
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
    -- Falta, atestado e afastamento viram "ausencia". Restrição só vai quando
    -- muda a escala (sem_escala_longa), e sem dizer qual é o motivo.
    'ausencias', coalesce((
      select jsonb_agg(jsonb_build_object(
        'funcionario_id', o.funcionario_id,
        'tipo', case o.tipo when 'ferias' then 'ferias' when 'restricao' then 'restricao' else 'ausencia' end,
        'inicio', o.inicio, 'fim', o.fim
      ))
      from prontuario_ocorrencias o
      where o.cliente_id = v_cliente
        and o.fim >= p_inicio - 14 and o.inicio <= p_fim
        and (o.tipo <> 'restricao' or 'sem_escala_longa' = any (o.restricoes))
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function escala_publica(date, date) from public, anon;
grant execute on function escala_publica(date, date) to authenticated;
revoke execute on function validar_escala_config() from public, anon, authenticated;
revoke execute on function validar_setor_funcionario() from public, anon, authenticated;
