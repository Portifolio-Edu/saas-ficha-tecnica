# Ficha Técnica SaaS — app

Next.js 15 (App Router) + TypeScript + Tailwind v4 + shadcn/ui, integrado ao Supabase. Cobre toda a ordem de construção do handoff: projeto + migration + RLS, auth e onboarding de restaurante, CRUD de insumo/receita/preparo, estoque/fornecedores/produção com kanban, manipulação de proteína + fechamento de CMV com importação de vendas, e relatórios/ficha nutricional/segurança alimentar/checklists de turno. Todo item do nav lateral tem tela própria, menos Configurações.

## Stack

- Next.js 15.5, App Router, `src/` dir, Turbopack.
- Tailwind CSS v4 (`@theme inline` em `src/app/globals.css`, sem `tailwind.config.js`).
- shadcn/ui — style `new-york`, base color `neutral`. `ui.shadcn.com` não é alcançável neste ambiente de sandbox, então o init (`components.json`, `src/lib/utils.ts`, tokens de tema, `Button`) foi replicado manualmente; `npx shadcn@latest add <componente>` deve funcionar normalmente num ambiente com acesso à internet.
- `@supabase/ssr` + `@supabase/supabase-js` — clientes separados para browser (`src/lib/supabase/client.ts`), Server Components/Route Handlers (`src/lib/supabase/server.ts`) e o middleware de refresh de sessão (`src/lib/supabase/middleware.ts` + `middleware.ts` na raiz).
- Recharts — só o gráfico de FC observado por lote em `/proteinas` usa; o resto das telas é tabela/card, como no mock.
- `@react-pdf/renderer` — gera os 3 PDFs (ficha de custos, ficha operacional, rótulo nutricional) inteiramente no navegador, via `import()` dinâmico disparado no clique do botão -- a lib é pesada e não faz sentido no bundle inicial de quem só está olhando a lista de pratos.

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

**PDFs (seção 6 do handoff)** — `src/lib/pdf/`, gerados inteiramente no navegador com `@react-pdf/renderer`, sem round-trip de servidor: a tela já tem todo dado calculado, só falta desenhar. Três documentos, cada um com sua função e público:

- **Ficha de Custos** (`/receitas`, por prato) — CMV linha a linha, preço de venda, margem e preço sugerido. Contém preço: uso interno do dono, não pra distribuir.
- **Ficha Operacional** (`/receitas`, por prato) — só ingrediente e quantidade, sem FC, preço nem custo, mais o modo de preparo (campo novo, `modo_preparo` na receita — o mock nunca teve onde digitar isso). Pra cozinha; verificado manualmente (gerando o PDF com dado de exemplo) que o documento não traz nenhum valor em reais.
- **Rótulo Nutricional** (`/nutricional`, por prato) — a mesma tabela de INFORMAÇÃO NUTRICIONAL da tela, mas **sempre** com fundo branco e letra preta (`estilos` deste PDF são fixos em `#FFFFFF`/`#000000`, não condicionados a `destino_venda` como a versão em tela) — a norma exige esse formato pro rótulo em si, incondicionalmente, diferente da tela onde o dark/light só muda quando o prato é de venda própria. Mostra o aviso de selo de alerta frontal (Anexo XVII/XVIII da IN 75/2020) quando aplicável, com a mesma ressalva já documentada em `/nutricional`: o sistema não desenha o selo oficial, só avisa que ele é obrigatório.

Import é sempre dinâmico (`await import("@/lib/pdf/...")`), disparado no clique do botão -- `@react-pdf/renderer` nunca entra no bundle inicial de `/receitas` nem `/nutricional`.

`/estoque` (saldo em armazenamento, entradas/saídas, fornecedores) e `/producoes` (quadro kanban de produção) seguem o mesmo princípio: mesmos componentes visuais do mock, mesmo comportamento de arrastar-e-soltar e o mesmo modal de motivo de perda (não `window.prompt`, que fica bloqueado em iframe sandboxed — o mesmo problema já resolvido no mockup). Duas extensões deliberadas em relação ao mock, porque o mock não tinha formulário de movimentação nem edição de estoque (só estado inicial fixo): um formulário de "Registrar movimentação" (entrada/ajuste) em `/estoque`, e edição/exclusão de saldo rastreado e de fornecedor — sem isso a tela ficaria bonita mas não funcional.

**Capacidade de produção** (`src/lib/calculo/capacidadeProducao.ts`, já testado) alimenta tanto a coluna "Em estoque" do quadro quanto a tabela de detalhe em `/producoes`, com uma distinção que o mock não precisava fazer porque assumia rendimento implícito: pra **prato final**, o peso bruto de cada linha da ficha é dividido pelo rendimento da receita antes de entrar no cálculo (o resultado já sai em porções, do jeito que a tabela de detalhe mostra); pra **preparo próprio**, o peso bruto da ficha entra inteiro, sem dividir, porque a ficha de um preparo já representa o lote completo — dividir infla a capacidade além do que a cozinha produz de uma vez. `src/lib/dados/adaptadores.ts` centraliza esse peso bruto (`pesoBrutoDaLinha`) pra não duplicar a conta entre Insumos/Receitas e Produções.

`/proteinas` (manipulação de proteína) registra cada lote processado (`processamentos_proteina`, já com `fc_observado` e `peso_descarte_puro` calculados pelo banco) e mostra FC cadastrado × FC observado (média dos lotes) num gráfico Recharts, igual ao mock. A diferença que importa não é visual: **até esta tela existir, `construirContexto`/`pesoBrutoDaLinha` recebiam `lotesProteina` vazio sempre**, então o FC efetivo nunca saía do cadastrado em lugar nenhum do sistema, apesar da função já estar implementada e testada desde a primeira rodada. Agora `/insumos`, `/receitas`, `/producoes` e `/cmv` buscam `listarProcessamentos()` e passam os lotes de verdade pro motor de cálculo — um lote registrado pra um insumo já muda o CMV calculado em toda tela que usa aquele insumo, não só na aba de proteínas.

