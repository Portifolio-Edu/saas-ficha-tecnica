-- Oferta: 7 dias por restaurante; R$ 297/mês; 10 fundadores a R$ 197.
-- Não ativa o provedor nem bloqueia acesso de contas existentes.
create table public.testes_saas (
  id uuid primary key references public.clientes(id) on delete cascade,
  cliente_id uuid not null unique references public.clientes(id) on delete cascade,
  inicia_em timestamptz not null,
  termina_em timestamptz not null,
  check (termina_em = inicia_em + interval '7 days')
);
insert into public.testes_saas(id,cliente_id,inicia_em,termina_em)
  select id,id,criado_em,criado_em + interval '7 days' from public.clientes where status_assinatura='trial';
create function interno.iniciar_teste_saas() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status_assinatura='trial' then
    insert into public.testes_saas values(new.id,new.id,new.criado_em,new.criado_em+interval '7 days');
  end if;
  return new;
end $$;
revoke all on function interno.iniciar_teste_saas() from public,anon,authenticated;
create trigger iniciar_teste_saas after insert on public.clientes for each row execute function interno.iniciar_teste_saas();

create table public.vagas_fundadores_saas (
  ambiente text not null check(ambiente in ('sandbox','producao')),
  numero smallint not null check(numero between 1 and 10),
  assinatura_id uuid unique references public.assinaturas_saas(id) on delete set null,
  confirmado_em timestamptz,
  primary key(ambiente,numero),
  check(assinatura_id is not null or confirmado_em is not null)
);
alter table public.testes_saas enable row level security;
alter table public.vagas_fundadores_saas enable row level security;
revoke all on public.testes_saas,public.vagas_fundadores_saas from anon,authenticated;
grant select on public.testes_saas to authenticated;
grant all on public.testes_saas,public.vagas_fundadores_saas to service_role;
create policy teste_saas_dono on public.testes_saas for select to authenticated using(exists(select 1 from public.clientes c where c.id=cliente_id and c.user_id=auth.uid()));
alter table public.assinaturas_saas add column primeiro_vencimento date;
alter table public.assinaturas_saas add column fundador_confirmado boolean not null default false;

create function public.consultar_oferta_saas(p_cliente uuid,p_ambiente text)
returns table(valor_centavos bigint,vagas_disponiveis integer,teste_termina_em timestamptz,primeiro_vencimento date,fundador_confirmado boolean)
language plpgsql security invoker set search_path='' as $$
declare a public.assinaturas_saas; fim timestamptz; vagas integer; elegivel boolean;
begin
  if p_ambiente not in ('sandbox','producao') then raise exception 'Ambiente inválido'; end if;
  if not exists(select 1 from public.clientes where id=p_cliente) then raise exception 'Restaurante desconhecido'; end if;
  select * into a from public.assinaturas_saas where cliente_id=p_cliente and ambiente=p_ambiente and estado<>'cancelada' order by criado_em desc limit 1;
  select termina_em into fim from public.testes_saas where cliente_id=p_cliente;
  select 10-count(*) into vagas from public.vagas_fundadores_saas where ambiente=p_ambiente;
  elegivel := not exists(select 1 from public.assinaturas_saas anterior where anterior.cliente_id=p_cliente and anterior.ambiente=p_ambiente and anterior.fundador_confirmado);
  return query select coalesce(a.valor_centavos,case when vagas>0 and elegivel then 19700::bigint else 29700::bigint end),vagas,fim,
    coalesce(a.primeiro_vencimento,greatest((now() at time zone 'America/Sao_Paulo')::date, (fim at time zone 'America/Sao_Paulo')::date+1)),coalesce(a.fundador_confirmado,false);
end $$;

