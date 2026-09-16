# Ficha Técnica SaaS — app

Next.js 15 (App Router) + TypeScript + Tailwind v4 + shadcn/ui, integrado ao Supabase. Cobre os passos 1 a 4 da ordem de construção do handoff: projeto + migration + RLS, auth e onboarding de restaurante, CRUD de insumo/receita/preparo, e estoque/fornecedores/produção com kanban (o resto depende disto).

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

## Auth e onboarding

`/login` e `/cadastro` usam Server Actions (`src/lib/auth/actions.ts`) sobre o client server-side do Supabase, então a sessão já chega via cookie sem round-trip extra no client. Cadastro salva nome/nome_restaurante/telefone em `user_metadata` no `signUp` e só grava a linha em `clientes` se já existir sessão (confirmação de e-mail desligada); se o projeto exigir confirmação, `getClienteAtual()` (`src/lib/dados/cliente.ts`) termina esse onboarding sozinho no primeiro login, lendo os mesmos metadados — funciona nos dois casos sem precisar saber qual está ligado no projeto.

## Telas (CRUD)

`/insumos` (insumos comprados + preparos próprios) e `/receitas` (pratos finais, com quebra de CMV) — layout, componentes visuais (`Card`, `Badge`, paleta `C`, mesmos estilos de input/botão) e comportamento de formulário portados de `mockup/ficha-tecnica-mvp.jsx` sem redesenho. Duas diferenças deliberadas em relação ao mock, necessárias pra bater com o schema real: um campo de peso-por-unidade quando o insumo é medido em `un`, e um seletor de unidade por linha de ficha (o mock assumia peso já na unidade do insumo; o motor de cálculo já suporta conversão, então o formulário também precisa).

A quebra de CMV em `/receitas` chama `src/lib/calculo/` de verdade (não recalcula nada solto na tela) — inclusive sub-receita sem reaplicar FC, exatamente como testado.

`/estoque` (saldo em armazenamento, entradas/saídas, fornecedores) e `/producoes` (quadro kanban de produção) seguem o mesmo princípio: mesmos componentes visuais do mock, mesmo comportamento de arrastar-e-soltar e o mesmo modal de motivo de perda (não `window.prompt`, que fica bloqueado em iframe sandboxed — o mesmo problema já resolvido no mockup). Duas extensões deliberadas em relação ao mock, porque o mock não tinha formulário de movimentação nem edição de estoque (só estado inicial fixo): um formulário de "Registrar movimentação" (entrada/ajuste) em `/estoque`, e edição/exclusão de saldo rastreado e de fornecedor — sem isso a tela ficaria bonita mas não funcional.

**Capacidade de produção** (`src/lib/calculo/capacidadeProducao.ts`, já testado) alimenta tanto a coluna "Em estoque" do quadro quanto a tabela de detalhe em `/producoes`, com uma distinção que o mock não precisava fazer porque assumia rendimento implícito: pra **prato final**, o peso bruto de cada linha da ficha é dividido pelo rendimento da receita antes de entrar no cálculo (o resultado já sai em porções, do jeito que a tabela de detalhe mostra); pra **preparo próprio**, o peso bruto da ficha entra inteiro, sem dividir, porque a ficha de um preparo já representa o lote completo — dividir infla a capacidade além do que a cozinha produz de uma vez. `src/lib/dados/adaptadores.ts` centraliza esse peso bruto (`pesoBrutoDaLinha`) pra não duplicar a conta entre Insumos/Receitas e Produções.

## Camada de dados

`src/lib/dominio/` guarda tipos e constantes puros (sem import de Supabase) que tanto os componentes cliente quanto o código de servidor importam. Isso é obrigatório, não estético: um componente `"use client"` que importe qualquer coisa de um arquivo que também importe `next/headers` quebra o build (Turbopack inclui o módulo inteiro no bundle do cliente). `src/lib/dados/` faz o CRUD de verdade (sempre no servidor, via `src/lib/supabase/server.ts`) e só é importado por Server Components e Server Actions.

## Em aberto

- Manipulação de proteína, checklists, nutricional, temperatura, fechamento de CMV e relatórios — os itens restantes do nav aparecem no menu (mesmo layout do mock) mas ficam inertes até terem tela própria.
- Preço por canal e rotulagem (existem no mock, na aba Receitas & Fichas) não entraram nesta rodada de CRUD — não fazem parte de insumo/receita/preparo em si.
- Turno ativo e chefe de turno em `/producoes` são um seletor local da tela (estado do componente, não persistido), só usados pra preencher `turno_id`/`chefe_turno` ao iniciar produção pelo quadro — não há tela de CRUD de turno ainda, os três turnos padrão (Manhã/Tarde/Noite) são criados automaticamente na primeira visita.
