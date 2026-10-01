-- PLANO 9,5, etapa 3 (2026-09-26): LGPD — apagar o restaurante inteiro.
-- Só "delete from clientes" não basta: algumas ligações não apagam em
-- cascata de propósito (insumo usado em ficha, receita com produção, turno com
-- checklist…), pra que no dia a dia não dê pra apagar um item em uso. Aqui a
-- ordem é explícita: primeiro o que aponta, depois o apontado, e por fim o
-- restaurante (o resto sai em cascata).
-- Só o servidor chama (service role), depois de conferir que é o dono
-- (src/app/configuracoes/actions.ts). Fotos e logins o app apaga à parte.
-- Reverter: drop function public.excluir_restaurante(uuid);

create or replace function public.excluir_restaurante(p_cliente_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from clientes where id = p_cliente_id) then
    raise exception 'Restaurante não encontrado';
  end if;

  delete from vendas_periodo v
  where v.fechamento_id in (select id from fechamentos_cmv where cliente_id = p_cliente_id)
     or v.receita_id in (select id from receitas where cliente_id = p_cliente_id);
  delete from precos_canal p where p.canal_id in (select id from canais_venda where cliente_id = p_cliente_id);
  delete from producoes where cliente_id = p_cliente_id;
  delete from checklist_execucoes e
  where e.checklist_item_id in (select i.id from checklist_itens i join checklists c on c.id = i.checklist_id where c.cliente_id = p_cliente_id);
  delete from receita_insumos ri where ri.receita_id in (select id from receitas where cliente_id = p_cliente_id);
  delete from receita_embalagens re where re.receita_id in (select id from receitas where cliente_id = p_cliente_id);
  delete from registros_temperatura t where t.local_armazenamento_id in (select id from locais_armazenamento where cliente_id = p_cliente_id);
  delete from insumos where cliente_id = p_cliente_id;
  delete from clientes where id = p_cliente_id;
end;
$$;

revoke execute on function public.excluir_restaurante(uuid) from public, anon, authenticated;
grant execute on function public.excluir_restaurante(uuid) to service_role;
