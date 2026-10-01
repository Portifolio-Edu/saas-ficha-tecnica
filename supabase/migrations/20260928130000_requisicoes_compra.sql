-- PEDIDOS DA COZINHA (2026-09-26): em casa sem estoquista, a cozinha avisa
-- quem compra o que falta — e hortifrúti muda tanto que muitas vezes só a
-- cozinha sabe. Duas partes:
--  1. fornecedores ganham agenda estruturada: dias da semana de entrega,
--     horário limite do pedido, quantos dias antes da entrega e quais
--     categorias atendem. Antes "dias de entrega" era texto livre ("Seg, Qua"),
--     sem como calcular prazo — é convertido e a coluna velha sai.
--  2. requisicoes: itens pedidos pela cozinha (por categoria), que o
--     estoquista/gestor marca como comprados.
-- A cozinha não lê fornecedores (telefone, e-mail): vê só a agenda, pela
-- função agenda_fornecedores().
-- Reverter: supabase/reverter/20260928130000_requisicoes_compra.sql

alter table fornecedores
  add column entrega_dias smallint[] not null default '{}',
  add column pedido_ate time,
  add column pedido_antecedencia smallint not null default 1,
  add column categorias_pedido text[] not null default '{}';

alter table fornecedores
  add constraint fornecedores_entrega_dias check (entrega_dias <@ array[0,1,2,3,4,5,6]::smallint[]),
  add constraint fornecedores_pedido_antecedencia check (pedido_antecedencia between 0 and 7),
  add constraint fornecedores_categorias_pedido check (categorias_pedido <@ array['hortifruti','proteinas','secos','laticinios','outros']);

-- Texto antigo ("Seg, Qua e Sex") vira dias da semana (0 = domingo).
update fornecedores f
set entrega_dias = coalesce((
  select array_agg(distinct d order by d)::smallint[]
  from (values ('dom', 0), ('seg', 1), ('ter', 2), ('qua', 3), ('qui', 4), ('sex', 5), ('sab', 6), ('sáb', 6)) as m(nome, d)
  where lower(f.dias_entrega) ~ ('(^|[^a-zà-ú])' || m.nome)
), '{}')
where f.dias_entrega is not null;
alter table fornecedores drop column dias_entrega;

create table requisicoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete cascade,
  categoria text not null check (categoria in ('hortifruti', 'proteinas', 'secos', 'laticinios', 'outros')),
  insumo_id uuid references insumos (id) on delete set null,
  descricao text not null check (length(trim(descricao)) between 1 and 120),
  quantidade numeric check (quantidade > 0 and quantidade < 100000),
  unidade text check (unidade in ('kg', 'g', 'l', 'ml', 'un', 'cx', 'pct', 'maço', 'dz')),
  observacao text check (length(observacao) <= 200),
  responsavel text not null check (length(trim(responsavel)) between 1 and 80),
  status text not null default 'pendente' check (status in ('pendente', 'comprado', 'cancelado')),
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid(),
  resolvido_em timestamptz,
  resolvido_por uuid
);
create index requisicoes_cliente_status on requisicoes (cliente_id, status, criado_em desc);

alter table requisicoes enable row level security;
-- Toda a equipe (tablet inclusive) vê e pede; só estoque/gestão resolve.
create policy requisicoes_leitura on requisicoes for select to authenticated
  using (cliente_id = interno.auth_cliente_id());
create policy requisicoes_pedido on requisicoes for insert to authenticated
  with check (cliente_id = interno.auth_cliente_id() and status = 'pendente');
create policy requisicoes_resolver on requisicoes for update to authenticated
  using (cliente_id = interno.auth_cliente_id() and interno.auth_estoque())
  with check (cliente_id = interno.auth_cliente_id() and interno.auth_estoque());
-- Pediu errado: quem é da equipe tira o item enquanto ainda não foi comprado.
create policy requisicoes_desistir on requisicoes for delete to authenticated
  using (cliente_id = interno.auth_cliente_id() and status = 'pendente');

revoke all on requisicoes from anon, authenticated;
grant select, delete on requisicoes to authenticated;
grant insert (cliente_id, categoria, insumo_id, descricao, quantidade, unidade, observacao, responsavel) on requisicoes to authenticated;
grant update (status) on requisicoes to authenticated;

create trigger requisicoes_mesma_casa before insert or update on requisicoes
  for each row execute function interno.garantir_mesmo_restaurante('cliente_id', 'insumo_id:insumos');
create trigger requisicoes_criado_por before insert or update on requisicoes
  for each row execute function interno.carimbar_criado_por();

-- Quem marcou comprado/cancelado e quando: o banco carimba.
create or replace function interno.carimbar_resolucao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'pendente' then
      new.resolvido_em := null;
      new.resolvido_por := null;
    else
      new.resolvido_em := now();
      new.resolvido_por := auth.uid();
    end if;
  end if;
  return new;
end;
$$;
create trigger requisicoes_resolucao before update on requisicoes
  for each row execute function interno.carimbar_resolucao();

-- Agenda de entrega pra cozinha: sem telefone, e-mail nem contato.
create or replace function public.agenda_fornecedores()
returns table (empresa text, categorias_pedido text[], entrega_dias smallint[], pedido_ate time, pedido_antecedencia smallint)
language sql
stable
security definer
set search_path = public, interno
as $$
  select f.empresa, f.categorias_pedido, f.entrega_dias, f.pedido_ate, f.pedido_antecedencia
  from fornecedores f
  where f.cliente_id = interno.auth_cliente_id() and cardinality(f.entrega_dias) > 0
  order by f.empresa
$$;
revoke execute on function public.agenda_fornecedores() from public, anon;
grant execute on function public.agenda_fornecedores() to authenticated;
