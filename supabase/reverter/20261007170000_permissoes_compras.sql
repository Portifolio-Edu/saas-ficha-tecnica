-- Manutenção sem sessão: restaura aprovação somente pela gestão.
-- Preserva configuração, autoria e histórico; não exclui colunas ou pedidos.
begin;
lock table public.requisicoes in access exclusive mode;
revoke update(estoque_pode_aprovar_compras) on public.clientes from authenticated;
create or replace function interno.carimbar_resolucao()
returns trigger language plpgsql set search_path='' as $$
declare papel text; nome text;
begin
  -- Manutenção/migrations com postgres ou service_role sem sessão de usuário.
  if auth.uid() is null then return new; end if;
  papel := interno.auth_papel();
  if new.status is not distinct from old.status then
    raise exception 'Esta requisição já foi alterada. Atualize Compras antes de continuar.';
  end if;
  if not (
    (old.status='pendente' and new.status in ('aprovado','cancelado') and papel in ('dono','gestor'))
    or (old.status='aprovado' and new.status='comprado' and papel in ('dono','gestor','estoquista'))
    or (old.status='aprovado' and new.status='cancelado' and papel in ('dono','gestor'))
  ) then
    raise exception using errcode='42501',message='A compra precisa ser aprovada pelo gestor ou dono antes de ser confirmada.';
  end if;
  select m.nome into nome from public.membros m where m.user_id=auth.uid() and m.cliente_id=old.cliente_id and m.ativo limit 1;
  if new.status='aprovado' then
    new.aprovado_em:=now(); new.aprovado_por:=auth.uid(); new.aprovado_nome:=coalesce(nome,'Gestão');
    new.resolvido_em:=null; new.resolvido_por:=null; new.resolvido_nome:=null;
  else
    new.resolvido_em:=now(); new.resolvido_por:=auth.uid(); new.resolvido_nome:=coalesce(nome,'Equipe');
  end if;
  return new;
end $$;

commit;
