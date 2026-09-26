-- EQUIPE E PAPÉIS (2026-09-25)
--
-- Antes: um login por restaurante (clientes.user_id), que via tudo. Agora o
-- restaurante tem equipe, e cada pessoa tem um papel:
--
--   dono        tudo, inclusive equipe (cria gestor) e assinatura
--   gestor      tudo da operação: custos, margem, faturamento, relatórios, CMV
--   estoquista  compras e estoque (insumos, fornecedores, movimentações,
--               proteínas) e o CMV do lado do estoque, SEM faturamento,
--               margem, receitas com preço, canais nem relatórios
--   cozinha     aparelho da cozinha, sem senha: checklists, temperaturas,
--               produção/perda, fichas SEM custo e contagem cega de estoque
--
-- O bloqueio é aqui, na RLS, e não só no menu: quem tentar ler a tabela pela
-- API com a sessão da cozinha recebe zero linhas. O que a cozinha precisa ver
-- de tabelas sensíveis (ficha sem preço, lista de itens pra contar) sai por
-- funções security definer que devolvem só as colunas seguras.
--
-- Onde mexer: helpers auth_papel/auth_gestao/auth_estoque logo abaixo; a
-- matriz de acesso é a seção "policies". Teste: supabase/testes/papeis.sql.
-- Reverter: supabase/reverter/20260925120000_equipe_papeis.sql (recria as
-- policies *_tenant de antes e apaga as tabelas novas).

-- =========================================================================
-- membros (quem entra, em qual restaurante, com qual papel)
-- =========================================================================

