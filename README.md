# Ficha Técnica SaaS — app

Next.js 15 (App Router) + TypeScript + Tailwind v4 + shadcn/ui, integrado ao Supabase. Cobre o passo 1 da ordem de construção do handoff (projeto + migration + RLS); nenhuma tela de produto foi construída ainda.

## Stack

- Next.js 15.5, App Router, `src/` dir, Turbopack.
- Tailwind CSS v4 (`@theme inline` em `src/app/globals.css`, sem `tailwind.config.js`).
- shadcn/ui — style `new-york`, base color `neutral`. `ui.shadcn.com` não é alcançável neste ambiente de sandbox, então o init (`components.json`, `src/lib/utils.ts`, tokens de tema, `Button`) foi replicado manualmente; `npx shadcn@latest add <componente>` deve funcionar normalmente num ambiente com acesso à internet.
- `@supabase/ssr` + `@supabase/supabase-js` — clientes separados para browser (`src/lib/supabase/client.ts`), Server Components/Route Handlers (`src/lib/supabase/server.ts`) e o middleware de refresh de sessão (`src/lib/supabase/middleware.ts` + `middleware.ts` na raiz).

## Configuração

```bash
cp .env.example .env.local
# preencher NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Banco: schema e RLS

`supabase/migrations/20260916124442_init_schema.sql` — schema completo (27 tabelas da seção 4 do handoff), com os `generated always as` (`preco_unitario`, `fc_observado`, `peso_descarte_puro`) e as constraints de negócio que o handoff documenta (perda exige `motivo_perda`, reconciliação do processamento de proteína não pode passar do peso bruto, receita `prato_final` exige `preco_venda`).

**Multi-tenant por `auth.uid()`, não por claim de JWT.** `clientes` ganhou uma coluna que não está na seção 4 do handoff — `user_id uuid not null unique references auth.users(id)` — porque a RLS precisa de algo pra comparar contra `auth.uid()`, e o handoff assume login único por restaurante (seção 8, passo 2). Toda tabela com `cliente_id` tem RLS habilitada:

- `clientes`: `using (user_id = auth.uid())` direto, sem helper (o helper consulta `clientes`, então usá-lo na política de `clientes` causaria recursão).
- Toda tabela com `cliente_id` direto: `using (cliente_id = auth_cliente_id())`, onde `auth_cliente_id()` é uma função `security definer` que resolve `select id from clientes where user_id = auth.uid()`.
- Tabelas-filha sem `cliente_id` próprio (`receita_insumos`, `estoque`, `checklist_itens`, ...) usam `EXISTS` até o ancestral mais próximo que carrega `cliente_id`.
- `fatores_correcao_referencia` (catálogo geral, não por cliente) é somente leitura pra qualquer usuário autenticado; escrita fica reservada ao service role.

Validado ponta a ponta contra um Postgres 16 local com um stub de `auth.users`/`auth.uid()` fiel ao que a Supabase expõe de verdade: dois tenants, cada um só enxerga e só escreve nas próprias linhas, inclusive via join nas tabelas-filha (testado explicitamente `estoque` de um insumo de outro tenant). As constraints de negócio (reconciliação de proteína, motivo de perda obrigatório, preço obrigatório em prato final) também foram exercitadas e barram exatamente os casos que deveriam barrar.

Aplicar num projeto Supabase:

```bash
supabase link --project-ref <ref>
supabase db push
```

## Motor de cálculo

`src/lib/calculo/` implementa cada fórmula da seção 5 do handoff como função pura, sem depender de React nem do client do Supabase — recebe dados já resolvidos e devolve número:

| Arquivo | Fórmula |
|---|---|
| `fatorCorrecao.ts` | FC efetivo (medido prevalece sobre o cadastrado, cai no cadastrado sem lote) |
| `conversaoUnidade.ts` | kg/g, l/ml, un via `peso_por_unidade` |
| `cmv.ts` | CMV da receita, com sub-receita aninhada sem reaplicar o FC |
| `precificacao.ts` | Preço sugerido e preço por canal (mantém o ganho em reais, com e sem embalagem) |
| `capacidadeProducao.ts` | Gargalo de estoque; insumo sem rastreio fica fora do cálculo, não conta como zero |
| `fechamentoCmv.ts` | CMV teórico × real e o gap; quebra de estoque |
| `nutricional.ts` | Por porção, por 100g, %VD, selo frontal, override de laudo |

```bash
npm test         # 39 testes (vitest), cobrindo os exemplos numéricos do handoff (salmão, lasanha, iFood)
npm run test:watch
```

## Em aberto

- Nenhuma tela de produto ainda — só o scaffold, a integração com Supabase, a migration e o motor de cálculo, por pedido explícito.
- Onboarding (criação do `cliente` vinculado ao `auth.users` no primeiro login) ainda não implementado.
- Camada de API/Server Actions que chama `src/lib/calculo/` a partir dos dados lidos via Supabase — ainda não existe.
