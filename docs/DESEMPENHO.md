# Desempenho

Revisão de 2026-10-02. Antes dela, a barra da Vercel apontou uma travada
atrás da outra (régua da meta, seções de Configurações, cozinha e, por fim,
761 ms de espera num toque em Configurações → Minha conta), e cada uma era
corrigida separadamente. Esta revisão foi atrás das causas comuns e pôs
travas pra elas não voltarem.

## O que estava errado

### 1. Código que só é usado depois era executado na abertura de cada tela

Enquanto esse código roda, a tela não responde ao toque. É a "espera"
(input delay) que a barra da Vercel mostra.

| Achado | Onde | Peso | Correção |
|---|---|---|---|
| Cliente do Supabase no navegador (login, tempo real, arquivos), usado só pelo botão **Sair** | todas as telas do app | ~190 KB (sem compressão) | `import()` dentro de `sair()` (`AppShellCliente.tsx`) |
| Recharts (gráficos) | CMV, Proteínas, Segurança | ~290 KB | gráfico em arquivo `Grafico*.tsx`, carregado com `next/dynamic` e `<EspacoDoGrafico/>` (mesma altura, nada pula) |
| Dados de exemplo da demo (`src/app/preview/fixtures.ts`) | Produções do app de verdade | 37 KB | `import()` só no caminho da demo que precisa deles |

JS da primeira carga (comprimido, número do `next build`):

| Tela | Antes | Depois |
|---|---|---|
| CMV | 352 KB | 156 KB |
| Segurança | 332 KB | 147 KB |
| Proteínas | 331 KB | 146 KB |
| Escalas | 240 KB | 172 KB |
| Produções | 233 KB | 156 KB |
| Configurações | 227 KB | 159 KB |
| Visão geral | 216 KB | 148 KB |

### 2. Um formatador de número/data novo pra cada número da tela

`valor.toLocaleString("pt-BR", {…})` e `new Intl.DateTimeFormat(…)` montam um
formatador a cada chamada. Numa tabela com centenas de números isso dava
~100 ms (CPU 4x) só em Estoque. Medido: 2000 números em 72,5 ms do jeito
antigo, contra 1,5 ms com o formatador reaproveitado.

Correção: `src/lib/formato.ts` (`numeroBR`, `dataBR`, `horaBR`,
`formatadorData`) guarda e reaproveita os formatadores. O texto sai idêntico,
e há teste comparando os dois jeitos (`src/lib/__tests__/formato.test.ts`).
Foram trocados 74 pontos em 31 arquivos, incluindo `formatBRL`/`formatQtd` e a
data do restaurante (`src/lib/calculo/dia.ts`).

### Resultado

- Pior toque na abertura de Configurações → Minha conta (CPU 4x): de 296 ms
  para 128 ms.
- Maior travada na abertura (CPU 4x) em toda tela do app: 160 a 260 ms.
- O que sobra é o próprio Next/React (react-dom e a inicialização dos
  módulos). O código das telas ficou em ~20 ms.

## As travas

1. **Lint** (`eslint.config.mjs`, roda no CI e no editor) bloqueia:
   - `toLocaleString`/`toLocaleDateString`/`toLocaleTimeString` e `new Intl.…`
     fora de `src/lib/formato.ts`;
   - `import` de `recharts` fora de `src/components/charts/` e `Grafico*.tsx`;
   - `import` estático do cliente do Supabase no navegador (`@/lib/supabase/client`);
   - `import` de `src/app/preview/…` (código e dados da demo) fora da demo.
2. **Orçamento no CI** (`e2e/orcamento-desempenho.spec.ts`), em toda tela do app
   e da demo. A lista sai das pastas de `src/app`, então tela nova entra sozinha.
   - **Peso:** o JS que a tela executa ao abrir tem teto de 215 KB comprimido,
     e Supabase no navegador, Recharts, @react-pdf e os dados da demo (no app)
     não podem estar na abertura. Não depende da máquina. Conferido contra o
     código antigo: reprova com 27 apontamentos, cada um com a tela e o motivo.
   - **Travada:** com a CPU 4x mais lenta, a maior tarefa da abertura (o
     máximo que um toque espera) fica abaixo de 450 ms no app e de 750 ms na
     demo. Cada tela abre 2 vezes e vale a menor medida.
3. **Testes específicos** (`e2e/desempenho.spec.ts`): troca de seção na cozinha
   e em Configurações abaixo de 200 ms com CPU 4x, preparação em segundo plano
   da cozinha, régua da meta, navegação sem recalcular o estilo da página e o
   medidor de toque lento (abaixo).
