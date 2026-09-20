-- Passo a passo de produção da receita (foto de padronização do prato +
-- etapas numeradas com foto opcional cada), pra "Ver ficha de produção" na
-- tela de Receitas. Mesma convenção multi-linha de receita_insumos: uma
-- linha por etapa, ordem definida pela posição no array (recriada por
-- inteiro a cada salvamento, delete-then-reinsert).
create table receita_etapas (
  id uuid primary key default gen_random_uuid(),
  receita_id uuid not null references receitas(id) on delete cascade,
  ordem integer not null,
  titulo text,
  texto text,
  foto_url text,
  unique(receita_id, ordem)
);

create index receita_etapas_receita_id_idx on receita_etapas(receita_id);

alter table receita_etapas enable row level security;

create policy receita_etapas_tenant on receita_etapas
  for all
  using (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()))
  with check (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()));

-- Bucket de fotos de receitas (foto principal do prato + foto de cada
-- etapa). Público pra leitura (fotos não são dado sensível e isso evita
-- lidar com refresh de signed URL só pra exibir a imagem), mas a escrita é
-- restrita ao próprio cliente: o primeiro segmento do caminho do objeto
-- precisa ser o cliente_id de quem está enviando.
insert into storage.buckets (id, name, public)
values ('receitas-fotos', 'receitas-fotos', true)
on conflict (id) do nothing;

create policy receitas_fotos_leitura_publica on storage.objects
  for select
  using (bucket_id = 'receitas-fotos');

create policy receitas_fotos_escrita_tenant on storage.objects
  for insert
  with check (bucket_id = 'receitas-fotos' and (storage.foldername(name))[1] = auth_cliente_id()::text);

create policy receitas_fotos_atualizacao_tenant on storage.objects
  for update
  using (bucket_id = 'receitas-fotos' and (storage.foldername(name))[1] = auth_cliente_id()::text)
  with check (bucket_id = 'receitas-fotos' and (storage.foldername(name))[1] = auth_cliente_id()::text);

create policy receitas_fotos_delete_tenant on storage.objects
  for delete
  using (bucket_id = 'receitas-fotos' and (storage.foldername(name))[1] = auth_cliente_id()::text);