create function public.reservar_assinatura_saas(p_cliente uuid,p_ambiente text,p_valor_aceito bigint)
returns public.assinaturas_saas language plpgsql security invoker set search_path='' as $$
declare oferta record; a public.assinaturas_saas; vaga integer;
begin
  -- Todos os criadores e conciliadores usam a mesma trava transacional.
  perform pg_advisory_xact_lock(197297,case when p_ambiente='producao' then 1 else 0 end);
  if exists(select 1 from public.assinaturas_saas where cliente_id=p_cliente and ambiente=p_ambiente and estado<>'cancelada') then raise exception 'Uma solicitação já está sendo processada. Atualize a situação.'; end if;
  select * into oferta from public.consultar_oferta_saas(p_cliente,p_ambiente);
  if p_valor_aceito is distinct from oferta.valor_centavos then raise exception 'A oferta mudou. Reabra a seção Plano antes de assinar.'; end if;
  insert into public.assinaturas_saas(cliente_id,ambiente,valor_centavos,primeiro_vencimento)
    values(p_cliente,p_ambiente,oferta.valor_centavos,oferta.primeiro_vencimento) returning * into a;
  if a.valor_centavos=19700 then
    select n into vaga from generate_series(1,10) n where not exists(select 1 from public.vagas_fundadores_saas v where v.ambiente=p_ambiente and v.numero=n) order by n limit 1;
    insert into public.vagas_fundadores_saas(ambiente,numero,assinatura_id) values(p_ambiente,vaga,a.id);
  end if;
  return a;
end $$;
revoke all on function public.consultar_oferta_saas(uuid,text), public.reservar_assinatura_saas(uuid,text,bigint) from public,anon,authenticated;
grant execute on function public.consultar_oferta_saas(uuid,text), public.reservar_assinatura_saas(uuid,text,bigint) to service_role;
create function public.conciliar_oferta_saas(
  p_id uuid, p_subscription text, p_customer text, p_estado text,
  p_fatura_url text, p_inicio timestamptz, p_evento text, p_pagamento_confirmado boolean
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare a public.assinaturas_saas;
begin
  perform pg_advisory_xact_lock(197297,case when (select ambiente from public.assinaturas_saas where id=p_id)='producao' then 1 else 0 end);
  select * into a from public.assinaturas_saas where id = p_id for update;
  if not found then raise exception 'Assinatura desconhecida'; end if;
  if p_estado not in ('pendente','ativa','atrasada','inativa','cancelada') then raise exception 'Estado inválido'; end if;
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
  if p_pagamento_confirmado and a.valor_centavos=19700 then
    update public.vagas_fundadores_saas set confirmado_em=coalesce(confirmado_em,now()) where assinatura_id=a.id;
    if found then update public.assinaturas_saas set fundador_confirmado=true where id=a.id; end if;
  end if;
  if p_estado='cancelada' then
    delete from public.vagas_fundadores_saas where assinatura_id=a.id and confirmado_em is null;
  end if;
  -- Sandbox nunca promove um restaurante a plano pago.
  if a.ambiente = 'producao' then
    update public.clientes set plano = case when p_estado = 'ativa' then 'pro' else plano end,
      status_assinatura = p_estado where id = a.cliente_id
      and not exists (select 1 from public.assinaturas_saas outra where outra.cliente_id=a.cliente_id and outra.ambiente='producao' and outra.criado_em > a.criado_em);
  end if;
  return true;
end $$;
revoke all on function public.conciliar_oferta_saas(uuid,text,text,text,text,timestamptz,text,boolean) from public, anon, authenticated;
grant execute on function public.conciliar_oferta_saas(uuid,text,text,text,text,timestamptz,text,boolean) to service_role;

create or replace function public.conciliar_assinatura_saas(p_id uuid,p_subscription text,p_customer text,p_estado text,p_fatura_url text,p_inicio timestamptz,p_evento text default null)
returns boolean language sql security invoker set search_path='' as $$
  select public.conciliar_oferta_saas(p_id,p_subscription,p_customer,p_estado,p_fatura_url,p_inicio,p_evento,p_estado='ativa')
$$;
