-- PLANO 9,5, etapa 3 (2026-09-26): monitoramento de erros de produção.
-- Antes, erro no servidor só ficava no log da Vercel (some em dias e ninguém
-- é avisado). Agora cada erro vira uma linha aqui (src/lib/monitoramento.ts):
-- do servidor (instrumentation.ts → onRequestError) e da tela de erro no
-- navegador (só de quem está logado). Só a service role lê e grava; o n8n
-- (etapa 5) consulta pra avisar no WhatsApp/Telegram.
-- Guarda 90 dias (limpeza a cada gravação, barata pelo índice).
-- Reverter: supabase/reverter/20260928120000_erros_sistema.sql

create table public.erros_sistema (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  origem text not null check (origem in ('servidor', 'navegador')),
  rota text check (length(rota) <= 300),
  metodo text check (length(metodo) <= 10),
  digest text check (length(digest) <= 100),
  mensagem text not null check (length(mensagem) <= 1000),
  detalhe text check (length(detalhe) <= 8000),
  user_id uuid,
  cliente_id uuid,
  ambiente text check (length(ambiente) <= 40)
);
create index erros_sistema_criado_em on public.erros_sistema (criado_em desc);

alter table public.erros_sistema enable row level security;
revoke all on public.erros_sistema from public, anon, authenticated;
grant select, insert, delete on public.erros_sistema to service_role;

create or replace function interno.limpar_erros_antigos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from erros_sistema where criado_em < now() - interval '90 days';
  return null;
end;
$$;

create trigger erros_sistema_limpeza after insert on public.erros_sistema
  for each statement execute function interno.limpar_erros_antigos();
