-- Assinatura do próprio SaaS. Não confundir com compras/vendas do restaurante.
create table public.assinaturas_saas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  ambiente text not null check (ambiente in ('sandbox', 'producao')),
  valor_centavos bigint not null check (valor_centavos > 0),
  customer_id text,
  subscription_id text,
  estado text not null default 'criando' check (estado in ('criando','pendente','ativa','atrasada','cancelada')),
  fatura_url text,
  sincronizado_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (ambiente, subscription_id)
);
create unique index uma_recorrencia_saas_por_restaurante on public.assinaturas_saas(cliente_id, ambiente) where estado <> 'cancelada';
create table public.eventos_assinatura_saas (
  ambiente text not null,
  evento_id text not null,
  assinatura_id uuid not null references public.assinaturas_saas(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (ambiente, evento_id)
);
alter table public.assinaturas_saas enable row level security;
alter table public.eventos_assinatura_saas enable row level security;
revoke all on public.assinaturas_saas, public.eventos_assinatura_saas from anon, authenticated;
grant select on public.assinaturas_saas to authenticated;
grant all on public.assinaturas_saas, public.eventos_assinatura_saas to service_role;
create policy assinatura_dono_le on public.assinaturas_saas for select to authenticated
  using (exists (select 1 from public.clientes c where c.id = cliente_id and c.user_id = auth.uid()));

-- Idempotência, concorrência e atualização do plano no mesmo commit.
create function public.conciliar_assinatura_saas(
  p_id uuid, p_subscription text, p_customer text, p_estado text,
  p_fatura_url text, p_inicio timestamptz, p_evento text default null
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare a public.assinaturas_saas;
begin
  select * into a from public.assinaturas_saas where id = p_id for update;
  if not found then raise exception 'Assinatura desconhecida'; end if;
  if p_estado not in ('pendente','ativa','atrasada','cancelada') then raise exception 'Estado inválido'; end if;
  if (a.subscription_id is not null and a.subscription_id <> p_subscription)
     or (a.customer_id is not null and a.customer_id <> p_customer) then
    raise exception 'Vínculo de cobrança inválido';
  end if;
  if p_evento is not null then
    insert into public.eventos_assinatura_saas (ambiente, evento_id, assinatura_id)
      values (a.ambiente, p_evento, a.id) on conflict do nothing;
    if not found then return false; end if;
  end if;
  if a.sincronizado_em is not null and a.sincronizado_em > p_inicio then return false; end if;
  update public.assinaturas_saas set subscription_id = p_subscription, customer_id = p_customer,
    estado = p_estado, fatura_url = p_fatura_url, sincronizado_em = p_inicio where id = a.id;
  -- Sandbox nunca promove um restaurante a plano pago.
  if a.ambiente = 'producao' then
    update public.clientes set plano = case when p_estado = 'ativa' then 'pro' else plano end,
      status_assinatura = p_estado where id = a.cliente_id
      and not exists (select 1 from public.assinaturas_saas outra where outra.cliente_id=a.cliente_id and outra.ambiente='producao' and outra.criado_em > a.criado_em);
  end if;
  return true;
end $$;
revoke all on function public.conciliar_assinatura_saas(uuid,text,text,text,text,timestamptz,text) from public, anon, authenticated;
grant execute on function public.conciliar_assinatura_saas(uuid,text,text,text,text,timestamptz,text) to service_role;

-- Uma exclusão da conta não pode deixar recorrência órfã no provedor.
create function interno.proteger_exclusao_assinatura() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.assinaturas_saas where cliente_id = old.id and estado <> 'cancelada') then
    raise exception 'Cancele ou concilie a assinatura antes de excluir o restaurante';
  end if;
  return old;
end $$;
revoke all on function interno.proteger_exclusao_assinatura() from public, anon, authenticated;
create trigger proteger_assinatura_antes_exclusao before delete on public.clientes
  for each row execute function interno.proteger_exclusao_assinatura();
