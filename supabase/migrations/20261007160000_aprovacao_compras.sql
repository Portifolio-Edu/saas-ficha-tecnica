-- Compras: solicitação → aprovação por gestão → confirmação da compra.
-- Históricos existentes permanecem, sem inventar uma aprovação retroativa.
alter table public.requisicoes drop constraint requisicoes_status_check;
alter table public.requisicoes add constraint requisicoes_status_check check(status in ('pendente','aprovado','comprado','cancelado'));
alter table public.requisicoes
  add column aprovado_em timestamptz,
  add column aprovado_por uuid,
  add column aprovado_nome text,
  add column resolvido_nome text;
alter table public.requisicoes add constraint requisicoes_aprovacao_carimbada
  check(status <> 'aprovado' or (aprovado_em is not null and aprovado_por is not null));

-- Não basta ocultar um botão: UPDATE direto do estoquista também é barrado.
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

-- A cozinha/estoque só retira sua própria solicitação antes da aprovação;
-- a gestão continua podendo administrar solicitações pendentes da equipe.
drop policy requisicoes_desistir on public.requisicoes;
create policy requisicoes_desistir on public.requisicoes for delete to authenticated
  using(cliente_id=interno.auth_cliente_id() and status='pendente' and (criado_por=auth.uid() or interno.auth_gestao()));