create table membros (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  papel text not null check (papel in ('dono', 'gestor', 'estoquista', 'cozinha')),
  nome text not null,
  -- login sem e-mail (gestor/estoquista criados na tela Equipe). O e-mail
  -- técnico do Supabase Auth é derivado dele no app (src/lib/auth/equipe.ts).
  usuario text unique check (usuario is null or usuario ~ '^[a-z0-9][a-z0-9._-]{2,31}$'),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create index membros_cliente_id_idx on membros(cliente_id);

alter table membros enable row level security;

-- Todo dono atual vira membro.
insert into membros (cliente_id, user_id, papel, nome)
select id, user_id, 'dono', nome from clientes
on conflict (user_id) do nothing;

-- Cadastro novo (insert em clientes pelo próprio usuário) já cria o dono.
create or replace function criar_membro_dono()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into membros (cliente_id, user_id, papel, nome)
  values (new.id, new.user_id, 'dono', new.nome)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger clientes_cria_dono
  after insert on clientes
  for each row execute function criar_membro_dono();

revoke execute on function criar_membro_dono() from public, anon, authenticated;

-- =========================================================================
-- helpers usados pelas policies
-- =========================================================================

-- Agora resolve pelo membro (não mais por clientes.user_id). Membro
-- desativado some na hora: todas as policies passam a devolver zero linhas.
create or replace function auth_cliente_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select cliente_id from membros where user_id = auth.uid() and ativo
$$;

create or replace function auth_papel()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select papel from membros where user_id = auth.uid() and ativo
$$;

create or replace function auth_gestao()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(auth_papel() in ('dono', 'gestor'), false)
$$;

create or replace function auth_estoque()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(auth_papel() in ('dono', 'gestor', 'estoquista'), false)
$$;

-- anon também precisa: as policies são avaliadas pra visitante (e devolvem
-- null/false). Mesmo motivo de 20260924130000.
revoke execute on function auth_papel() from public;
revoke execute on function auth_gestao() from public;
revoke execute on function auth_estoque() from public;
grant execute on function auth_papel() to anon, authenticated;
grant execute on function auth_gestao() to anon, authenticated;
grant execute on function auth_estoque() to anon, authenticated;

create policy membros_leitura on membros
  for select
  using (cliente_id = auth_cliente_id() and (auth_gestao() or user_id = auth.uid()));
-- Sem policy de escrita: criar, desativar e trocar papel passa pelo servidor
-- (service role, src/app/equipe/actions.ts), que confere o papel de quem pede
-- e também bane a sessão no Supabase Auth.

-- =========================================================================
-- tabelas novas: nomes da cozinha, pareamento de aparelho, contagem cega
-- =========================================================================

-- Quem trabalha na cozinha, sem login: aparece na lista "quem está fazendo"
-- do modo cozinha e fica gravado em responsavel.
create table funcionarios (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  nome text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create index funcionarios_cliente_id_idx on funcionarios(cliente_id);
alter table funcionarios enable row level security;

create policy funcionarios_leitura on funcionarios
  for select using (cliente_id = auth_cliente_id());
create policy funcionarios_escrita on funcionarios
  for insert with check (cliente_id = auth_cliente_id() and auth_gestao());
create policy funcionarios_edicao on funcionarios
  for update using (cliente_id = auth_cliente_id() and auth_gestao())
  with check (cliente_id = auth_cliente_id() and auth_gestao());
create policy funcionarios_remocao on funcionarios
  for delete using (cliente_id = auth_cliente_id() and auth_gestao());

-- Código de uso único pra ligar um tablet/celular ao modo cozinha. Guarda só
-- o hash; quem consome é o servidor (service role).
create table pareamentos_cozinha (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  codigo_hash text not null unique,
  expira_em timestamptz not null,
  usado_em timestamptz,
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now()
);

create index pareamentos_cozinha_cliente_id_idx on pareamentos_cozinha(cliente_id);
alter table pareamentos_cozinha enable row level security;

create policy pareamentos_cozinha_gestao on pareamentos_cozinha
  for all using (cliente_id = auth_cliente_id() and auth_gestao())
  with check (cliente_id = auth_cliente_id() and auth_gestao());

-- Contagem cega: quem conta não vê o saldo do sistema. O saldo da hora é
-- guardado junto (saldo_sistema) e só a gestão enxerga a diferença.
create table contagens_estoque (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  responsavel text not null,
  feita_por uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  aplicada_em timestamptz,
  aplicada_por uuid
);

create table contagem_itens (
  id uuid primary key default gen_random_uuid(),
  contagem_id uuid not null references contagens_estoque(id) on delete cascade,
  insumo_id uuid not null references insumos(id) on delete cascade,
  quantidade_contada numeric not null check (quantidade_contada >= 0),
  saldo_sistema numeric not null
);

create index contagens_estoque_cliente_id_idx on contagens_estoque(cliente_id);
create index contagem_itens_contagem_id_idx on contagem_itens(contagem_id);
alter table contagens_estoque enable row level security;
alter table contagem_itens enable row level security;

-- Sem policy de insert: a contagem entra só por enviar_contagem().
create policy contagens_estoque_gestao on contagens_estoque
  for select using (cliente_id = auth_cliente_id() and auth_gestao());
create policy contagens_estoque_aplicar on contagens_estoque
  for update using (cliente_id = auth_cliente_id() and auth_gestao())
  with check (cliente_id = auth_cliente_id() and auth_gestao());
create policy contagens_estoque_remover on contagens_estoque
  for delete using (cliente_id = auth_cliente_id() and auth_gestao());
create policy contagem_itens_gestao on contagem_itens
  for select using (exists (
    select 1 from contagens_estoque c where c.id = contagem_id and c.cliente_id = auth_cliente_id()
  ) and auth_gestao());

-- Auditoria: qual login fez cada registro (aparelho da cozinha, estoquista...).
alter table producoes add column criado_por uuid default auth.uid();
alter table producoes add column estoque_baixado boolean not null default false;
update producoes set estoque_baixado = true;
alter table checklist_execucoes add column criado_por uuid default auth.uid();
alter table registros_temperatura add column criado_por uuid default auth.uid();
alter table movimentacoes_estoque add column criado_por uuid default auth.uid();

-- =========================================================================
-- policies: matriz de acesso
-- =========================================================================

-- clientes: todo membro lê o próprio restaurante; só a gestão edita.
drop policy clientes_self on clientes;
create policy clientes_leitura on clientes
  for select using (id = auth_cliente_id() or user_id = auth.uid());
create policy clientes_cadastro on clientes
  for insert with check (user_id = auth.uid());
create policy clientes_edicao on clientes
  for update using (id = auth_cliente_id() and auth_gestao())
  with check (id = auth_cliente_id() and auth_gestao());

-- Só gestão (dono/gestor): preço de venda, custo, margem, faturamento.
drop policy receitas_tenant on receitas;
create policy receitas_gestao on receitas
  for all using (cliente_id = auth_cliente_id() and auth_gestao())
  with check (cliente_id = auth_cliente_id() and auth_gestao());

drop policy canais_venda_tenant on canais_venda;
create policy canais_venda_gestao on canais_venda
  for all using (cliente_id = auth_cliente_id() and auth_gestao())
  with check (cliente_id = auth_cliente_id() and auth_gestao());

drop policy fechamentos_cmv_tenant on fechamentos_cmv;
create policy fechamentos_cmv_gestao on fechamentos_cmv
  for all using (cliente_id = auth_cliente_id() and auth_gestao())
  with check (cliente_id = auth_cliente_id() and auth_gestao());

drop policy event_log_tenant on event_log;
create policy event_log_gestao on event_log
  for all using (cliente_id = auth_cliente_id() and auth_gestao())
  with check (cliente_id = auth_cliente_id() and auth_gestao());

drop policy receita_insumos_tenant on receita_insumos;
create policy receita_insumos_gestao on receita_insumos
  for all using (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()) and auth_gestao())
  with check (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()) and auth_gestao());

