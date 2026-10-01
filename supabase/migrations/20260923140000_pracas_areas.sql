-- POLIMENTO pracas-areas (2026-09-23): cada praça é dividida em áreas (pista fria,
-- bancada de montagem, geladeira de apoio, pista quente...), com o nome que o
-- cliente quiser. Cada área tem as próprias fotos de referência e a própria lista
-- do que precisa estar lá. Item ou foto sem área aparece em "Geral".
-- Depende de 20260923120000_checklist_fotos_pracas.sql.
--
-- Reverter:
--   alter table checklist_itens drop column area_id;
--   alter table checklist_fotos drop column area_id;
--   drop table checklist_areas;

create table checklist_areas (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references checklists(id) on delete cascade,
  nome text not null,
  ordem integer not null default 0
);

create index checklist_areas_checklist_id_idx on checklist_areas(checklist_id);

alter table checklist_areas enable row level security;

create policy checklist_areas_tenant on checklist_areas
  for all
  using (exists (select 1 from checklists c where c.id = checklist_id and c.cliente_id = auth_cliente_id()))
  with check (exists (select 1 from checklists c where c.id = checklist_id and c.cliente_id = auth_cliente_id()));

-- Apagar a área apaga os itens e as fotos dela (o arquivo no bucket é removido
-- pela aplicação antes, em removerAreaChecklist).
alter table checklist_itens add column area_id uuid references checklist_areas(id) on delete cascade;
alter table checklist_fotos add column area_id uuid references checklist_areas(id) on delete cascade;

create index checklist_itens_area_id_idx on checklist_itens(area_id);
create index checklist_fotos_area_id_idx on checklist_fotos(area_id);
