-- LIGAÇÃO PRODUTO DO PDV -> FICHA (2026-10-03). Até aqui a decisão "PIZZA
-- MARGUERITA G = ficha Pizza Margherita" ficava só no navegador de quem
-- importou (localStorage): trocar de aparelho, limpar o navegador ou outra
-- pessoa da gestão importando fazia o produto voltar a "sem decisão" sem
-- ninguém ver. Agora a ligação é do restaurante e fica no banco.
--
-- Cada linha é um produto vendido por um canal (por enquanto 'importacao':
-- XML fiscal ou planilha; o iFood, o Anota AI e o Saipos entram depois com o
-- próprio canal). Três estados:
--   - ligado a uma ficha:      receita_id preenchido;
--   - "não tem ficha" (bebida, taxa, couvert): sem_ficha = true;
--   - PENDENTE (nem um nem outro): produto que foi vendido e não casa com
--     nenhuma ficha. É a pendência visível: aparece em Integrações e no
--     Fechamento de CMV até alguém decidir. Apagar a ficha de um produto
--     ligado também devolve o produto pra pendente (on delete set null), pra
--     venda nunca sumir do CMV em silêncio.
--
-- Quem mexe: só dono e gestor (venda e faturamento são da gestão; o
-- estoquista e a cozinha não veem).
-- Reverter: supabase/reverter/20261003100000_produtos_pdv.sql

create table produtos_pdv (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete cascade,
  canal text not null default 'importacao' check (canal ~ '^[a-z0-9_-]{1,40}$'),
  -- Código + descrição normalizados (src/lib/integracoes/documentoFiscal.ts, chaveProduto).
  chave text not null check (length(chave) between 1 and 300),
  codigo text check (length(codigo) <= 100),
  descricao text not null check (length(trim(descricao)) between 1 and 300),
  receita_id uuid references receitas (id) on delete set null,
  sem_ficha boolean not null default false,
  -- O que veio na última importação (dá o tamanho da pendência).
  ultima_quantidade numeric check (ultima_quantidade >= 0),
  ultimo_valor numeric check (ultimo_valor >= 0),
  ultima_venda_em date,
  visto_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  criado_por uuid,
  unique (cliente_id, canal, chave),
  constraint produtos_pdv_uma_decisao check (not (sem_ficha and receita_id is not null))
);

-- Pendentes (a conta mais consultada: banner do CMV e de Integrações).
create index produtos_pdv_pendentes on produtos_pdv (cliente_id) where receita_id is null and not sem_ficha;

alter table produtos_pdv enable row level security;
create policy produtos_pdv_gestao on produtos_pdv for all to authenticated
  using (cliente_id = interno.auth_cliente_id() and interno.auth_gestao())
  with check (cliente_id = interno.auth_cliente_id() and interno.auth_gestao());

revoke all on produtos_pdv from anon, authenticated;
grant select, delete on produtos_pdv to authenticated;
grant insert (cliente_id, canal, chave, codigo, descricao, receita_id, sem_ficha, ultima_quantidade, ultimo_valor, ultima_venda_em, visto_em)
  on produtos_pdv to authenticated;
grant update (codigo, descricao, receita_id, sem_ficha, ultima_quantidade, ultimo_valor, ultima_venda_em, visto_em)
  on produtos_pdv to authenticated;

create trigger produtos_pdv_mesma_casa before insert or update on produtos_pdv
  for each row execute function interno.garantir_mesmo_restaurante('cliente_id', 'receita_id:receitas');
create trigger produtos_pdv_criado_por before insert or update on produtos_pdv
  for each row execute function interno.carimbar_criado_por();

-- Produto vendido só liga a prato final (preparo não é vendido).
create or replace function interno.produto_pdv_so_prato()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.receita_id is not null
     and not exists (select 1 from receitas r where r.id = new.receita_id and r.tipo = 'prato_final') then
    raise exception 'O produto do PDV só liga a um prato final, não a um preparo.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger produtos_pdv_so_prato before insert or update on produtos_pdv
  for each row execute function interno.produto_pdv_so_prato();

-- Grava de uma vez as decisões de uma importação (uma ida só ao banco, tudo
-- ou nada). Roda com a permissão de quem chama: a RLS e os gatilhos valem.
-- Cada item: {chave, codigo, descricao, receita_id|null, sem_ficha, quantidade, valor, data}.
-- Devolve quantos produtos do restaurante estão pendentes depois da gravação.
create or replace function public.salvar_produtos_pdv(p_canal text, p_itens jsonb)
returns integer
language plpgsql
set search_path = public, interno
as $$
declare
  v_cliente uuid := interno.auth_cliente_id();
  v_pendentes integer;
begin
  if v_cliente is null or not interno.auth_gestao() then
    raise exception 'Só dono e gestor ligam produtos do PDV às fichas.' using errcode = '42501';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then
    raise exception 'Lista de produtos inválida.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_itens) > 3000 then
    raise exception 'Produtos demais de uma vez (máximo 3000).' using errcode = '22023';
  end if;

  insert into produtos_pdv (cliente_id, canal, chave, codigo, descricao, receita_id, sem_ficha, ultima_quantidade, ultimo_valor, ultima_venda_em, visto_em)
  select distinct on (i.chave)
    v_cliente, p_canal, i.chave, nullif(trim(coalesce(i.codigo, '')), ''), i.descricao, i.receita_id,
    coalesce(i.sem_ficha, false) and i.receita_id is null, i.quantidade, i.valor, i.data, now()
  from jsonb_to_recordset(p_itens) as i(chave text, codigo text, descricao text, receita_id uuid, sem_ficha boolean, quantidade numeric, valor numeric, data date)
  where i.chave is not null
  order by i.chave
  on conflict (cliente_id, canal, chave) do update set
    codigo = excluded.codigo,
    descricao = excluded.descricao,
    receita_id = excluded.receita_id,
    sem_ficha = excluded.sem_ficha,
    ultima_quantidade = excluded.ultima_quantidade,
    ultimo_valor = excluded.ultimo_valor,
    ultima_venda_em = excluded.ultima_venda_em,
    visto_em = excluded.visto_em;

  select count(*) into v_pendentes from produtos_pdv where cliente_id = v_cliente and receita_id is null and not sem_ficha;
  return v_pendentes;
end;
$$;
revoke execute on function public.salvar_produtos_pdv(text, jsonb) from public, anon;
grant execute on function public.salvar_produtos_pdv(text, jsonb) to authenticated;