drop policy receita_embalagens_tenant on receita_embalagens;
create policy receita_embalagens_gestao on receita_embalagens
  for all using (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()) and auth_gestao())
  with check (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()) and auth_gestao());

drop policy receita_etapas_tenant on receita_etapas;
create policy receita_etapas_gestao on receita_etapas
  for all using (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()) and auth_gestao())
  with check (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()) and auth_gestao());

drop policy fichas_tecnicas_tenant on fichas_tecnicas;
create policy fichas_tecnicas_gestao on fichas_tecnicas
  for all using (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()) and auth_gestao())
  with check (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()) and auth_gestao());

drop policy nutricional_override_tenant on nutricional_override;
create policy nutricional_override_gestao on nutricional_override
  for all using (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()) and auth_gestao())
  with check (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()) and auth_gestao());

drop policy rotulagem_tenant on rotulagem;
create policy rotulagem_gestao on rotulagem
  for all using (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()) and auth_gestao())
  with check (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()) and auth_gestao());

drop policy precos_canal_tenant on precos_canal;
create policy precos_canal_gestao on precos_canal
  for all using (exists (select 1 from canais_venda c where c.id = canal_id and c.cliente_id = auth_cliente_id()) and auth_gestao())
  with check (exists (select 1 from canais_venda c where c.id = canal_id and c.cliente_id = auth_cliente_id()) and auth_gestao());

drop policy vendas_periodo_tenant on vendas_periodo;
create policy vendas_periodo_gestao on vendas_periodo
  for all using (exists (select 1 from fechamentos_cmv f where f.id = fechamento_id and f.cliente_id = auth_cliente_id()) and auth_gestao())
  with check (exists (select 1 from fechamentos_cmv f where f.id = fechamento_id and f.cliente_id = auth_cliente_id()) and auth_gestao());

drop policy valores_nutricionais_insumo_tenant on valores_nutricionais_insumo;
create policy valores_nutricionais_insumo_gestao on valores_nutricionais_insumo
  for all using (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()) and auth_gestao())
  with check (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()) and auth_gestao());

