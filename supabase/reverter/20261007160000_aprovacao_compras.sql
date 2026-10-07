-- Reversão opcional sob manutenção: executar somente se desejar RESTAURAR
-- o fluxo antigo sem aprovação. Não executar automaticamente ao reverter Git.
-- Mantém todas as colunas de auditoria e todos os pedidos/históricos.
begin;
lock table public.requisicoes in access exclusive mode;
update public.requisicoes set status='pendente' where status='aprovado';
alter table public.requisicoes drop constraint requisicoes_status_check;
alter table public.requisicoes add constraint requisicoes_status_check check(status in ('pendente','comprado','cancelado'));
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

drop policy requisicoes_desistir on public.requisicoes;
create policy requisicoes_desistir on public.requisicoes for delete to authenticated
  using(cliente_id=interno.auth_cliente_id() and status='pendente');
commit;
