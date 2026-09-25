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

---

## 8. Checklists — visão "Praças" com fotos de referência

Pedido do usuário: dentro de Checklists, uma subvisão por praça/setor com tudo
o que precisa estar lá pra praça ficar completa e fotos da praça montada (mais
de uma por praça, uma por elemento), pra organização continuar igual mesmo se a
equipe inteira mudar.

**Arquivos:** `src/components/checklists/PracasView.tsx` (novo),
`src/app/checklists/ChecklistsClient.tsx` (abas "Checklists do turno" e
"Praças"), `src/app/checklists/actions.ts` e `src/lib/dados/checklists.ts`
(enviar/remover foto), `src/lib/dominio/checklist.ts` (`ChecklistFoto`),
`src/lib/imagem/reduzirImagem.ts` (novo), `preview/fixtures.ts` (3 praças da
demo) e a migration `supabase/migrations/20260923120000_checklist_fotos_pracas.sql`.

- Praça = checklist com `momento = 'praca'` (já existia no banco). Itens e
  marcação no turno são os mesmos; as fotos ficam na tabela nova
  `checklist_fotos` e no bucket `pracas-fotos` (mesma regra de acesso do bucket
  de receitas).
- Foto com legenda do elemento ("Bancada de montagem"), ampliação em tela
  cheia com setas, remoção no modo de edição.
- Foto reduzida no aparelho (lado maior 1600px, ~300 KB) antes de subir.
  **Bug corrigido junto:** o upload de foto das receitas mandava o arquivo
  original, e foto de celular passava do limite de 1 MB das server actions.
- Na demo as fotos ficam só na sessão (não há foto real da cozinha pra
  mostrar, e foto inventada seria dado falso).

**Antes do deploy real:** aplicar a migration `20260923120000_checklist_fotos_pracas.sql`.
**Reverter:** `git revert` do commit `polimento(checklists-pracas)` e, se a
migration já foi aplicada, rodar o bloco "Reverter" do topo dela.

---

## 9. Integrações — PDVs, iFood e importação sem integração