-- Gestão + estoquista: compras e estoque.
drop policy insumos_tenant on insumos;
create policy insumos_estoque on insumos
  for all using (cliente_id = auth_cliente_id() and auth_estoque())
  with check (cliente_id = auth_cliente_id() and auth_estoque());

drop policy fornecedores_tenant on fornecedores;
create policy fornecedores_estoque on fornecedores
  for all using (cliente_id = auth_cliente_id() and auth_estoque())
  with check (cliente_id = auth_cliente_id() and auth_estoque());

drop policy historico_preco_insumo_tenant on historico_preco_insumo;
create policy historico_preco_insumo_estoque on historico_preco_insumo
  for all using (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()) and auth_estoque())
  with check (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()) and auth_estoque());

drop policy estoque_tenant on estoque;
create policy estoque_estoque on estoque
  for all using (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()) and auth_estoque())
  with check (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()) and auth_estoque());

drop policy movimentacoes_estoque_tenant on movimentacoes_estoque;
create policy movimentacoes_estoque_estoque on movimentacoes_estoque
  for all using (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()) and auth_estoque())
  with check (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()) and auth_estoque());

drop policy processamentos_proteina_tenant on processamentos_proteina;
create policy processamentos_proteina_estoque on processamentos_proteina
  for all using (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()) and auth_estoque())
  with check (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()) and auth_estoque());

-- Todo membro lê; gestão (ou estoque, nos locais) escreve.
drop policy turnos_tenant on turnos;
create policy turnos_leitura on turnos
  for select using (cliente_id = auth_cliente_id());
create policy turnos_gestao on turnos
  for all using (cliente_id = auth_cliente_id() and auth_gestao())
  with check (cliente_id = auth_cliente_id() and auth_gestao());

drop policy locais_armazenamento_tenant on locais_armazenamento;
create policy locais_armazenamento_leitura on locais_armazenamento
  for select using (cliente_id = auth_cliente_id());
create policy locais_armazenamento_estoque on locais_armazenamento
  for all using (cliente_id = auth_cliente_id() and auth_estoque())
  with check (cliente_id = auth_cliente_id() and auth_estoque());

drop policy checklists_tenant on checklists;
create policy checklists_leitura on checklists
  for select using (cliente_id = auth_cliente_id());
create policy checklists_gestao on checklists
  for all using (cliente_id = auth_cliente_id() and auth_gestao())
  with check (cliente_id = auth_cliente_id() and auth_gestao());

drop policy checklist_itens_tenant on checklist_itens;
create policy checklist_itens_leitura on checklist_itens
  for select using (exists (select 1 from checklists c where c.id = checklist_id and c.cliente_id = auth_cliente_id()));
create policy checklist_itens_gestao on checklist_itens
  for all using (exists (select 1 from checklists c where c.id = checklist_id and c.cliente_id = auth_cliente_id()) and auth_gestao())
  with check (exists (select 1 from checklists c where c.id = checklist_id and c.cliente_id = auth_cliente_id()) and auth_gestao());

drop policy checklist_areas_tenant on checklist_areas;
create policy checklist_areas_leitura on checklist_areas
  for select using (exists (select 1 from checklists c where c.id = checklist_id and c.cliente_id = auth_cliente_id()));
create policy checklist_areas_gestao on checklist_areas
  for all using (exists (select 1 from checklists c where c.id = checklist_id and c.cliente_id = auth_cliente_id()) and auth_gestao())
  with check (exists (select 1 from checklists c where c.id = checklist_id and c.cliente_id = auth_cliente_id()) and auth_gestao());

drop policy checklist_fotos_tenant on checklist_fotos;
create policy checklist_fotos_leitura on checklist_fotos
  for select using (exists (select 1 from checklists c where c.id = checklist_id and c.cliente_id = auth_cliente_id()));
