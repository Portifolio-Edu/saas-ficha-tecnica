-- Reverte 20261001100000_configuracoes_empresa: some com os dados da empresa,
-- logo, cor e a função de perfil. Os arquivos do balde "marcas" são apagados
-- antes do balde (o Storage não remove balde com arquivo).
begin;
drop function if exists public.atualizar_meu_perfil(text);

drop policy if exists marcas_leitura_publica on storage.objects;
drop policy if exists marcas_escrita_gestao on storage.objects;
drop policy if exists marcas_troca_gestao on storage.objects;
drop policy if exists marcas_remocao_gestao on storage.objects;
delete from storage.objects where bucket_id = 'marcas';
delete from storage.buckets where id = 'marcas';

drop trigger if exists clientes_atualizado_em on clientes;
drop function if exists interno.carimbar_atualizado_em();
alter table clientes drop constraint if exists clientes_logo_na_pasta;
alter table clientes drop constraint if exists clientes_cnpj_digitos;
alter table clientes
  drop column if exists razao_social, drop column if exists inscricao_estadual, drop column if exists email_contato,
  drop column if exists telefone_contato, drop column if exists cep, drop column if exists logradouro,
  drop column if exists numero, drop column if exists complemento, drop column if exists bairro,
  drop column if exists cidade, drop column if exists uf, drop column if exists logo_path,
  drop column if exists cor_destaque, drop column if exists atualizado_em;
commit;
