# Banco de dados (Supabase)

**Projeto:** `xmjmnnjnxvlzydixyzkf` (região São Paulo, `sa-east-1`).
URL: `https://xmjmnnjnxvlzydixyzkf.supabase.co`.
O nome no painel ainda é "Marketplace de Freelas por Turno (via Readdy)"; dá pra
renomear em Project Settings → General (não muda URL nem chaves).

## Como ficou (2026-09-24)

Decisão do dono do produto: reaproveitar este projeto para o Ficha Técnica.

1. As 22 tabelas e 10 funções do produto anterior (marketplace de freelas e a
   automação de protocolos/documentos do n8n) **não foram apagadas**: foram
   movidas do schema `public` para `arquivo_marketplace`, fora da API. Os dados
   continuam lá (5 protocolos, 28 documentos, 121 mídias, 113 logs de erro, 4
   históricos de conversa, 1 perfil). A automação que gravava nessas tabelas
   parou de funcionar.
   - Apagar de vez: `drop schema arquivo_marketplace cascade;`
   - Devolver uma tabela: `alter table arquivo_marketplace.<tabela> set schema public;`
2. Aplicadas todas as migrations de `supabase/migrations/`, em ordem (nomes
   com prefixo `ficha_tecnica_` no histórico do Supabase).
3. Verificador de segurança: 30 tabelas, todas com RLS. Os avisos que ficam são
   esperados: funções `security definer` chamáveis por usuário logado (o app
   precisa; cada uma confere o `cliente_id`), e as tabelas do arquivo sem
   policy (fora da API).

## Para ligar o app a este banco

Na Vercel (Settings → Environment Variables), para Preview e Production:

- `NEXT_PUBLIC_SUPABASE_URL` = `https://xmjmnnjnxvlzydixyzkf.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = a chave "anon" (ou a "publishable") de
  Project Settings → API. É pública por natureza (vai pro navegador); quem
  protege os dados é a RLS.

Sem essas variáveis o app continua caindo na demo `/preview`.

## Pendências no painel

- **Auth → Proteção contra senha vazada:** ligar (Authentication → Settings).
- O usuário que já existia no Auth não tem restaurante (`clientes`) ligado a
  ele. Para testar, crie uma conta nova em `/cadastro`.
