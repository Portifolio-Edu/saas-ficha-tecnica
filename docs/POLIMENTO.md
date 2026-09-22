# Registro de polimento (Impeccable), tela por tela

Cada tela polida vira **um commit próprio** e cada mudança no código leva um
comentário `POLIMENTO <tela>` dizendo o que mudou e como era antes.

**Ponto de partida de tudo:** commit `e5e84b8` (antes do primeiro polimento).

## Como achar e desfazer

- Achar todas as mudanças de uma tela: `grep -rn "POLIMENTO visao-geral" src`
- Desfazer uma tela inteira (mantém as outras): `git revert <commit da tela>`
- Desfazer um arquivo só: `git checkout e5e84b8 -- <caminho do arquivo>`
  (e ajustar as chamadas que o comentário do arquivo indicar)
- Voltar tudo pro estado anterior ao polimento: `git revert` de cada commit
  abaixo, do mais novo pro mais antigo.

Se algo quebrar numa tela, olhe primeiro os arquivos listados na seção dela.

---

## 1. Visão Geral — commit `331d6a3`

**Arquivos:** `src/app/visao-geral/VisaoGeralClient.tsx`,
`src/components/instrumentos/ReguaCalibrada.tsx`,
`src/components/instrumentos/MostradorNivel.tsx` (os dois componentes só são
usados nesta tela).

**Dado errado ou enganoso (corrigido):**
- Rodapé das réguas mostrava "Tol: ±2.5%" fixo, que não era a faixa desenhada.
  Agora mostra a faixa real ("Faixa aceitável: 28–35%").
- Diferença entre porcentagens aparecia como "%" ("-9.0%"). Agora é ponto
  percentual com vírgula ("−9,0 p.p.").
- Perda do mês mostrava "+201.0 vs meta", sem R$. Pratos fora do alvo mostrava
  "+1.0 un" e uma escala fixa 0–6.
- Composição do prato somava peso líquido × preço, sem fator de correção, e
  não batia com o custo da porção. Agora usa `linhasCustoDetalhado`, a mesma
  conta de Receitas e CMV.
- Datas do fechamento apareciam em ISO ("2026-08-01"). Agora dd/mm/aaaa.

**Layout e leitura:**
- Tabela de pratos com colunas alinhadas (grid único) e um cabeçalho, em vez
  de rótulos repetidos em cada linha. Nome do prato não é mais cortado.
- Saíram o avatar com iniciais ("PI" repetido), os chips "CAL · 01" e
  "EST · 01", os halos e brilhos coloridos e os pontos pulsando.
- Perdas recentes virou lista: prato, quantidade com unidade, motivo, custo e
  data. Antes eram até 3 chips numa faixa vermelha.
- "Kanban de produção ativa" virou o link "Abrir quadro de produção".
- Tela deixou de bloquear seleção de texto (`select-none`).
- Cores de risco e OK seguem o tema (`color-mix` sobre `--sinal` e
  `--sucesso`), em vez de um vermelho fixo do tema escuro.

**Não mexido de propósito (decisão sua):** títulos "Centro de Inteligência &
Calibração Operacional", "Engenharia de Cardápio & Performance Unitária" e o
selo "Motor operacional ativo".

---

## 2. Shell da demo (cabeçalho e menu) — commit `3f0b207`

**Arquivo:** `src/components/ficha/DemoShell.tsx` (vale para todas as telas de `/preview`).

- No celular, o título quebrava ("Visão / Geral") e o seletor de tema passava
  da tela ("ESCURO" cortado). Agora o título fica numa linha e, abaixo de 640px,
  os botões de tema mostram só o ícone (com `aria-label` e `aria-pressed`).
- Rodapé do menu: o nome do restaurante vai em até 2 linhas (antes cortava
  "Cantina Bella ..."). "SISTEMA OPERACIONAL ATIVO", que quebrava em 3 linhas,
  virou "Modo demonstração".

---

## 3. Sistema visual — commit `b9f1cef`

**Arquivos:** `PRODUCT.md` (novo), `DESIGN.md` (novo), `src/app/globals.css`,
`src/app/layout.tsx`. Vale para todas as telas.

- `PRODUCT.md` registra quem usa (chef no tablet da bancada) e o diferencial.
  `DESIGN.md` registra o sistema ("A Bancada Calibrada"): cores com significado,
  escala de tipo, toque de 44px e regras como "The Stage Color Rule".
