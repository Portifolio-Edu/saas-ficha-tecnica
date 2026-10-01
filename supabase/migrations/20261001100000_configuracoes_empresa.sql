-- CONFIGURAÇÕES (2026-10-01): dados da empresa, marca e perfil de quem usa.
-- Antes a tela Configurações só tinha tema e LGPD; o restaurante tinha só nome,
-- telefone do dono, CNPJ e meta de margem.
--
--  - clientes ganha os dados da empresa que saem em relatório, rótulo de
--    varejo e documentos: razão social, inscrição estadual, contato e endereço.
--  - logo_path: arquivo no balde "marcas" (pasta = id do restaurante).
--  - cor_destaque: cor da marca no sistema (o app só oferece cores com
--    contraste conferido; aqui só o formato).
--  - atualizar_meu_perfil(): cada pessoa troca o próprio nome. Membros não têm
--    policy de escrita (a equipe é gerida pelo servidor), por isso a função.
--
-- Quem edita a empresa: a policy clientes_edicao que já existe (dono e gestor).
-- Plano e status da assinatura continuam fora do alcance do app.
-- Reverter: supabase/reverter/20261001100000_configuracoes_empresa.sql

alter table clientes
  add column razao_social text check (razao_social is null or char_length(razao_social) between 2 and 120),
  add column inscricao_estadual text check (inscricao_estadual is null or inscricao_estadual ~ '^([0-9]{2,14}|ISENTO)$'),
  add column email_contato text check (email_contato is null or (char_length(email_contato) <= 160 and email_contato ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  add column telefone_contato text check (telefone_contato is null or telefone_contato ~ '^[0-9]{12,13}$'),
  add column cep text check (cep is null or cep ~ '^[0-9]{8}$'),
  add column logradouro text check (logradouro is null or char_length(logradouro) <= 120),
  add column numero text check (numero is null or char_length(numero) <= 20),
  add column complemento text check (complemento is null or char_length(complemento) <= 60),
  add column bairro text check (bairro is null or char_length(bairro) <= 60),
  add column cidade text check (cidade is null or char_length(cidade) <= 60),
  add column uf text check (uf is null or uf ~ '^[A-Z]{2}$'),
  add column logo_path text check (logo_path is null or char_length(logo_path) <= 200),
  add column cor_destaque text check (cor_destaque is null or cor_destaque ~ '^#[0-9a-f]{6}$'),
  add column atualizado_em timestamptz not null default now();

-- CNPJ só com dígitos (o app formata). Não havia nenhum cadastrado.
alter table clientes add constraint clientes_cnpj_digitos check (cnpj is null or cnpj ~ '^[0-9]{14}$');

-- O logo tem que estar na pasta do próprio restaurante.
alter table clientes add constraint clientes_logo_na_pasta check (logo_path is null or logo_path like id::text || '/%');

create or replace function interno.carimbar_atualizado_em()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;
create trigger clientes_atualizado_em before update on clientes
  for each row execute function interno.carimbar_atualizado_em();

grant update (razao_social, inscricao_estadual, email_contato, telefone_contato, cep, logradouro, numero, complemento,
              bairro, cidade, uf, logo_path, cor_destaque)
  on clientes to authenticated;

-- ---------------------------------------------------------------------------
-- Balde do logo: público (vai no menu e no PDF), só imagem, até 2 MB. SVG fica
-- de fora (pode carregar script). Escrita só pela gestão, na pasta da casa.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marcas', 'marcas', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy marcas_leitura_publica on storage.objects
  for select
  using (bucket_id = 'marcas');

create policy marcas_escrita_gestao on storage.objects
  for insert
  with check (bucket_id = 'marcas' and (storage.foldername(name))[1] = interno.auth_cliente_id()::text and interno.auth_gestao());

create policy marcas_troca_gestao on storage.objects
  for update
  using (bucket_id = 'marcas' and (storage.foldername(name))[1] = interno.auth_cliente_id()::text and interno.auth_gestao());

create policy marcas_remocao_gestao on storage.objects
  for delete
  using (bucket_id = 'marcas' and (storage.foldername(name))[1] = interno.auth_cliente_id()::text and interno.auth_gestao());

-- ---------------------------------------------------------------------------
-- Meu nome. Vale pra qualquer papel com login; o dono também atualiza o nome
-- do cadastro do restaurante (clientes.nome), que é o mesmo.
create or replace function public.atualizar_meu_perfil(p_nome text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := btrim(coalesce(p_nome, ''));
  v_papel text;
  v_cliente uuid;
begin
  if auth.uid() is null then
    raise exception 'sem sessão' using errcode = '42501';
  end if;
  if char_length(v_nome) < 2 or char_length(v_nome) > 80 then
    raise exception 'O nome precisa ter entre 2 e 80 caracteres.' using errcode = '22023';
  end if;

  update membros set nome = v_nome
  where user_id = auth.uid() and ativo
  returning papel, cliente_id into v_papel, v_cliente;

  if v_papel is null then
    raise exception 'sem acesso' using errcode = '42501';
  end if;
  if v_papel = 'dono' then
    update clientes set nome = v_nome where id = v_cliente and user_id = auth.uid();
  end if;
end;
$$;

revoke execute on function public.atualizar_meu_perfil(text) from public, anon;
grant execute on function public.atualizar_meu_perfil(text) to authenticated;
