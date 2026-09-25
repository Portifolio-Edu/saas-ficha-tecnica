-- Reverte 20260925120000_equipe_papeis: volta a um login por restaurante,
-- que vê tudo. Rodar inteiro no SQL Editor. Apaga equipe, nomes da cozinha,
-- pareamentos e contagens cegas.
begin;
do $$ declare r record; begin
  for r in select tablename, policyname from pg_policies where schemaname = 'public'
    and tablename in ('clientes','receitas','canais_venda','fechamentos_cmv','event_log','insumos','fornecedores','turnos','locais_armazenamento','checklists','producoes','receita_insumos','receita_embalagens','receita_etapas','fichas_tecnicas','nutricional_override','rotulagem','valores_nutricionais_insumo','historico_preco_insumo','estoque','movimentacoes_estoque','processamentos_proteina','checklist_itens','checklist_areas','checklist_fotos','precos_canal','vendas_periodo','registros_temperatura')
  loop execute format('drop policy %I on %I', r.policyname, r.tablename); end loop;
end $$;
create policy clientes_self on clientes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy receitas_tenant on receitas for all using (cliente_id = auth_cliente_id()) with check (cliente_id = auth_cliente_id());
create policy canais_venda_tenant on canais_venda for all using (cliente_id = auth_cliente_id()) with check (cliente_id = auth_cliente_id());
create policy fechamentos_cmv_tenant on fechamentos_cmv for all using (cliente_id = auth_cliente_id()) with check (cliente_id = auth_cliente_id());
create policy event_log_tenant on event_log for all using (cliente_id = auth_cliente_id()) with check (cliente_id = auth_cliente_id());
create policy insumos_tenant on insumos for all using (cliente_id = auth_cliente_id()) with check (cliente_id = auth_cliente_id());
create policy fornecedores_tenant on fornecedores for all using (cliente_id = auth_cliente_id()) with check (cliente_id = auth_cliente_id());
create policy turnos_tenant on turnos for all using (cliente_id = auth_cliente_id()) with check (cliente_id = auth_cliente_id());
create policy locais_armazenamento_tenant on locais_armazenamento for all using (cliente_id = auth_cliente_id()) with check (cliente_id = auth_cliente_id());
create policy checklists_tenant on checklists for all using (cliente_id = auth_cliente_id()) with check (cliente_id = auth_cliente_id());
create policy producoes_tenant on producoes for all using (cliente_id = auth_cliente_id()) with check (cliente_id = auth_cliente_id());
create policy receita_insumos_tenant on receita_insumos for all using (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id())) with check (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()));
create policy receita_embalagens_tenant on receita_embalagens for all using (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id())) with check (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()));
create policy receita_etapas_tenant on receita_etapas for all using (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id())) with check (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()));
create policy fichas_tecnicas_tenant on fichas_tecnicas for all using (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id())) with check (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()));
create policy nutricional_override_tenant on nutricional_override for all using (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id())) with check (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()));
create policy rotulagem_tenant on rotulagem for all using (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id())) with check (exists (select 1 from receitas r where r.id = receita_id and r.cliente_id = auth_cliente_id()));
create policy valores_nutricionais_insumo_tenant on valores_nutricionais_insumo for all using (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id())) with check (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()));
create policy historico_preco_insumo_tenant on historico_preco_insumo for all using (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id())) with check (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()));
create policy estoque_tenant on estoque for all using (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id())) with check (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()));
create policy movimentacoes_estoque_tenant on movimentacoes_estoque for all using (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id())) with check (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()));
create policy processamentos_proteina_tenant on processamentos_proteina for all using (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id())) with check (exists (select 1 from insumos i where i.id = insumo_id and i.cliente_id = auth_cliente_id()));
create policy checklist_itens_tenant on checklist_itens for all using (exists (select 1 from checklists c where c.id = checklist_id and c.cliente_id = auth_cliente_id())) with check (exists (select 1 from checklists c where c.id = checklist_id and c.cliente_id = auth_cliente_id()));
create policy checklist_areas_tenant on checklist_areas for all using (exists (select 1 from checklists c where c.id = checklist_id and c.cliente_id = auth_cliente_id())) with check (exists (select 1 from checklists c where c.id = checklist_id and c.cliente_id = auth_cliente_id()));
create policy checklist_fotos_tenant on checklist_fotos for all using (exists (select 1 from checklists c where c.id = checklist_id and c.cliente_id = auth_cliente_id())) with check (exists (select 1 from checklists c where c.id = checklist_id and c.cliente_id = auth_cliente_id()));
create policy precos_canal_tenant on precos_canal for all using (exists (select 1 from canais_venda c where c.id = canal_id and c.cliente_id = auth_cliente_id())) with check (exists (select 1 from canais_venda c where c.id = canal_id and c.cliente_id = auth_cliente_id()));
create policy vendas_periodo_tenant on vendas_periodo for all using (exists (select 1 from fechamentos_cmv f where f.id = fechamento_id and f.cliente_id = auth_cliente_id())) with check (exists (select 1 from fechamentos_cmv f where f.id = fechamento_id and f.cliente_id = auth_cliente_id()));
create policy registros_temperatura_tenant on registros_temperatura for all using (exists (select 1 from locais_armazenamento l where l.id = local_armazenamento_id and l.cliente_id = auth_cliente_id())) with check (exists (select 1 from locais_armazenamento l where l.id = local_armazenamento_id and l.cliente_id = auth_cliente_id()));
drop policy receitas_fotos_escrita_gestao on storage.objects;
drop policy receitas_fotos_atualizacao_gestao on storage.objects;
drop policy receitas_fotos_delete_gestao on storage.objects;
drop policy pracas_fotos_escrita_gestao on storage.objects;
drop policy pracas_fotos_delete_gestao on storage.objects;
create policy receitas_fotos_escrita_tenant on storage.objects for insert with check (bucket_id = 'receitas-fotos' and (storage.foldername(name))[1] = auth_cliente_id()::text);
create policy receitas_fotos_atualizacao_tenant on storage.objects for update using (bucket_id = 'receitas-fotos' and (storage.foldername(name))[1] = auth_cliente_id()::text) with check (bucket_id = 'receitas-fotos' and (storage.foldername(name))[1] = auth_cliente_id()::text);
create policy receitas_fotos_delete_tenant on storage.objects for delete using (bucket_id = 'receitas-fotos' and (storage.foldername(name))[1] = auth_cliente_id()::text);
create policy pracas_fotos_escrita_tenant on storage.objects for insert with check (bucket_id = 'pracas-fotos' and (storage.foldername(name))[1] = auth_cliente_id()::text);
create policy pracas_fotos_delete_tenant on storage.objects for delete using (bucket_id = 'pracas-fotos' and (storage.foldername(name))[1] = auth_cliente_id()::text);
create or replace function auth_cliente_id() returns uuid language sql security definer set search_path = public stable as $$ select id from clientes where user_id = auth.uid() $$;
-- ajustar_saldo_estoque / substituir_receita_*: recriar a partir de 20260921000000 e 20260921010000.
drop function dados_cozinha(); drop function enviar_contagem(text, jsonb); drop function fechamentos_cmv_estoque(); drop function baixar_estoque_producao(uuid, jsonb);
drop trigger clientes_cria_dono on clientes; drop function criar_membro_dono();
drop table contagem_itens; drop table contagens_estoque; drop table pareamentos_cozinha; drop table funcionarios;
drop policy membros_leitura on membros; drop table membros;
drop function auth_estoque(); drop function auth_gestao(); drop function auth_papel();
alter table producoes drop column criado_por, drop column estoque_baixado;
alter table checklist_execucoes drop column criado_por;
alter table registros_temperatura drop column criado_por;
alter table movimentacoes_estoque drop column criado_por;
commit;