- **Tema escuro em grafite neutro**, sem azul-marinho. Valores antigos no
  comentário `SISTEMA` do `globals.css`; pra voltar, troque os valores de
  `[data-theme="dark"]` pelos antigos.
- **Tokens de etapa** `--etapa-estoque|producao|produzido|perda` (e `-texto`),
  com variantes mais claras no escuro. Antes eram hex fixos na tela de Produções.
- `--alvo-toque: 44px` e seleção de texto visível.

## 4. Shell, 2ª passada — commit `adc4047`

**Arquivos:** `src/components/ficha/DemoShell.tsx`, `src/components/ia/BotaoAgenteIa.tsx`.

- Saiu o botão flutuante do Agente IA. Ele repetia o da barra superior, cobria
  a coluna Perdas e, como os dois escutam o mesmo evento, abrir o agente por um
  botão de tela abria **dois** modais. Pra voltar: recolocar
  `<BotaoAgenteIa variante="flutuante" />` antes do `<ToastContainer />`.
- Botões de tema e do agente com 44px de altura.

## 5. Produções — commit `94a84c0`

**Arquivo:** `src/app/producoes/ProducoesClient.tsx`. As correções de baixa de
estoque do commit `e5e84b8` continuam iguais; só a apresentação mudou.

- O quadro cabe na altura da tela a partir de 1024px e cada coluna rola por
  dentro. Antes, "Em estoque" esticava a página pra ~2.700px e "Perdas" sumia.
- Cores das etapas vêm dos tokens. No escuro, o texto da etapa ficou legível
  (antes azul-escuro sobre fundo escuro).
- "Registrar produção" subiu pro cabeçalho do quadro (antes ficava abaixo dele).
- Todos os alvos de toque da tela com 44px ou mais: antes 17 a 23 ficavam
  abaixo de 40px no tablet; agora nenhum.
- Card de capacidade: o número de lotes virou o destaque; "Gargalo" virou
  "Falta primeiro".
- "Registrar Descarte / Perda" em vermelho em todo card produzido virou
  "Registrar perda" neutro com ícone: o vermelho fica só pra perda que
  aconteceu. Em produção, a perda virou botão de ícone.
- Plural certo ("15 porções"), validade em dd/mm, modal de perda com 44px.

---

## 6. Direção premium (padrão Stripe / Linear / Toast) — todas as telas

Pedido: "elevar o design mais ainda... ferramenta premium". Direção escolhida:
**padrão premium de SaaS**, em todas as telas, com a régua de Stripe (painel),
Linear e Toast/Square. O sistema está descrito no `DESIGN.md` (reescrito) e o
posicionamento no `PRODUCT.md`.

**Voltar tudo pro visual anterior (padrão "Bancada Calibrada"):** `git revert`
dos commits abaixo, do mais novo pro mais antigo. Pra voltar só uma tela, reverta
só o commit dela. Os comentários no código começam com `SISTEMA premium` ou
`POLIMENTO <tela>`: `grep -rn "SISTEMA premium" src`.

