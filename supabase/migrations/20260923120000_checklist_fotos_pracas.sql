-- POLIMENTO checklists-pracas (2026-09-22): fotos de referência da praça montada.
-- Uma praça é um checklist com momento = 'praca' (já existia no schema); os itens
-- dela são "tudo que precisa estar na praça pra ela ficar completa". Cada praça
-- pode ter várias fotos, uma por elemento (bancada, geladeira de apoio, forno),
-- descrito na legenda. Objetivo: a casa mantém a mesma organização mesmo se a
-- equipe inteira mudar.
--
-- Reverter: drop table checklist_fotos; apagar as policies pracas_fotos_* e o
-- bucket 'pracas-fotos' (delete from storage.buckets where id = 'pracas-fotos',
-- depois de esvaziar os objetos).

create table checklist_fotos (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references checklists(id) on delete cascade,
  url text not null,
  -- caminho do objeto no bucket, pra apagar o arquivo junto com a linha
  caminho text not null,
  legenda text,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);

create index checklist_fotos_checklist_id_idx on checklist_fotos(checklist_id);

alter table checklist_fotos enable row level security;

create policy checklist_fotos_tenant on checklist_fotos
  for all
  using (exists (select 1 from checklists c where c.id = checklist_id and c.cliente_id = auth_cliente_id()))
  with check (exists (select 1 from checklists c where c.id = checklist_id and c.cliente_id = auth_cliente_id()));

-- Mesma convenção do bucket receitas-fotos: leitura pública (caminho com UUID,
-- foto de bancada não é dado sensível e evita renovar signed URL), escrita só na
-- pasta do próprio cliente (1º segmento do caminho = cliente_id).
insert into storage.buckets (id, name, public)
values ('pracas-fotos', 'pracas-fotos', true)
on conflict (id) do nothing;

create policy pracas_fotos_leitura_publica on storage.objects
  for select
  using (bucket_id = 'pracas-fotos');

create policy pracas_fotos_escrita_tenant on storage.objects
  for insert
  with check (bucket_id = 'pracas-fotos' and (storage.foldername(name))[1] = auth_cliente_id()::text);

create policy pracas_fotos_delete_tenant on storage.objects
  for delete
  using (bucket_id = 'pracas-fotos' and (storage.foldername(name))[1] = auth_cliente_id()::text);
