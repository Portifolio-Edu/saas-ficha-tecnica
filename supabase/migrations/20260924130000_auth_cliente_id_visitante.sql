-- Correção da 20260924120000: as policies de RLS chamam auth_cliente_id(), então
-- tirar a execução dela de visitante (anon) fazia qualquer leitura sem login
-- falhar com "permission denied for function auth_cliente_id" em vez de voltar
-- vazia (achado no teste de isolamento de 2026-09-24). Pra visitante a função só
-- devolve null (não há auth.uid()), então devolver a permissão é seguro. As três
-- funções que alteram dados continuam fechadas pra visitante.
-- Reverter: revoke execute on function public.auth_cliente_id() from anon;
grant execute on function public.auth_cliente_id() to anon;
