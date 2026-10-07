-- Delegação por restaurante: padrão restrito à gestão; só gestão altera.
alter table public.clientes
  add column estoque_pode_aprovar_compras boolean not null default false,
  add column permissao_compras_alterada_em timestamptz,
  add column permissao_compras_alterada_por uuid,
  add column permissao_compras_alterada_nome text;
grant update(estoque_pode_aprovar_compras) on public.clientes to authenticated;

create or replace function interno.carimbar_permissao_compras()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.estoque_pode_aprovar_compras is not distinct from old.estoque_pode_aprovar_compras or auth.uid() is null then return new; end if;
  if interno.auth_gestao() is not true then raise exception using errcode='42501',message='Somente gestor ou dono altera a permissão de compras.'; end if;
  new.permissao_compras_alterada_em:=now();
  new.permissao_compras_alterada_por:=auth.uid();
  select m.nome into new.permissao_compras_alterada_nome from public.membros m where m.user_id=auth.uid() and m.cliente_id=old.id and m.ativo limit 1;
  return new;
end $$;
create trigger clientes_permissao_compras before update of estoque_pode_aprovar_compras on public.clientes
  for each row execute function interno.carimbar_permissao_compras();

create or replace function interno.carimbar_resolucao()
returns trigger language plpgsql set search_path='' as $$
declare papel text; nome text; pode_aprovar boolean;
begin
  -- Manutenção/migrations com postgres ou service_role sem sessão de usuário.
  if auth.uid() is null then return new; end if;
  papel := interno.auth_papel();
  select (papel in ('dono','gestor') or (papel='estoquista' and c.estoque_pode_aprovar_compras)) into pode_aprovar from public.clientes c where c.id=old.cliente_id;
  if new.status is not distinct from old.status then
    raise exception 'Esta requisição já foi alterada. Atualize Compras antes de continuar.';
  end if;
  if not (
    (old.status='pendente' and new.status in ('aprovado','cancelado') and coalesce(pode_aprovar,false))
    or (old.status='aprovado' and new.status='comprado' and papel in ('dono','gestor','estoquista'))
    or (old.status='aprovado' and new.status='cancelado' and coalesce(pode_aprovar,false))
  ) then
    raise exception using errcode='42501',message='A decisão exige aprovação de uma pessoa autorizada nas configurações de Compras.';
  end if;
  select m.nome into nome from public.membros m where m.user_id=auth.uid() and m.cliente_id=old.cliente_id and m.ativo limit 1;
  if new.status='aprovado' then
    new.aprovado_em:=now(); new.aprovado_por:=auth.uid(); new.aprovado_nome:=coalesce(nome,'Equipe autorizada');
    new.resolvido_em:=null; new.resolvido_por:=null; new.resolvido_nome:=null;
  else
    new.resolvido_em:=now(); new.resolvido_por:=auth.uid(); new.resolvido_nome:=coalesce(nome,'Equipe');
  end if;
  return new;
end $$;

