-- AVISOS NO WHATSAPP (2026-10-02): central de avisos automáticos (n8n).
-- O app decide O QUE avisar (regras em src/lib/automacoes); o n8n só agenda
-- e entrega pela Evolution. O n8n não tem chave do banco: chama
-- /api/automacoes/* com a chave do n8n (x-ft-chave), e o servidor usa a
-- service role só ali.
--
--  - avisos_config: o que cada restaurante quer receber e quando. Sem linha =
--    padrão (tudo ligado, checklist até 11h, resumo às 8h, sem silêncio).
--  - avisos: caixa de saída. A chave única (restaurante, tipo, chave, pessoa)
--    garante que o mesmo aviso nunca sai duas vezes.
--  - reservar_avisos(): entrega os pendentes pro n8n e marca "enviando" num
--    passo só (skip locked), então dois disparos do n8n não mandam em dobro.
--    Até 3 tentativas; travado em "enviando" por 10 min volta pra fila.
--
-- Reverter: supabase/reverter/20261002100000_avisos_whatsapp.sql

create table avisos_config (
  cliente_id uuid primary key references clientes (id) on delete cascade,
  temperatura boolean not null default true,
  checklist_abertura boolean not null default true,
  checklist_abertura_ate time not null default '11:00',
  resumo_diario boolean not null default true,
  resumo_hora time not null default '08:00',
  silencio_inicio time,
  silencio_fim time,
  atualizado_em timestamptz not null default now(),
  constraint avisos_config_silencio_completo check ((silencio_inicio is null) = (silencio_fim is null)),
  constraint avisos_config_silencio_valido check (silencio_inicio is null or silencio_inicio <> silencio_fim)
);

alter table avisos_config enable row level security;
create policy avisos_config_leitura on avisos_config for select to authenticated
  using (cliente_id = interno.auth_cliente_id());
create policy avisos_config_criar on avisos_config for insert to authenticated
  with check (cliente_id = interno.auth_cliente_id() and interno.auth_gestao());
create policy avisos_config_editar on avisos_config for update to authenticated
  using (cliente_id = interno.auth_cliente_id() and interno.auth_gestao())
  with check (cliente_id = interno.auth_cliente_id() and interno.auth_gestao());

revoke all on avisos_config from anon, authenticated;
grant select on avisos_config to authenticated;
grant insert (cliente_id, temperatura, checklist_abertura, checklist_abertura_ate, resumo_diario, resumo_hora, silencio_inicio, silencio_fim)
  on avisos_config to authenticated;
grant update (temperatura, checklist_abertura, checklist_abertura_ate, resumo_diario, resumo_hora, silencio_inicio, silencio_fim)
  on avisos_config to authenticated;

create trigger avisos_config_atualizado_em before update on avisos_config
  for each row execute function interno.carimbar_atualizado_em();

-- ---------------------------------------------------------------------------
create table avisos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete cascade,
  tipo text not null check (tipo in ('temperatura', 'checklist_abertura', 'resumo_diario')),
  chave text not null check (char_length(chave) between 1 and 120),
  user_id uuid not null references auth.users (id) on delete cascade,
  telefone text not null check (telefone ~ '^55[0-9]{10,11}$'),
  texto text not null check (char_length(texto) between 1 and 4000),
  status text not null default 'pendente' check (status in ('pendente', 'enviando', 'enviado', 'falhou')),
  tentativas integer not null default 0 check (tentativas between 0 and 10),
  erro text check (erro is null or char_length(erro) <= 500),
  criado_em timestamptz not null default now(),
  reservado_em timestamptz,
  enviado_em timestamptz,
  constraint avisos_uma_vez unique (cliente_id, tipo, chave, user_id)
);

create index avisos_fila on avisos (criado_em) where status in ('pendente', 'enviando');
create index avisos_historico on avisos (cliente_id, criado_em desc);

-- Gestão vê o histórico do restaurante. Ninguém do app grava: só o servidor.
alter table avisos enable row level security;
create policy avisos_leitura on avisos for select to authenticated
  using (cliente_id = interno.auth_cliente_id() and interno.auth_gestao());
revoke all on avisos from anon, authenticated;
grant select (id, cliente_id, tipo, chave, user_id, texto, status, tentativas, erro, criado_em, enviado_em) on avisos to authenticated;

-- ---------------------------------------------------------------------------
create or replace function public.reservar_avisos(p_limite integer default 50)
returns setof avisos
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Travado em "enviando" sem tentativa sobrando: desiste.
  update avisos set status = 'falhou', erro = coalesce(erro, 'sem resposta do envio')
  where status = 'enviando' and reservado_em < now() - interval '10 minutes' and tentativas >= 3;

  return query
  update avisos a set status = 'enviando', tentativas = a.tentativas + 1, reservado_em = now()
  where a.id in (
    select id from avisos
    where (status = 'pendente' or (status = 'enviando' and reservado_em < now() - interval '10 minutes'))
      and tentativas < 3
    order by criado_em
    limit greatest(1, least(p_limite, 200))
    for update skip locked
  )
  returning a.*;
end;
$$;

revoke execute on function public.reservar_avisos(integer) from public, anon, authenticated;
grant execute on function public.reservar_avisos(integer) to service_role;
