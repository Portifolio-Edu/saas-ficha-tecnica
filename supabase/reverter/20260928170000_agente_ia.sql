-- Reverte 20260928170000_agente_ia (propostas, WhatsApp vinculado e o balde
-- de anexos somem; esvazie o balde antes: delete from storage.objects where
-- bucket_id = 'agente-anexos').
begin;
drop policy if exists agente_anexos_envio on storage.objects;
drop policy if exists agente_anexos_leitura on storage.objects;
delete from storage.buckets where id = 'agente-anexos';
drop table if exists agente_acoes;
drop table if exists agente_whatsapp;
drop function if exists interno.agente_acoes_decisao();
drop function if exists interno.agente_whatsapp_reverificar();
commit;