create policy checklist_fotos_gestao on checklist_fotos
  for all using (exists (select 1 from checklists c where c.id = checklist_id and c.cliente_id = auth_cliente_id()) and auth_gestao())
  with check (exists (select 1 from checklists c where c.id = checklist_id and c.cliente_id = auth_cliente_id()) and auth_gestao());

-- Rotina da cozinha: todo membro registra.
-- checklist_execucoes: a policy antiga (_tenant, sem papel) já serve.

drop policy registros_temperatura_tenant on registros_temperatura;
create policy registros_temperatura_leitura on registros_temperatura
  for select using (exists (select 1 from locais_armazenamento l where l.id = local_armazenamento_id and l.cliente_id = auth_cliente_id()));
create policy registros_temperatura_registro on registros_temperatura
  for insert with check (exists (select 1 from locais_armazenamento l where l.id = local_armazenamento_id and l.cliente_id = auth_cliente_id()));
create policy registros_temperatura_gestao on registros_temperatura
  for delete using (exists (select 1 from locais_armazenamento l where l.id = local_armazenamento_id and l.cliente_id = auth_cliente_id()) and auth_gestao());

drop policy producoes_tenant on producoes;
create policy producoes_leitura on producoes
  for select using (cliente_id = auth_cliente_id());
create policy producoes_registro on producoes
  for insert with check (cliente_id = auth_cliente_id());
create policy producoes_status on producoes
  for update using (cliente_id = auth_cliente_id())
  with check (cliente_id = auth_cliente_id());
create policy producoes_remocao on producoes
  for delete using (cliente_id = auth_cliente_id() and auth_gestao());

-- Fotos: leitura continua pública; subir e apagar só a gestão.
drop policy receitas_fotos_escrita_tenant on storage.objects;
drop policy receitas_fotos_atualizacao_tenant on storage.objects;
drop policy receitas_fotos_delete_tenant on storage.objects;
create policy receitas_fotos_escrita_gestao on storage.objects
  for insert with check (bucket_id = 'receitas-fotos' and (storage.foldername(name))[1] = auth_cliente_id()::text and auth_gestao());
create policy receitas_fotos_atualizacao_gestao on storage.objects
  for update using (bucket_id = 'receitas-fotos' and (storage.foldername(name))[1] = auth_cliente_id()::text and auth_gestao())
  with check (bucket_id = 'receitas-fotos' and (storage.foldername(name))[1] = auth_cliente_id()::text and auth_gestao());
create policy receitas_fotos_delete_gestao on storage.objects
  for delete using (bucket_id = 'receitas-fotos' and (storage.foldername(name))[1] = auth_cliente_id()::text and auth_gestao());

drop policy pracas_fotos_escrita_tenant on storage.objects;
drop policy pracas_fotos_delete_tenant on storage.objects;
create policy pracas_fotos_escrita_gestao on storage.objects
  for insert with check (bucket_id = 'pracas-fotos' and (storage.foldername(name))[1] = auth_cliente_id()::text and auth_gestao());
create policy pracas_fotos_delete_gestao on storage.objects
  for delete using (bucket_id = 'pracas-fotos' and (storage.foldername(name))[1] = auth_cliente_id()::text and auth_gestao());

-- =========================================================================
-- funções: as que já existiam passam a checar o papel
-- =========================================================================

