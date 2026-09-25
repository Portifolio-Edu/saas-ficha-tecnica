-- PROPOSTA (2026-09-26) — Fase 1 do módulo de escalas e contingência.
-- AINDA NÃO APLICADA. Fica em supabase/propostas/ até o dono validar; depois
-- vai pra supabase/migrations/ e é aplicada. Reverter:
-- supabase/propostas/20260926100000_escalas_reverter.sql
--
-- Decisões:
--  - `funcionarios` já existe (nomes do tablet da cozinha). É ampliada, não
--    recriada: setor, cargo, nível, habilidades, admissão e desligamento.
--  - Tudo o que é escala, prontuário e extras é só da gestão (dono/gestor).
--    Estoquista e cozinha não leem.
--  - Prontuário guarda o EFEITO na escala (falta, atestado, afastamento,
--    restrição "sem escala longa"...), nunca diagnóstico/CID: dado de saúde é
--    sensível na LGPD e o motor não precisa dele.
--  - Extras: telefone só com consentimento registrado pra receber WhatsApp.
--  - Chave composta (funcionario_id, cliente_id) garante que ninguém ligue a
--    escala de um restaurante ao funcionário de outro.

begin;

-- 1. Funcionários ------------------------------------------------------------
alter table funcionarios
  add column if not exists setor text check (setor in ('cozinha', 'salao', 'bar', 'outro')),
  add column if not exists cargo text,
  add column if not exists nivel text check (nivel in ('auxiliar', 'junior', 'pleno', 'senior', 'chefe')),
  add column if not exists habilidades text[] not null default '{}',
  add column if not exists admitido_em date,
  add column if not exists desligado_em date,
  add constraint funcionarios_datas_ok check (desligado_em is null or admitido_em is null or desligado_em >= admitido_em);
alter table funcionarios add constraint funcionarios_id_cliente_uk unique (id, cliente_id);

-- 2. Regras do restaurante (uma linha por cliente) ---------------------------
create table escalas_regras (
  cliente_id uuid primary key references clientes(id) on delete cascade,
  dias_protegidos smallint[] not null default '{5,6}',          -- sexta, sábado
  dias_folga_permitidos smallint[] not null default '{1,2,3,4}', -- seg a qui
  intervalo_domingo_semanas smallint not null default 3 check (intervalo_domingo_semanas between 1 and 7),
  max_dias_seguidos smallint not null default 6 check (max_dias_seguidos between 1 and 6),
  cobertura_minima jsonb not null default '{}',                  -- {"cozinha:Sushiman": 2}
  atualizado_em timestamptz not null default now(),
  check (dias_protegidos <@ '{0,1,2,3,4,5,6}' and dias_folga_permitidos <@ '{0,1,2,3,4,5,6}')
);

-- 3. Escala de cada funcionário -----------------------------------------------
create table escalas_config (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null,
  funcionario_id uuid not null,
  tipo text not null check (tipo in ('5x2', '6x1', '12x36', '24x48')),
  ancora date not null,
  folgas_preferidas smallint[] not null default '{}' check (folgas_preferidas <@ '{0,1,2,3,4,5,6}'),
  intervalo_domingo_semanas smallint check (intervalo_domingo_semanas between 1 and 7),
  turno_inicio time,
  turno_fim time,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (funcionario_id),
  foreign key (funcionario_id, cliente_id) references funcionarios(id, cliente_id) on delete cascade
);

-- 4. Prontuário de ocorrências -------------------------------------------------
create table prontuario_ocorrencias (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null,
  funcionario_id uuid not null,
  tipo text not null check (tipo in ('falta', 'atestado', 'afastamento', 'ferias', 'restricao', 'nota')),
  inicio date not null,
  fim date not null,
  restricoes text[] not null default '{}' check (restricoes <@ '{sem_escala_longa,sem_noturno,sem_carga_pesada}'),
  nota text,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  check (fim >= inicio),
  foreign key (funcionario_id, cliente_id) references funcionarios(id, cliente_id) on delete cascade
);
create index prontuario_funcionario_periodo_idx on prontuario_ocorrencias (funcionario_id, inicio, fim);

-- 5. Banco de extras -----------------------------------------------------------
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
  consentimento_em timestamptz,          -- quando aceitou receber vagas (LGPD)
  ativo boolean not null default true,
  nota text,
  criado_em timestamptz not null default now(),
  check (not aceita_whatsapp or consentimento_em is not null)
);
create index banco_extras_busca_idx on banco_extras (cliente_id, setor) where ativo;

-- 6. Perfil ideal de extra por praça e turno (cenário B: reforço) -------------
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

-- 7. Acesso: só dono e gestor --------------------------------------------------
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

commit;
