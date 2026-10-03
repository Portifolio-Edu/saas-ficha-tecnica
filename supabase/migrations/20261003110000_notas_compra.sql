-- NF-e DE COMPRA PELA TELA (2026-10-03). O XML da nota do fornecedor entra no
-- sistema com conferência item a item (Estoque > Importar NF-e de compra):
-- cada item é ligado a um insumo, a unidade da nota vira a unidade do insumo,
-- o estoque recebe a entrada e o preço do insumo passa a ser o da nota (o que
-- muda o custo das fichas e o CMV teórico). Tudo numa transação só:
-- registrar_nota_compra(). Antes, só o agente IA lia a nota, item por item e
-- sem trava contra importar a mesma nota duas vezes.
--
-- Três tabelas:
--   notas_compra         a nota importada (chave de 44 dígitos única por
--                        restaurante: a mesma nota nunca entra duas vezes);
--   notas_compra_itens   o que aconteceu com cada item (insumo, quantidade
--                        convertida, preço anterior e novo, custo da entrada);
--   ligacoes_item_nota   memória: o código X do fornecedor (CNPJ) Y é o insumo
--                        Z (e quanto vem em cada caixa/pacote), pra próxima
--                        nota já vir ligada.
-- Ninguém grava nessas tabelas direto: só a função (security definer, que
-- confere restaurante e papel). Quem lê: dono, gestor e estoquista.
-- Reverter: supabase/reverter/20261003110000_notas_compra.sql

create table notas_compra (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete cascade,
  chave text not null check (chave ~ '^[0-9]{44}$'),
  numero text check (length(numero) <= 20),
  serie text check (length(serie) <= 10),
  fornecedor text not null default '' check (length(fornecedor) <= 200),
  cnpj_fornecedor text check (cnpj_fornecedor ~ '^[0-9]{11,14}$'),
  emitida_em date,
  valor_total numeric check (valor_total >= 0),
  -- Como a nota foi lançada: preço atualizado? frete, IPI e ST entraram no custo?
  atualizou_precos boolean not null default false,
  incluiu_extras boolean not null default true,
  qtd_itens integer not null default 0 check (qtd_itens >= 0),
  importada_em timestamptz not null default now(),
  criado_por uuid,
  unique (cliente_id, chave)
);
create index notas_compra_periodo on notas_compra (cliente_id, emitida_em desc);

create table notas_compra_itens (
  id uuid primary key default gen_random_uuid(),
  nota_id uuid not null references notas_compra (id) on delete cascade,
  ordem integer not null check (ordem > 0),
  codigo text check (length(codigo) <= 100),
  descricao text not null check (length(descricao) <= 300),
  quantidade numeric not null check (quantidade >= 0),
  unidade text check (length(unidade) <= 20),
  valor numeric not null default 0 check (valor >= 0),
  custos_extras numeric not null default 0 check (custos_extras >= 0),
  insumo_id uuid references insumos (id) on delete set null,
  ignorado boolean not null default false,
  -- Preenchidos só nos itens que entraram no estoque.
  quantidade_insumo numeric check (quantidade_insumo > 0),
  preco_unitario_anterior numeric,
  preco_unitario_novo numeric,
  preco_atualizado boolean not null default false,
  -- Quanto custou a entrada (valor dos produtos, mais frete/IPI/ST quando a nota foi lançada assim): alimenta "compras do período" do CMV.
  custo numeric not null default 0 check (custo >= 0),
  unique (nota_id, ordem)
);
create index notas_compra_itens_insumo on notas_compra_itens (insumo_id);

create table ligacoes_item_nota (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete cascade,
  cnpj_fornecedor text not null check (cnpj_fornecedor ~ '^[0-9]{11,14}$'),
  codigo text not null check (length(codigo) between 1 and 100),
  insumo_id uuid not null references insumos (id) on delete cascade,
  -- Quanto do insumo (na unidade dele) vem em 1 unidade da nota (ex.: 1 CX = 12 un). Nulo = conversão automática.
  fator numeric check (fator > 0),
  atualizado_em timestamptz not null default now(),
  unique (cliente_id, cnpj_fornecedor, codigo)
);

alter table notas_compra enable row level security;
alter table notas_compra_itens enable row level security;
alter table ligacoes_item_nota enable row level security;

create policy notas_compra_leitura on notas_compra for select to authenticated
  using (cliente_id = interno.auth_cliente_id() and interno.auth_estoque());
create policy notas_compra_itens_leitura on notas_compra_itens for select to authenticated
  using (interno.auth_estoque() and exists (select 1 from notas_compra n where n.id = nota_id and n.cliente_id = interno.auth_cliente_id()));