`/cmv` (fechamento de CMV) importa vendas coladas em texto (`nome do prato, quantidade`, mesmo parser do mock, casando pelo nome cadastrado) ou usa o `vendas_mes` manual de cada receita quando não há importação -- esse campo é novo na tela de Receitas, pro fallback funcionar. Diferente do mock (que era só estado efêmero em memória), aqui "Salvar fechamento do período" grava de verdade em `fechamentos_cmv` + `vendas_periodo`, então a tela também lista um histórico de fechamentos passados. O CMV real de um fechamento salvo nunca muda (vem do estoque contado na época); o CMV teórico do histórico é recalculado com a ficha técnica atual, então pode se afastar um pouco do teórico do dia do fechamento se preço de insumo mudou depois -- isso fica documentado na própria tela, não escondido.

`/seguranca` cadastra locais de armazenamento (freezer, câmara fria, estoque seco -- não existia CRUD nenhum pra isso ainda) com faixa de temperatura ideal, e registra leituras manuais por local. "Fora da faixa" nunca é campo salvo, é calculado na leitura contra a faixa atual do local, exatamente como o comentário do schema documenta -- se a faixa mudar depois, leituras antigas são reavaliadas contra o valor novo, não ficam presas ao que era válido na hora do registro.

`/checklists` porta o board de checklists de turno do mock (abertura/praça/processo/fechamento, editar/adicionar/remover item), mas `checklist_execucoes` no schema real é um log de auditoria (cada marcação vira uma linha com quem, que turno e quando), não um booleano por item como no mock. Marcar insere uma execução de hoje; desmarcar remove só a execução de hoje, então o histórico de dias anteriores fica intacto. Turno e responsável são um seletor local da tela, mesmo padrão já usado em `/producoes`.

`/nutricional` calcula a ficha nutricional por porção recursivamente (prato → sub-receita → insumo), mesmo padrão de `calcularCmvReceita`: o preparo resolve o próprio nutricional por porção e a linha que o referencia no prato pai multiplica isso pelo peso líquido, sem reconverter unidade. Como o mock não tinha edição nenhuma de dado nutricional (só objeto estático em memória), a tela aqui detecta e sinaliza quando um insumo usado na ficha ainda não tem `valores_nutricionais_insumo` cadastrado e oferece um formulário inline pra cadastrar na hora -- sem isso a tabela nunca fecharia completa pra ninguém. Suporta laudo laboratorial (`nutricional_override`, substitui o calculado campo a campo) e, pra prato vendido em varejo de terceiro, os dados de rotulagem (`rotulagem`) e o checklist "falta pro rótulo ficar pronto" -- o mock colocava a edição de rotulagem numa aba de Receitas mais rica que não foi construída nesta rodada; manter a edição aqui, junto da tabela que consome esses dados, evita depender de uma tela que não existe.

`/relatorios` é o único dos quatro que não tenta espelhar o mock célula por célula: o mock usava 9 meses de histórico mensal inventado (`historicoMensal`) só pra preencher gráfico de demonstração, e isso não faz sentido num sistema de verdade sem meses de fechamento acumulados ainda. Em vez disso a tela mostra só o que já dá pra derivar de dado real hoje: "Onde o dinheiro está vazando" (quebra de estoque somada dos fechamentos de CMV + custo dos lotes perdidos na produção), margem por prato e perdas por turno em gráfico, desempenho por responsável (cruza `processamentos_proteina`, `producoes` e `registros_temperatura` -- tudo dado real, nada digitado de novo) e a lista de pendências (margem baixa, FC pior que o cadastrado, estoque abaixo do mínimo, temperatura fora da faixa, gap de CMV alto), reaproveitando as mesmas funções de cálculo já testadas nas outras telas.

## Camada de dados

`src/lib/dominio/` guarda tipos e constantes puros (sem import de Supabase) que tanto os componentes cliente quanto o código de servidor importam. Isso é obrigatório, não estético: um componente `"use client"` que importe qualquer coisa de um arquivo que também importe `next/headers` quebra o build (Turbopack inclui o módulo inteiro no bundle do cliente). `src/lib/dados/` faz o CRUD de verdade (sempre no servidor, via `src/lib/supabase/server.ts`) e só é importado por Server Components e Server Actions.

## Em aberto

- Configurações é o único item do nav sem tela própria ainda -- todo o resto já tem rota real.
- Preço por canal (existe no mock, na aba Receitas & Fichas) não entrou em nenhuma rodada -- não faz parte de insumo/receita/preparo/nutricional em si; a edição de rotulagem, que também vivia lá no mock, já foi movida pra `/nutricional`.
- Turno ativo e chefe de turno em `/producoes` são um seletor local da tela (estado do componente, não persistido), só usados pra preencher `turno_id`/`chefe_turno` ao iniciar produção pelo quadro — não há tela de CRUD de turno ainda, os três turnos padrão (Manhã/Tarde/Noite) são criados automaticamente na primeira visita.
- Quebra de estoque por insumo (`calcularQuebraEstoque`, seção 5.8) está implementada e testada em `src/lib/calculo/fechamentoCmv.ts`, mas ainda não tem tela — o fechamento de CMV hoje só mostra o gap agregado do período, não a quebra insumo a insumo.
