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

## Equipe e papéis (2026-09-25)

Migration `20260925120000_equipe_papeis` (aplicada). Cada restaurante tem
equipe (`membros`), com um papel por pessoa. O bloqueio é na RLS, não só no menu.

| Papel | Vê e mexe | Não vê |
|---|---|---|
| dono | tudo, cria gestor | nada fica escondido |
| gestor | tudo da operação | nada fica escondido (só não mexe no dono) |
| estoquista | insumos (com preço de compra), estoque, fornecedores, movimentações, proteínas, locais; CMV do estoque por `fechamentos_cmv_estoque()` | receitas, preço de venda, fichas com custo, canais, faturamento, contagens cegas |
| cozinha | checklists, temperaturas, produções e perdas, fichas sem custo (`dados_cozinha()`), contagem cega (`enviar_contagem()`) | qualquer valor em R$, saldo de estoque, fornecedores, equipe |

- A produção lançada pela cozinha baixa o estoque pelo servidor
  (`baixar_estoque_producao`, só service role, uma vez por produção).
- Contagem cega guarda o saldo do sistema da hora (`contagem_itens.saldo_sistema`);
  só a gestão vê a diferença.
- Membro desativado (`membros.ativo = false`) perde o acesso na hora.
- Auditoria: `criado_por` em produções, checklists, temperaturas e movimentações.
- Teste: `supabase/testes/papeis.sql` (54/54 OK em 2026-09-25) + o de
  isolamento (13/13 OK depois da migration).
- Reverter: `supabase/reverter/20260925120000_equipe_papeis.sql`.

## Teste de isolamento

`supabase/testes/isolamento.sql` cria dois restaurantes numa transação, tenta
ler e alterar os dados de um com o login do outro e com visitante, e desfaz
tudo no fim. Rodar depois de qualquer migration: todas as linhas precisam sair
`OK`. Em 2026-09-24: 15/15 OK, depois da correção `20260924130000` (visitante
recebia erro de permissão em vez de lista vazia).

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