| Commit | O que mudou | Onde olhar se quebrar |
|---|---|---|
| `950f86d` | Tokens novos (névoa, papel, tinta, acento `--marca`), fonte Hanken Grotesk, bordas de 1px, pesos até 700, escuro grafite | `globals.css`, `layout.tsx`, `Card/Badge/Kpi/Input/EmptyState` |
| `32e3e97` | Casca única `ShellPremium` pro app e pra demo (menu Linear, barra de 56px, tema num botão) | `components/ficha/ShellPremium.tsx`, `AppShell.tsx`, `DemoShell.tsx` |
| `957962f` | Visão Geral: faixa de 4 métricas, bloco "Onde a margem está vazando" com R$ deixado na mesa, tabela calma | `visao-geral/VisaoGeralClient.tsx`, `MostradorNivel.tsx` |
| `4f29ec6` | Vírgula decimal em todas as telas (`formatNumero`, `formatQtd`) | `components/charts/format.ts` |
| `62d579c` | Cabeçalho de tabela em caixa normal (regra global) | `globals.css` (bloco `thead`) |
| `c51b7d5` | Checklists: linha de 48px, caixa de 24px | `checklists/ChecklistsClient.tsx` |
| `951c3a8` | Produções: botões de etapa tingidos (não cheios), cabeçalho numa linha | `producoes/ProducoesClient.tsx` |
| `1f13708` | Estoque: botões neutros, selos com tokens | `estoque/EstoqueClient.tsx` |
| `9b97d26` | Nutricional: sem degradê, agente demo neutro | `nutricional/*`, `InsumoNutricaoForm.tsx` |
| `0e6374c` | Proteínas: linha do FC cadastrado sempre visível no gráfico | `proteinas/ProteinasClient.tsx` |
| `119b219` | Segurança: temperatura com vírgula, local sem faixa | `seguranca/SegurancaClient.tsx` |
| `7e2fb4f` | Receitas: uma barra de ações só | `receitas/ReceitasClient.tsx` |
| `238fb4e` | Títulos de seção em 16px | várias telas |
| `29358b3` | Nenhum alvo de toque abaixo de 40px em Estoque e Visão Geral | `EstoqueClient.tsx`, `VisaoGeralClient.tsx` |
| `8a5c17f` | **Bug:** botão e logo do login/cadastro invisíveis (`--gradient-accent` nunca existiu) | `login/LoginForm.tsx`, `cadastro/CadastroForm.tsx` |
| `fe84bf1` | Caixa alta que sobrou (ficha de produção, agente demo, lote) | arquivos citados no commit |
| `8722f6d` | Tamanhos e cores fora da escala do `DESIGN.md` (detector do impeccable) | comentário no topo de cada arquivo |
| `e0710bd` | Título da barra igual ao item do menu | `page.tsx` de cada tela |
| `35b9e80` | **Bug:** CMV mostrava "0,0%" e gap "-21,8 p.p." sem estoque contado; agora "—" | `cmv/CmvClient.tsx` |

**Ficou de fora de propósito:** o modal do agente IA (só demo) ainda tem dois
degradês antigos; `ReguaCalibrada.tsx` e `components/direcoes/*` não são mais
usados por nenhuma tela (dá pra apagar depois). PDFs seguem em Helvetica, a
fonte embutida do react-pdf.

**Verificação:** `tsc`, `eslint`, 51 testes e `next build` passando; detector
do impeccable sem nenhum anti-padrão nas telas; nenhum alvo de toque abaixo de
40px no tablet (Visão Geral, Produções, Checklists, Estoque).

---

## 7. Relatórios — "o que decidir agora" + relatório por fechamento

Pedido: "focar na página de relatórios, ela é importantíssima". Escolha do
usuário: **os dois** (topo ao vivo + relatório por fechamento com PDF).

**Arquivos:** `src/app/relatorios/RelatoriosClient.tsx` (reescrito; versão
anterior: `git show 96326ef:src/app/relatorios/RelatoriosClient.tsx`),
`relatorios/page.tsx` e `preview/relatorios/page.tsx` (passam o nome do
restaurante pro cabeçalho do PDF), `ShellPremium.tsx` (menu e barra somem na
impressão), `globals.css` (bloco `@media print`), `preview/fixtures.ts`
(ordem dos fechamentos).

**Números que estavam errados:**
- "Total identificado" contava o lote perdido duas vezes (ele já está dentro da
  quebra de estoque). Agora a quebra de cada fechamento é aberta em previsto
  pelas fichas + perda registrada + sem explicação.
- Na demo, `fechamentos[0]` era agosto (fixture em ordem crescente; o banco
  entrega do mais novo pro mais antigo). Isso afetava Relatórios e a Visão
  Geral da demo. Agora a fixture segue a ordem do banco e Relatórios ordena por
  conta própria.
- Linha de meta do gráfico de margem usava a meta do primeiro prato pra todos.
- "Quebra acumulada" misturava períodos e deixava gap negativo apagar positivo.
- **Novo aviso:** quando parte do faturamento vem de itens sem ficha (bebidas,
  sobremesas), o relatório diz quanto (R$ 10.488 na demo, 27%): esse consumo
  infla o "sem explicação".

**Como ficou:** em cima, pendências de hoje ordenadas por urgência
(temperatura, depois o que tem R$, depois estoque e rendimento), cada uma
levando à tela onde se resolve. Embaixo, abas por fechamento: faixa de 4
métricas, barra "para onde foi o dinheiro do estoque" (cores validadas pra
daltonismo, valores escritos na legenda), pratos do período com quanto faltou
pra meta, lotes perdidos e tabela por responsável no período. O botão
"Imprimir ou salvar PDF" imprime só o relatório, sempre no tema claro.

**Reverter:** `git revert` do commit `polimento(relatorios)`; a correção da
fixture é um commit separado (`fix(demo)`).
