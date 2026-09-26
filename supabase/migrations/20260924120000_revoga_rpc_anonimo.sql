-- Alerta do verificador de segurança do Supabase (2026-09-24): as funções
-- security definer abaixo podiam ser chamadas por visitante sem login
-- (/rest/v1/rpc/...). Elas já barram quem não tem cliente (auth_cliente_id()
-- volta null e as outras levantam erro), mas visitante não tem motivo pra chamar
-- nenhuma. Usuário logado continua podendo: o app chama as três RPCs e as
-- policies de RLS usam auth_cliente_id().
-- Reverter: grant execute on function ... to anon;
revoke execute on function public.auth_cliente_id() from public, anon;
revoke execute on function public.ajustar_saldo_estoque(uuid, numeric) from public, anon;
revoke execute on function public.substituir_receita_insumos(uuid, jsonb) from public, anon;
revoke execute on function public.substituir_receita_etapas(uuid, jsonb) from public, anon;

grant execute on function public.auth_cliente_id() to authenticated;
grant execute on function public.ajustar_saldo_estoque(uuid, numeric) to authenticated;
grant execute on function public.substituir_receita_insumos(uuid, jsonb) to authenticated;
grant execute on function public.substituir_receita_etapas(uuid, jsonb) to authenticated;
