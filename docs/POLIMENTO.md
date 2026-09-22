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