Pedido do usuário: uma parte pra integrar com os PDVs do mercado e com o iFood,
e uma alternativa quando o PDV não libera integração ("a ferramenta entra pra
agregar com o PDV"). Escolhas: simular conectado na demo; construir a
importação de XML + planilha de verdade; listar Saipos, Consumer, Goomer, Anota
AI, Colibri, TOTVS Chef, Stone, Cielo, PagSeguro, Linx Degust e Menew.

**Arquivos novos:** `src/app/integracoes/` (tela), `src/app/preview/integracoes/`
e `src/app/preview/integracoesDemo.ts` (dados simulados), `src/components/integracoes/ImportadorVendas.tsx`,
`src/lib/integracoes/` (leitura do XML fiscal, da planilha, sugestão de ficha,
catálogo) e 13 testes em `src/lib/integracoes/__tests__`.
**Alterados:** `ShellPremium.tsx` e `preview/page.tsx` (item no menu),
`cmv/CmvClient.tsx` (recebe as vendas importadas e o faturamento real; link pra
Integrações).

**Real:** XML de NFC-e (mod 65) e SAT, em lote. Notas canceladas (protocolo ou
evento) e repetidas ficam de fora; NF-e mod 55 é ignorada (é nota de compra).
Planilha CSV com colunas sugeridas pelo cabeçalho. Cada produto do PDV é ligado
a uma ficha (sugestão pelo nome, tolerante a abreviação e erro de digitação) ou
marcado "não tem ficha"; a escolha fica lembrada no navegador. "Levar pro
fechamento de CMV" preenche período, vendas por prato e faturamento real
(incluindo bebidas), que alimenta o aviso de cobertura em Relatórios.
Nenhum arquivo sai do navegador.

**Simulado (só /preview, com selo "demo"):** iFood e Saipos conectados, pedidos
chegando, "Conectar" nos outros PDVs. No app, tudo "Em breve".

**Ainda não:** .zip e .xlsx (pede pra descompactar / salvar como CSV); o
mapeamento produto → ficha vai pro Supabase na fase de backend.

**Reverter:** `git revert` do commit `feat(integracoes)`.

---

## 10. Praças por área, com fotos e lista em cada área

Pedido do usuário: uma praça tem várias partes (pista fria, bancada de
montagem, geladeira, pista quente...), e cada uma precisa do registro visual e
da lista. O cliente cria quantas praças quiser, com o nome que quiser.

**Arquivos:** `src/components/checklists/PracasView.tsx` (reescrito; versão sem
áreas: `git show 80452ce:src/components/checklists/PracasView.tsx`),
`ChecklistsClient.tsx` (handlers de área e renomear; título acompanha a aba),
`actions.ts` e `lib/dados/checklists.ts` (renomear praça, criar/renomear/apagar
área), `lib/dominio/checklist.ts` (`ChecklistArea`, `areaId` em item e foto),
`preview/fixtures.ts` (as 3 praças da demo divididas em áreas) e a migration
`supabase/migrations/20260923140000_pracas_areas.sql`.

- Cada área tem quantas fotos precisar (com detalhe opcional, ex.: "vista de
  cima") e a própria lista marcável no turno. A ampliação navega pelas fotos
  daquela área.
- Área criada com nome livre ou com um toque nas sugestões (Pista fria, Pista
  quente, Bancada de montagem, Geladeira de apoio, Forno, Estoque do dia).
- Praça e área podem ser renomeadas no modo "Editar praça". Apagar uma área
  apaga os itens e as fotos dela (com confirmação dizendo quantos).
- Item ou foto sem área (de antes desta mudança) aparece num bloco "Geral".

**Antes do deploy real:** aplicar `20260923140000_pracas_areas.sql`, depois da
`20260923120000_checklist_fotos_pracas.sql`.
**Reverter:** `git revert` do commit `polimento(pracas-areas)` e o bloco
"Reverter" do topo da migration, se já aplicada.

## 11. Equipe e acessos: dono, gestor, estoquista e cozinha

Commits `42faa4f` (banco), `c966f91` (telas por papel e Equipe) e `cf109b5`
(modo cozinha e "Ver como" na demo). Pedido do dono do produto: funcionário
não pode ter acesso total às informações do restaurante nem ao estoque.

| Papel | Entra com | Vê |
|---|---|---|
| Dono | e-mail e senha do cadastro | tudo; cria gestor |
| Gestor | usuário e senha criados pelo dono | tudo da operação |
| Estoquista | usuário e senha criados pelo dono ou gestor | Insumos, Estoque, Proteínas e o CMV do estoque (sem faturamento, CMV % ou margem) |
| Cozinha | aparelho conectado por código, sem senha | checklists, temperaturas, produção e perda, fichas sem custo, contagem cega |

- **O bloqueio é no banco (RLS)**, não só no menu: a sessão do estoquista ou da
  cozinha recebe zero linhas das tabelas de preço, margem e faturamento, mesmo
  chamando a API por fora. Teste: `supabase/testes/papeis.sql` (54/54).
- **Contagem cega:** a cozinha conta sem ver o saldo; o dono e o gestor veem a
  diferença em quantidade e R$ no topo de Estoque e decidem se ajustam.
- **Produção da cozinha baixa o estoque pelo servidor**, calculada pela ficha;
  a cozinha não consegue mexer em saldo.
- **Quem fez:** a cozinha escolhe o nome no aparelho (lista em Equipe) e cada
  registro sai com ele; o banco guarda também qual login gravou (`criado_por`).
- Demo: seletor "Ver como" no topo; `/preview/equipe` e `/preview/cozinha`.

**Onde mexer:** `src/lib/auth/papeis.ts` (quem abre qual tela),
`supabase/migrations/20260925120000_equipe_papeis.sql` (matriz de acesso),
`src/app/equipe`, `src/app/cozinha`, `src/components/cozinha/CozinhaApp.tsx`.
**Precisa no servidor:** `SUPABASE_SERVICE_ROLE_KEY` (ver `docs/PRODUCAO.md`).
**Reverter:** `git revert` dos três commits e
`supabase/reverter/20260925120000_equipe_papeis.sql` no banco.

## 12. Cozinha → painel do gestor: conexão verificada

Teste do usuário: registrou uma produção no modo cozinha e ela não apareceu
no painel. Era a demonstração (`/preview`): lá as ações da cozinha só
respondiam "ok" e não gravavam nada.

- **Demo:** agora existe um "banco" da demo no navegador
  (`src/lib/demo/armazem.ts`). A cozinha grava produção, perda, checklist,
  temperatura e contagem cega (`src/app/preview/cozinha/acoesDemo.ts`), com as
  regras do app: a produção baixa o estoque pela ficha e lança "saída
  produção". Produções, Estoque (saldo, movimentações, contagens), Checklists,
  Segurança alimentar, Relatórios e Visão geral leem de lá. Aplicar uma
  contagem cega na demo ajusta o saldo e lança a movimentação
  (`src/lib/demo/contagens.ts`). Botão "Recomeçar a demonstração" em `/preview`.
- **Sistema de verdade:** o banco já ligava as duas pontas; agora está provado
  em `supabase/testes/cozinha_para_gestao.sql` (15/15): a cozinha grava como
  as server actions gravam e o gestor lê com as consultas das telas.
- **Tela aberta se atualiza sozinha:** `AtualizacaoAutomatica` pede os dados de
  novo a cada 30 s e quando a aba volta a ficar visível, em Produções,
  Checklists, Segurança, Estoque, Visão geral, Relatórios e no tablet.
  Contagens cegas liam as props só na abertura; agora acompanham.
- **"Hoje" no fuso de Brasília** (`src/lib/calculo/dia.ts`): o servidor da
  Vercel roda em UTC e o dia virava às 21h. Checklist feito às 20h sumia do
  painel às 21h; o lote da noite saía com a data de amanhã.
- Verificado no navegador: produção, baixa, temperatura, checklist e contagem
  feitos no tablet da demo aparecem no painel, sem erro no console.

**Reverter:** `git revert` do commit. Pra só desligar a atualização
automática, tire `<AtualizacaoAutomatica />` das páginas.

## 13. Kanban de produção no modo cozinha, feito pro toque

Pedido: a aba Produção do tablet tinha só formulário + lista; precisa do mesmo
quadro do gestor e responder bem ao dedo.

- **Quadro na cozinha** (`src/components/cozinha/QuadroProducaoCozinha.tsx`):
  A produzir → Em produção → Pronto → Perda, nas cores de etapa do sistema.
  "A produzir" lista as fichas (com busca) e não mostra "lotes possíveis",
  porque isso sai do saldo do estoque, que a cozinha não vê.
- **Arrastar com o dedo** (`src/components/producoes/useArrastoToque.ts`):
  segura ~0,2 s e o card levanta (vibra no Android) e segue o dedo; deslizar
  rápido continua rolando a coluna. A coluna de destino acende; coluna
  proibida fica vermelha e não aceita. Perto da borda o quadro rola sozinho,
  mais rápido quanto mais perto. Funciona com mouse também.
- **Folhas grandes:** "Começar" pede a quantidade com − / + de 64px e atalhos
  de 1, 2 e 3 receitas; perda tem os motivos comuns em botões.
- **Desfazer** por 6 s depois de Pronto e de Perda. Em produção mostra há
  quanto tempo o lote começou.
- **Quadro do gestor** passou a usar o mesmo motor de arrasto: antes era o
  arrastar nativo do HTML, que não funciona com toque na maioria dos tablets.
- Verificado com toque simulado (segurar, arrastar, soltar) em tablet deitado,
  em pé e celular, e com mouse no gestor; sem erro no console.

**Reverter:** `git revert` do commit. Versão anterior da aba:
`git show 38d1d82:src/components/cozinha/CozinhaApp.tsx`.

## 14. Fichas técnicas no tablet (modo cozinha)

Pedido: a ficha no tablet tem que garantir o padrão da casa — foto do
empratamento, preparos que compõem o prato com foto e modo de preparo,
quantidades bem descritas e fáceis de ver.

- `src/components/cozinha/FichasCozinha.tsx` substitui a lista simples:
  cartões com foto, busca e filtro Pratos / Preparos.
- Ficha aberta: foto do empratamento grande (toque amplia em tela cheia),
  "Vou fazer" com − / + que recalcula tudo, "Separe antes de começar" com
  marcação por item e peso bruto quando o insumo perde peso na limpeza
  (fator de correção), passo a passo grande com "Agora" na etapa atual e
  marcação de feita; no fim, lembrete de conferir com a foto / etiquetar.
- Preparos da casa usados no prato abrem a própria ficha, com trilha
  (Fichas › Prato › Preparo) e aviso de quanto o prato usa.
- Quantidades de bancada (`src/components/cozinha/bancada.ts`, com testes):
  0,15 l → 150 ml, 0,01 kg → 10 g, 1 un de massa → 1 disco.
- Sem foto: aviso pedindo ao gestor pra subir em Receitas e fichas.
- A tela não apaga com a ficha aberta (Wake Lock, onde o navegador deixa).
- Dados: `dados_cozinha` já mandava sub-receita e fator de correção; o
  tablet passou a usar (`IngredienteFicha.receitaId` e `fatorCorrecao`).
- Demo: passo a passo completo em todos os preparos e pratos e fotos
  ilustrativas em 4 pratos (Parmegiana e Caprese sem foto de propósito).

**Reverter:** `git revert` do commit.

## 15. Manipulação de proteínas no modo cozinha + agente de IA pro estoquista

- **Proteínas no tablet** (`src/components/cozinha/ProteinasCozinha.tsx`, aba
  "Proteínas"): escolhe a peça, pesa bruto, limpo e aparas; o rendimento
  aparece na hora contra o padrão da casa (fator de correção do cadastro).
  Mais de 2 pontos abaixo fica amarelo; mais de 5, vermelho e o motivo é
  obrigatório. Limpo + aparas maior que bruto bloqueia ("confira a balança").
  Últimos lotes com quem fez e o rendimento.
- **Sem R$ na cozinha:** banco novo em
  `supabase/migrations/20260925150000_cozinha_proteinas.sql` (aplicada):
  `registrar_processamento_cozinha` grava o lote com o valor pago por kg do
  cadastro do insumo, no servidor; `lotes_proteina_cozinha` lista sem valor.
  A tabela continua fechada pra cozinha na RLS. Teste:
  `supabase/testes/proteinas_cozinha.sql` (10/10). Reverter:
  `supabase/reverter/20260925150000_cozinha_proteinas.sql`.
- O gestor vê os lotes do tablet em Manipulação de proteínas (custo real
  por kg limpo, como antes). Na demo, a tela do gestor lê o que o tablet grava.
- **Agente de IA pro estoquista** (commit `65d4f1a`): versão "estoque" do
  agente (nota fiscal, chegada, perda, estoque mínimo; foto vira nota
  fiscal), sem tabela nutricional. Cozinha segue sem agente. Por enquanto o
  agente é só demonstração; o de verdade vem com o backend (n8n).

**Reverter:** `git revert` do commit e o script de reverter no banco.

### 15.1 Ajuste: "Registrar lote" sempre ativo + observações

Retorno do dono: o botão parecia quebrado (ficava cinza até os pesos e o
motivo estarem certos, sem dizer por quê). Agora fica sempre ativo; ao tocar,
diz o que falta ("Digite o peso bruto", "Confira a balança", "Rendeu abaixo
do padrão: escolha o motivo ou escreva nas observações") e leva ao campo.
Campo **Observações** sempre visível; vale como motivo quando o rendimento
fica abaixo do padrão. Motivo e observação são salvos juntos ("Descongelou
errado — ficou fora da câmara").

### 15.2 Ajuste: escolher qualquer proteína cadastrada

Retorno do dono: a seleção parecia uma lista fixa. Agora nenhuma peça vem
marcada; o tablet mostra todas as proteínas cadastradas (Insumos, categoria
proteína) com busca ("salm" → Salmão), as usadas por último no topo, e a
contagem ("11 proteínas cadastradas"). Escolhida, a lista fecha e fica
"Trocar". Demo com mais 7 cortes (picanha, filé mignon, costela, salmão,
tilápia, lombo, coxa e sobrecoxa).

## 16. Escalas — fase 2 (tela, banco e tablet)

Pedido do dono: "cozinha vê a escala mas não pode alterar; proibido folga
sexta ou sábado; aplique a fase 2". Detalhes em `docs/ESCALAS.md`.

- **Escalas** (menu Gestão, só dono e gestor): escala do mês por equipe com
  sexta/sábado marcados e linha "Trabalhando" (vermelha abaixo do mínimo);
  alertas pendentes de hoje em diante (os de dias passados ficam
  recolhidos); detalhe do dia com "Lançar ocorrência" e "Editar escala";
  abas Equipe, Prontuário e Regras. No desktop o mês inteiro cabe sem rolar;
  no celular a grade abre no dia de hoje.
- **Tablet da cozinha**: aba **Escala**, só leitura ("Só o gestor altera a
  escala"): quem trabalha hoje, quem folga, quem não vem, e a semana de cada
  um. Ausência aparece como "Ausente", nunca o motivo.
- **Sexta e sábado**: travado no formulário, na validação, no banco e no
  motor. 12x36/24x48 só pra apoio.
- **Coerência gestor × cozinha**: `escala_publica` passou a separar falta/
  atestado (só em dia de trabalho) de afastamento (período todo), e o motor
  decide ocorrências sobrepostas por força, não pela ordem. Migration
  `20260926120000_escalas_publica_ausencias.sql` (aplicada).
- Ajuste junto: avisos de lint em `ProteinasCozinha.tsx` e `RegrasView.tsx`.

Testes: 115 unitários (37 de escalas), SQL 24/24 e 6/6, 36 checagens no
navegador (1440, 820 e 390 px) sem erro no console.

**Reverter:** `git revert` do commit "escalas: fase 2" e, no banco,
`supabase/reverter/20260926120000_escalas_publica_ausencias.sql` seguido de
`supabase/reverter/20260926100000_escalas.sql`.