create or replace function ajustar_saldo_estoque(p_insumo_id uuid, p_delta numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A cozinha não mexe em saldo: a baixa da produção dela passa pelo
  -- servidor (baixar_estoque_producao), que calcula o consumo pela ficha.
  if not auth_estoque() then
    raise exception 'Sem permissão para ajustar estoque';
  end if;

  -- security definer ignora a RLS de "estoque" -- reforça o tenant check aqui.
  if not exists (
    select 1 from estoque e
    join insumos i on i.id = e.insumo_id
    where e.insumo_id = p_insumo_id and i.cliente_id = auth_cliente_id()
  ) then
    raise exception 'Estoque não encontrado para o insumo %', p_insumo_id;
  end if;

  update estoque
  set saldo_atual = saldo_atual + p_delta, atualizado_em = now()
  where insumo_id = p_insumo_id;
end;
$$;

create or replace function substituir_receita_insumos(p_receita_id uuid, p_linhas jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not auth_gestao() or not exists (select 1 from receitas r where r.id = p_receita_id and r.cliente_id = auth_cliente_id()) then
    raise exception 'Receita não encontrada ou sem permissão';
  end if;

  delete from receita_insumos where receita_id = p_receita_id;

  insert into receita_insumos (receita_id, insumo_id, sub_receita_id, peso_liquido, unidade)
  select
    p_receita_id,
    (l->>'insumoId')::uuid,
    (l->>'subReceitaId')::uuid,
    (l->>'pesoLiquido')::numeric,
    l->>'unidade'
  from jsonb_array_elements(p_linhas) as l;
end;
$$;

create or replace function substituir_receita_etapas(p_receita_id uuid, p_etapas jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not auth_gestao() or not exists (select 1 from receitas r where r.id = p_receita_id and r.cliente_id = auth_cliente_id()) then
    raise exception 'Receita não encontrada ou sem permissão';
  end if;

  delete from receita_etapas where receita_id = p_receita_id;

  insert into receita_etapas (receita_id, ordem, titulo, texto, foto_url)
  select
    p_receita_id,
    (e->>'ordem')::integer,
    e->>'titulo',
    e->>'texto',
    e->>'fotoUrl'
  from jsonb_array_elements(p_etapas) as e;
end;
$$;

-- =========================================================================
-- funções novas
-- =========================================================================

-- Tudo que a cozinha precisa, sem nenhum valor em R$: fichas (gramatura,
-- preparo, etapas), insumos (nome, unidade, FC, local, se tem estoque, SEM
-- preço e SEM saldo) e o FC observado nas proteínas. Também alimenta o
-- cálculo da baixa da produção feita no aparelho da cozinha.
create or replace function dados_cozinha()
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

  return jsonb_build_object(
    'receitas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'nome_prato', r.nome_prato,
        'tipo', r.tipo,
        'categoria', r.categoria,
        'rendimento', r.rendimento,
        'unidade_rendimento', r.unidade_rendimento,
        'peso_porcao_g', r.peso_porcao_g,
        'modo_preparo', r.modo_preparo,
        'foto_url', r.foto_url,
        'ficha', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', ri.id, 'insumo_id', ri.insumo_id, 'sub_receita_id', ri.sub_receita_id,
            'peso_liquido', ri.peso_liquido, 'unidade', ri.unidade))
          from receita_insumos ri where ri.receita_id = r.id), '[]'::jsonb),
        'etapas', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', e.id, 'ordem', e.ordem, 'titulo', e.titulo, 'texto', e.texto, 'foto_url', e.foto_url) order by e.ordem)
          from receita_etapas e where e.receita_id = r.id), '[]'::jsonb)
      ) order by r.nome_prato)
      from receitas r where r.cliente_id = v_cliente), '[]'::jsonb),
    'insumos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'nome', i.nome, 'categoria', i.categoria, 'unidade_medida', i.unidade_medida,
        'fator_correcao', i.fator_correcao, 'peso_por_unidade', i.peso_por_unidade,
        'local_armazenamento_id', i.local_armazenamento_id,
        'tem_estoque', exists (select 1 from estoque e where e.insumo_id = i.id)
      ) order by i.nome)
      from insumos i where i.cliente_id = v_cliente), '[]'::jsonb),
    'processamentos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'insumo_id', p.insumo_id, 'peso_bruto_recebido', p.peso_bruto_recebido,
        'peso_liquido_resultante', p.peso_liquido_resultante, 'processado_em', p.processado_em))
      from processamentos_proteina p join insumos i on i.id = p.insumo_id
      where i.cliente_id = v_cliente), '[]'::jsonb)
  );
end;
$$;

