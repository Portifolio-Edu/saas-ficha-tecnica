-- AGENTE IA (2026-09-26): o agente do sistema roda no n8n (multimodal: texto,
-- foto, áudio, XML de NF-e; pelo chat do sistema e pelo WhatsApp). O n8n NÃO
-- tem chave do banco: a cada mensagem o app gera um passe assinado (pessoa +
-- restaurante + papel, 15 min) e as ferramentas rodam no app COMO a pessoa,
-- pela mesma RLS das telas. Aqui ficam só as peças de banco:
--
--  1. agente_acoes: o que o agente PROPÕE gravar (entrada de nota, valores
--     nutricionais, pedido de compra, perda, lista de produção). Só vale
--     depois que a pessoa confirma. Quem vê: a própria pessoa e a gestão.
--  2. agente_whatsapp: o WhatsApp de cada pessoa, vinculado por código
--     (a pessoa manda "ATIVAR 123456" pro número do agente — prova que o
--     número é dela). Só número verificado identifica alguém no WhatsApp.
--  3. Balde privado agente-anexos: fotos, áudios, PDFs e XML enviados pelo
--     chat do sistema, na pasta do restaurante; o n8n baixa por link
--     assinado e temporário.
--
-- Reverter: supabase/reverter/20260928170000_agente_ia.sql

-- ---------------------------------------------------------------------------
-- 1. Propostas do agente
create table agente_acoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('entrada_estoque', 'valores_nutricionais', 'pedido_compra', 'perda_estoque', 'lista_producao')),
  resumo text not null check (char_length(resumo) between 1 and 1500),
  dados jsonb not null check (jsonb_typeof(dados) = 'object'),
  canal text not null check (canal in ('web', 'whatsapp')),
  status text not null default 'pendente' check (status in ('pendente', 'confirmada', 'cancelada', 'falhou')),
  resultado text check (resultado is null or char_length(resultado) <= 1500),
  criado_em timestamptz not null default now(),
  decidido_em timestamptz
);
create index agente_acoes_pessoa on agente_acoes (user_id, status, criado_em desc);
create index agente_acoes_cliente on agente_acoes (cliente_id, criado_em desc);

alter table agente_acoes enable row level security;
create policy agente_acoes_leitura on agente_acoes for select to authenticated
  using (cliente_id = interno.auth_cliente_id() and (user_id = auth.uid() or interno.auth_gestao()));
-- Quem usa o agente: dono, gestor e estoquista (o tablet da cozinha, não).
create policy agente_acoes_propor on agente_acoes for insert to authenticated
  with check (cliente_id = interno.auth_cliente_id() and user_id = auth.uid() and interno.auth_papel() in ('dono', 'gestor', 'estoquista'));
-- Confirmar é em dois passos: pendente → confirmada/"aplicando" (trava: um
-- segundo "sim" não aplica de novo) → confirmada com o resultado, ou falhou.
create policy agente_acoes_decidir on agente_acoes for update to authenticated
  using (cliente_id = interno.auth_cliente_id() and user_id = auth.uid()
         and (status = 'pendente' or (status = 'confirmada' and resultado = 'aplicando')))
  with check (cliente_id = interno.auth_cliente_id() and user_id = auth.uid());

revoke all on agente_acoes from anon, authenticated;
grant select on agente_acoes to authenticated;
grant insert (cliente_id, user_id, tipo, resumo, dados, canal) on agente_acoes to authenticated;
grant update (status, resultado) on agente_acoes to authenticated;

-- Pendente só vai pra confirmada/cancelada/falhou, uma vez; a hora é do banco;
-- o conteúdo da proposta não muda depois de criada.
create or replace function interno.agente_acoes_decisao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Fim da aplicação: "aplicando" vira o resultado, ou falhou.
  if old.status = 'confirmada' and old.resultado = 'aplicando' and new.status in ('confirmada', 'falhou') then
    new.tipo := old.tipo;
    new.dados := old.dados;
    new.resumo := old.resumo;
    new.decidido_em := old.decidido_em;
    return new;
  end if;
  if old.status <> 'pendente' then
    raise exception 'Essa proposta já foi decidida.' using errcode = '42501';
  end if;
  if new.status = 'pendente' then
    raise exception 'Decida a proposta: confirmada, cancelada ou falhou.' using errcode = '22023';
  end if;
  new.tipo := old.tipo;
  new.dados := old.dados;
  new.resumo := old.resumo;
  new.decidido_em := now();
  return new;