4. **Medidor em produção** (`MedidorToque` no layout raiz + `/api/desempenho`):
   todo toque de quem usa o sistema que passe de 200 ms vira uma linha no log
   do servidor, com o script que segurou o toque:
   - `origem: "app"`: nosso código (o arquivo do `/_next/`);
   - `"extensao"`: extensão do navegador da pessoa;
   - `"barra-vercel"`: a própria barra da Vercel (só aparece pra quem é da
     equipe na Vercel, e pesa na página);
   - `atrasoMs` alto: outra tarefa ocupava a tela (carga pesada, se
     `segundosDesdeAbertura` for baixo); `processamentoMs` alto: o código do
     próprio toque é lento; `apresentacaoMs` alto: desenhar o resultado é caro.

   **Onde ver:** Vercel → projeto → Logs, filtre por `toque-lento`. Não grava
   no banco nem guarda dado da pessoa (só a tela, o elemento e os scripts).
   Exemplo real (do teste):
   `{"tipo":"toque-lento","rota":"/preview/visao-geral","evento":"click","processamentoMs":351,"totalMs":352,"scripts":[{"origem":"pagina","chamada":"MAIN#conteudo.onclick","ms":349}]}`

## Regras pra tela nova

- Biblioteca pesada usada só depois de uma ação (gráfico, PDF, editor, cliente
  do Supabase no navegador) entra com `next/dynamic` ou `import()` na hora do
  uso, nunca no topo de um componente da tela.
- Número e data na tela: `numeroBR`/`dataBR`/`horaBR` de `@/lib/formato` (ou
  `formatBRL`, `formatQtd`… de `components/charts/format`).
- Código e dados da demo (`src/app/preview/…`) não são importados no app.
- Clique que monta muita coisa: marque o estado na hora e deixe o conteúdo
  pesado vir depois (`startTransition` / `useDeferredValue`), como nas seções de
  Configurações e no menu da cozinha.
- Teste com a CPU 4x mais lenta (DevTools → Performance → CPU: 4x slowdown).
  É o tablet e o celular simples da cozinha.
- Teste de ponta a ponta que digita ou toca logo depois de abrir a tela:
  `esperarHidratado(elemento)` (`e2e/apoio.ts`) antes. Senão o toque cai antes
  de o React ligar a tela e o teste falha à toa.
- Se o orçamento reprovar, a mensagem diz a tela e o que entrou. Corrija o
  import. Só suba um teto com o motivo escrito aqui.

## Ferramentas de investigação

Usadas nesta revisão (fora do repositório, reproduzíveis):

- Build com `productionBrowserSourceMaps: true` (só local, não commitar), pra
  saber de que módulo vem cada byte e cada milissegundo do perfil de CPU.
- Playwright + `PerformanceObserver` de `long-animation-frame` (diz qual script
  segurou cada quadro) e `event` (espera, processamento e apresentação de cada
  toque), com `Emulation.setCPUThrottlingRate` 4x.

## Tentado e descartado

- **`<Suspense>` em volta do conteúdo de toda tela** (pra o React não ligar a
  página inteira dentro de um toque feito antes da hidratação): medido sem
  ganho. O toque cai dentro do conteúdo, e aí o React precisa ligar o conteúdo
  inteiro do mesmo jeito. Desfeito.
- **Medir o toque simulando cliques durante a carga:** os números variavam 5x
  entre rodadas (dependia de onde o clique caía). Troquei pela maior travada
  na abertura, que varia ±20%.

## Fica pra depois

- **Escalas (demo)** é a tela mais pesada: ~530 ms de travada (CPU 4x) pra
  desenhar a grade do mês inteiro. Abrir na semana atual e desenhar o resto
  sob demanda resolveria, mas muda a tela, então é decisão de produto.
- **CMV, Proteínas e Segurança (demo):** o gráfico aparece logo depois de abrir
  e trava ~400 ms (CPU 4x) nessa hora. Dá pra carregar só quando ele entra na
  tela.
- A cada abertura de tela, o Next pré-carrega em segundo plano as 11 a 13 telas
  do menu. Cada pedido passa pelo middleware, que confere a sessão no Supabase.
  Não pesa no toque (medido), mas pesa no servidor. Avaliar `prefetch` só ao
  passar o mouse quando houver muitos restaurantes.