-- Contagem cega: grava o que foi contado e, por trás, o saldo do sistema
-- naquela hora. Quem conta não recebe o saldo de volta.
create or replace function enviar_contagem(p_responsavel text, p_itens jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente uuid := auth_cliente_id();
  v_contagem uuid;
begin
  if v_cliente is null then
    raise exception 'Sem acesso';
  end if;
  if coalesce(trim(p_responsavel), '') = '' then
    raise exception 'Informe quem contou';
  end if;
  if jsonb_array_length(coalesce(p_itens, '[]'::jsonb)) = 0 then
    raise exception 'Nenhum item contado';
  end if;

  insert into contagens_estoque (cliente_id, responsavel)
  values (v_cliente, trim(p_responsavel))
  returning id into v_contagem;

  insert into contagem_itens (contagem_id, insumo_id, quantidade_contada, saldo_sistema)
  select v_contagem, e.insumo_id, (l->>'quantidade')::numeric, e.saldo_atual
  from jsonb_array_elements(p_itens) as l
  join estoque e on e.insumo_id = (l->>'insumoId')::uuid
  join insumos i on i.id = e.insumo_id and i.cliente_id = v_cliente;

  return v_contagem;
end;
$$;

-- CMV do lado do estoque pro estoquista: estoque inicial, compras e final,
-- SEM faturamento (com faturamento e CMV% dá pra deduzir a receita da casa).
create or replace function fechamentos_cmv_estoque()
returns table (
  id uuid,
  periodo_inicio date,
  periodo_fim date,
  estoque_inicial numeric,
  compras numeric,
  estoque_final numeric,
  fechado_em timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select f.id, f.periodo_inicio, f.periodo_fim, f.estoque_inicial, f.compras, f.estoque_final, f.fechado_em
  from fechamentos_cmv f
  where f.cliente_id = auth_cliente_id() and auth_estoque()
  order by f.periodo_fim desc
$$;

-- Baixa da produção registrada pela cozinha. Só o servidor chama (service
-- role): ele confere que quem pediu é membro do restaurante, calcula o
-- consumo pela ficha e manda os itens. Uma vez por produção.
create or replace function baixar_estoque_producao(p_producao_id uuid, p_itens jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente uuid;
  v_origem text;
  l jsonb;
begin
  select p.cliente_id, 'Produção (cozinha) — lote ' || p.lote
  into v_cliente, v_origem
  from producoes p
  where p.id = p_producao_id and not p.estoque_baixado
  for update;

  if v_cliente is null then
    raise exception 'Produção não encontrada ou já baixada';
  end if;

  for l in select * from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) loop
    if (l->>'quantidade')::numeric > 0 and exists (
      select 1 from estoque e join insumos i on i.id = e.insumo_id
      where e.insumo_id = (l->>'insumoId')::uuid and i.cliente_id = v_cliente
    ) then
      update estoque
      set saldo_atual = saldo_atual - (l->>'quantidade')::numeric, atualizado_em = now()
      where insumo_id = (l->>'insumoId')::uuid;

      insert into movimentacoes_estoque (insumo_id, tipo, quantidade, origem, criado_por)
      values ((l->>'insumoId')::uuid, 'saida_producao', (l->>'quantidade')::numeric, v_origem, null);
    end if;
  end loop;

  update producoes set estoque_baixado = true where id = p_producao_id;
end;
$$;

revoke execute on function dados_cozinha() from public, anon;
revoke execute on function enviar_contagem(text, jsonb) from public, anon;
revoke execute on function fechamentos_cmv_estoque() from public, anon;
revoke execute on function baixar_estoque_producao(uuid, jsonb) from public, anon, authenticated;
grant execute on function dados_cozinha() to authenticated;
grant execute on function enviar_contagem(text, jsonb) to authenticated;
grant execute on function fechamentos_cmv_estoque() to authenticated;
grant execute on function baixar_estoque_producao(uuid, jsonb) to service_role;