end;
$$;
create trigger agente_acoes_decisao before update on agente_acoes
  for each row execute function interno.agente_acoes_decisao();
revoke execute on function interno.agente_acoes_decisao() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. WhatsApp de cada pessoa
create table agente_whatsapp (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  telefone text not null check (telefone ~ '^55[0-9]{10,11}$'),
  codigo_hash text check (codigo_hash is null or codigo_hash ~ '^[0-9a-f]{64}$'),
  codigo_expira_em timestamptz,
  verificado_em timestamptz,
  criado_em timestamptz not null default now()
);
-- Um número verificado identifica uma pessoa só.
create unique index agente_whatsapp_numero_verificado on agente_whatsapp (telefone) where verificado_em is not null;

alter table agente_whatsapp enable row level security;
create policy agente_whatsapp_leitura on agente_whatsapp for select to authenticated
  using (cliente_id = interno.auth_cliente_id() and (user_id = auth.uid() or interno.auth_gestao()));
create policy agente_whatsapp_vincular on agente_whatsapp for insert to authenticated
  with check (cliente_id = interno.auth_cliente_id() and user_id = auth.uid() and interno.auth_papel() in ('dono', 'gestor', 'estoquista'));
create policy agente_whatsapp_trocar on agente_whatsapp for update to authenticated
  using (cliente_id = interno.auth_cliente_id() and user_id = auth.uid())
  with check (cliente_id = interno.auth_cliente_id() and user_id = auth.uid());
create policy agente_whatsapp_desvincular on agente_whatsapp for delete to authenticated
  using (cliente_id = interno.auth_cliente_id() and (user_id = auth.uid() or interno.auth_gestao()));

revoke all on agente_whatsapp from anon, authenticated;
grant select (id, cliente_id, user_id, telefone, codigo_expira_em, verificado_em, criado_em) on agente_whatsapp to authenticated;
grant insert (cliente_id, user_id, telefone, codigo_hash, codigo_expira_em) on agente_whatsapp to authenticated;
grant update (telefone, codigo_hash, codigo_expira_em) on agente_whatsapp to authenticated;
grant delete on agente_whatsapp to authenticated;

-- Trocar número ou gerar código novo desfaz a verificação: só o servidor
-- (service role, depois de receber o código pelo WhatsApp) verifica.
create or replace function interno.agente_whatsapp_reverificar()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    if tg_op = 'INSERT' then
      new.verificado_em := null;
    elsif new.telefone is distinct from old.telefone or new.codigo_hash is distinct from old.codigo_hash then
      new.verificado_em := null;
    end if;
  end if;
  return new;
end;
$$;
create trigger agente_whatsapp_reverificar before insert or update on agente_whatsapp
  for each row execute function interno.agente_whatsapp_reverificar();
revoke execute on function interno.agente_whatsapp_reverificar() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Anexos do chat (privado, pasta do restaurante)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'agente-anexos', 'agente-anexos', false, 15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav',
        'application/pdf', 'text/xml', 'application/xml']
)
on conflict (id) do nothing;

create policy agente_anexos_envio on storage.objects for insert to authenticated
  with check (bucket_id = 'agente-anexos' and (storage.foldername(name))[1] = interno.auth_cliente_id()::text
              and interno.auth_papel() in ('dono', 'gestor', 'estoquista'));
create policy agente_anexos_leitura on storage.objects for select to authenticated
  using (bucket_id = 'agente-anexos' and (storage.foldername(name))[1] = interno.auth_cliente_id()::text);