create policy ligacoes_item_nota_leitura on ligacoes_item_nota for select to authenticated
  using (cliente_id = interno.auth_cliente_id() and interno.auth_estoque());

revoke all on notas_compra, notas_compra_itens, ligacoes_item_nota from anon, authenticated;
grant select on notas_compra, notas_compra_itens, ligacoes_item_nota to authenticated;

create trigger notas_compra_criado_por before insert or update on notas_compra
  for each row execute function interno.carimbar_criado_por();

-- Registra a nota inteira: tudo ou nada.
-- p_nota = {chave, numero, serie, fornecedor, cnpj, emitida_em, valor_total,
--           atualizar_precos, incluiu_extras,
--           itens: [{ordem, codigo, descricao, quantidade, unidade, valor, custos_extras,
--                    insumo_id|null, ignorado, quantidade_insumo, preco_unitario_novo, custo, fator}]}
-- O app recalcula quantidade_insumo, preço e custo no servidor a partir do
-- cadastro; aqui o banco só confere o que o app não pode burlar: papel,
-- restaurante do insumo, nota repetida e números válidos.
-- Devolve {nota_id, entradas, precos_atualizados, ignorados}.
create or replace function public.registrar_nota_compra(p_nota jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, interno
as $$
declare
  v_cliente uuid := interno.auth_cliente_id();
  v_chave text := coalesce(p_nota->>'chave', '');
  v_cnpj text := regexp_replace(coalesce(p_nota->>'cnpj', ''), '[^0-9]', '', 'g');
  v_fornecedor text := left(coalesce(p_nota->>'fornecedor', ''), 200);
  v_atualizar boolean := coalesce((p_nota->>'atualizar_precos')::boolean, false);
  v_extras boolean := coalesce((p_nota->>'incluiu_extras')::boolean, true);
  v_origem text;
  v_nota_id uuid;
  v_quando timestamptz;
  v_item record;
  v_insumo record;
  v_preco_depois numeric;
  v_entradas integer := 0;
  v_precos integer := 0;
  v_ignorados integer := 0;
begin
  if v_cliente is null or not interno.auth_estoque() then
    raise exception 'Só dono, gestor e estoquista importam nota de compra.' using errcode = '42501';
  end if;
  if v_chave !~ '^[0-9]{44}$' then
    raise exception 'A nota não tem uma chave de acesso válida (44 dígitos).' using errcode = '22023';
  end if;
  if p_nota->'itens' is null or jsonb_typeof(p_nota->'itens') <> 'array' or jsonb_array_length(p_nota->'itens') = 0 then
    raise exception 'A nota não tem itens.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_nota->'itens') > 500 then
    raise exception 'Nota com itens demais (máximo 500).' using errcode = '22023';
  end if;

  insert into notas_compra (cliente_id, chave, numero, serie, fornecedor, cnpj_fornecedor, emitida_em, valor_total, atualizou_precos, incluiu_extras)
  values (
    v_cliente, v_chave, left(nullif(p_nota->>'numero', ''), 20), left(nullif(p_nota->>'serie', ''), 10), v_fornecedor,
    case when v_cnpj ~ '^[0-9]{11,14}$' then v_cnpj end, nullif(p_nota->>'emitida_em', '')::date, nullif(p_nota->>'valor_total', '')::numeric, v_atualizar, v_extras
  )
  on conflict (cliente_id, chave) do nothing
  returning id into v_nota_id;

  if v_nota_id is null then
    select importada_em into v_quando from notas_compra where cliente_id = v_cliente and chave = v_chave;
    raise exception 'Essa nota já foi importada em %.', to_char(v_quando at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') using errcode = '23505';
  end if;

  v_origem := left('NF-e ' || coalesce(nullif(p_nota->>'numero', ''), 's/n') || case when v_fornecedor <> '' then ' - ' || v_fornecedor else '' end, 200);

  for v_item in
    select * from jsonb_to_recordset(p_nota->'itens') as i(
      ordem integer, codigo text, descricao text, quantidade numeric, unidade text, valor numeric, custos_extras numeric,
      insumo_id uuid, ignorado boolean, quantidade_insumo numeric, preco_unitario_novo numeric, custo numeric, fator numeric
    )
    order by ordem
  loop
    if coalesce(v_item.ignorado, false) or v_item.insumo_id is null then
      insert into notas_compra_itens (nota_id, ordem, codigo, descricao, quantidade, unidade, valor, custos_extras, ignorado)
      values (v_nota_id, v_item.ordem, left(v_item.codigo, 100), left(coalesce(v_item.descricao, ''), 300), coalesce(v_item.quantidade, 0),
              left(v_item.unidade, 20), coalesce(v_item.valor, 0), coalesce(v_item.custos_extras, 0), true);
      v_ignorados := v_ignorados + 1;
      continue;
    end if;

    if v_item.quantidade_insumo is null or not (v_item.quantidade_insumo > 0) or v_item.quantidade_insumo >= 10000000 then
      raise exception 'O item % está sem quantidade válida.', v_item.ordem using errcode = '22023';
    end if;
    if v_item.preco_unitario_novo is not null and (v_item.preco_unitario_novo < 0 or v_item.preco_unitario_novo >= 10000000) then
      raise exception 'O item % está com preço inválido.', v_item.ordem using errcode = '22023';
    end if;

    select i.id, i.tamanho_embalagem, i.preco_unitario into v_insumo
    from insumos i where i.id = v_item.insumo_id and i.cliente_id = v_cliente;
    if not found then
      raise exception 'O item % aponta para um insumo que não é deste restaurante.', v_item.ordem using errcode = '42501';
    end if;

    -- Estoque: se o insumo ainda não era rastreado, passa a ser, com o que chegou.
    insert into estoque (insumo_id, saldo_atual, estoque_minimo)
    values (v_item.insumo_id, v_item.quantidade_insumo, 0)
    on conflict (insumo_id) do update set saldo_atual = estoque.saldo_atual + excluded.saldo_atual, atualizado_em = now();

    insert into movimentacoes_estoque (insumo_id, tipo, quantidade, origem)
    values (v_item.insumo_id, 'entrada', v_item.quantidade_insumo, v_origem);

    -- Preço: só mexe se a pessoa pediu e se mudou de verdade (mais de 0,5%).
    v_preco_depois := null;
    if v_atualizar and v_item.preco_unitario_novo is not null and v_item.preco_unitario_novo > 0
       and abs(v_item.preco_unitario_novo - v_insumo.preco_unitario) / greatest(v_insumo.preco_unitario, 0.0001) > 0.005 then
      update insumos
      set preco_embalagem = round(v_item.preco_unitario_novo * v_insumo.tamanho_embalagem, 4), atualizado_em = now()
      where id = v_item.insumo_id;
      select preco_unitario into v_preco_depois from insumos where id = v_item.insumo_id;
      insert into historico_preco_insumo (insumo_id, preco_anterior, preco_novo)
      values (v_item.insumo_id, v_insumo.preco_unitario, v_preco_depois);
      v_precos := v_precos + 1;
    end if;

    insert into notas_compra_itens (nota_id, ordem, codigo, descricao, quantidade, unidade, valor, custos_extras, insumo_id, ignorado,
                                    quantidade_insumo, preco_unitario_anterior, preco_unitario_novo, preco_atualizado, custo)
    values (v_nota_id, v_item.ordem, left(v_item.codigo, 100), left(coalesce(v_item.descricao, ''), 300), coalesce(v_item.quantidade, 0),
            left(v_item.unidade, 20), coalesce(v_item.valor, 0), coalesce(v_item.custos_extras, 0), v_item.insumo_id, false,
            v_item.quantidade_insumo, v_insumo.preco_unitario, v_item.preco_unitario_novo, v_preco_depois is not null,
            greatest(coalesce(v_item.custo, 0), 0));
    v_entradas := v_entradas + 1;

    -- Memória: na próxima nota deste fornecedor, esse código já vem ligado a este insumo.
    if v_cnpj ~ '^[0-9]{11,14}$' and coalesce(trim(v_item.codigo), '') <> '' then
      insert into ligacoes_item_nota (cliente_id, cnpj_fornecedor, codigo, insumo_id, fator)
      values (v_cliente, v_cnpj, upper(left(trim(v_item.codigo), 100)), v_item.insumo_id, case when v_item.fator > 0 then v_item.fator end)
      on conflict (cliente_id, cnpj_fornecedor, codigo) do update
        set insumo_id = excluded.insumo_id, fator = excluded.fator, atualizado_em = now();
    end if;
  end loop;

  if v_entradas = 0 then
    raise exception 'Nenhum item da nota entrou no estoque.' using errcode = '22023';
  end if;

  update notas_compra set qtd_itens = v_entradas, atualizou_precos = v_precos > 0 where id = v_nota_id;

  return jsonb_build_object('nota_id', v_nota_id, 'entradas', v_entradas, 'precos_atualizados', v_precos, 'ignorados', v_ignorados);
end;
$$;
revoke execute on function public.registrar_nota_compra(jsonb) from public, anon;
grant execute on function public.registrar_nota_compra(jsonb) to authenticated;
