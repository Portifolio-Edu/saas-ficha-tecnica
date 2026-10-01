---
name: Ficha Técnica
description: Inteligência de custos e controle de cozinha, com o acabamento de uma ferramenta premium.
colors:
  tinta: "#16171A"
  tinta-sub: "#4A4D55"
  tinta-faint: "#6B6F78"
  nevoa: "#F6F6F7"
  papel: "#FFFFFF"
  papel-elevado: "#F3F3F5"
  papel-hover: "#ECECEF"
  marca: "#5B4FE0"
  sinal: "#D92D20"
  sucesso: "#067647"
  aviso: "#B54708"
  etapa-estoque: "#2563EB"
  etapa-producao: "#D97706"
  etapa-produzido: "#059669"
  etapa-perda: "#DC2626"
  grafite-fundo: "#0B0B0C"
  grafite-panel: "#131315"
  grafite-elevado: "#1A1A1D"
  giz: "#EDEDEF"
  marca-escuro: "#8F87FF"
  veu-modal: "rgba(0,0,0,0.5)"
typography:
  titulo-pagina:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  numero-destaque:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.015em"
  numero-card:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1
  titulo-secao:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
  titulo-barra:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  corpo-operacao:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  corpo:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  detalhe:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  meta:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
  rotulo:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "9999px"
spacing:
  toque: "44px"
  toque-desktop: "40px"
  card: "20px"
  secao: "24px"
components:
  botao-primario:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  botao-secundario:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 14px"
  card:
    backgroundColor: "{colors.papel}"
    rounded: "{rounded.lg}"
    padding: "20px"
  selo-status:
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  item-menu:
    textColor: "{colors.tinta-sub}"
    rounded: "{rounded.md}"
    height: "40px"
---

# Design System: Ficha Técnica

## Overview

**Creative North Star: "A ferramenta cara que some na tarefa"**

É o padrão premium de SaaS, feito sem ironia e escolhido pelo dono do produto.
A régua de acabamento vem de três produtos: o painel do Stripe (números
impecáveis, cor usada com precisão), o Linear (densidade na medida certa e um
escuro de verdade) e os sistemas de restaurante Toast/Square (alvos grandes pra
quem opera no tablet). O resultado é calmo e preciso. A cor só aparece quando
significa alguma coisa, e o dado mais importante da tela é sempre o maior.

A identidade anterior (ardósia, Jakarta em peso 900, caixa alta, pílulas
coloridas, réguas grossas em cards separados) foi substituída. Continuam o hub
agrupado, as cores das etapas de produção e todas as funções.

**Key Characteristics:**
- Neutros calmos (névoa, papel e tinta quase-preta); escuro em grafite neutro no padrão Linear.
- Bordas de 1px fazem o trabalho da sombra; cantos de 6, 8 e 12px.
- Hanken Grotesk em 400–600, com dígitos tabulares nativos.
- Um único acento de marca (violeta-índigo), só pra foco, seleção e item ativo.
- Telas de operação no tamanho Toast: alvos de 44px e texto de 15px.

## Colors

Neutros sem matiz, um acento de marca raro, três cores de estado e quatro de
etapa, cada uma com um único significado.

### Primary
- **Tinta** (#16171A; no escuro, Giz #EDEDEF): texto principal, botão
  primário e trilho de progresso. É a "cor" da marca na maior parte da tela.

### Secondary
- **Marca violeta-índigo** (#5B4FE0; no escuro, #8F87FF): anel de foco,
  seleção de texto, ícone do item ativo no menu, controle deslizante. Nunca em
  botão, nunca decorando.

### Neutral
- **Névoa** (#F6F6F7): fundo da tela. **Papel** (#FFFFFF): cards, menu, tabelas.
- **Papel elevado** (#F3F3F5) e **hover** (#ECECEF): trilhos, controles segmentados, linha em foco.
- **Grafite** (#0B0B0C / #131315 / #1A1A1D): as três camadas do tema escuro.
- **Linha** (tinta a 9%; no escuro, branco a 8%): toda borda e divisória.

### Estado
- **Sinal** (#D92D20): risco, perda, abaixo do alvo, valor que vaza.
- **Sucesso** (#067647): no alvo, concluído, checklist completo.
- **Aviso** (#B54708): demonstração, atenção.

### Etapas de produção (`--etapa-*`, com variante `-texto`)
- **Em estoque** (#2563EB), **Em produção** (#D97706), **Produzido** (#059669),
  **Perda** (#DC2626). No escuro ficam mais claras.

### Named Rules
**The One Accent Rule.** O violeta só marca onde o usuário está (foco, seleção,
item ativo). Se aparecer em mais de 3 lugares numa tela, algum está errado.

**The Stage Color Rule.** Etapa se pinta só com `--etapa-*`, igual em qualquer
tela. Botão de etapa é tingido (fundo a 12%, texto `-texto`, borda a 30%), nunca
preenchido.

**The Meaning-Only Rule.** Vermelho é risco ou perda, verde é ok. Nenhum dos
dois decora, e selo "PRO" vermelho não existe.

## Typography

**Família:** Hanken Grotesk (next/font, self-hosted, variável). Os dígitos
são tabulares por padrão, então colunas de número alinham sem truque.
Testadas e descartadas: Mona Sans (zero tabular estreito em peso alto),
Schibsted (vírgula solta), Onest e Host (largas pra tabela densa) e Plus
Jakarta Sans (fonte-padrão de app gerado).

**Character:** grotesca neutra no tom do Stripe. Firmeza vem do tamanho e do
contraste, não do peso.

### Hierarchy
Escala fixa em px, sem meio-pixel:

- **Título da página** (600, 22px, -0.015em): "Resumo do mês", "Quadro de produção".
- **Número de destaque** (600, 28px): métricas da faixa, temperatura atual.
- **Número de card** (700, 24px): lotes possíveis no kanban.
- **Título de seção** (600, 16px): cabeçalho de card ou seção.
- **Título da barra** (600, 15px): nome da tela na barra superior.
- **Corpo de operação** (400, 15px): itens de checklist, textos do tablet.
- **Corpo** (400, 14px): padrão do app, células de tabela.
- **Detalhe** (400, 13px): descrição de seção, linha secundária.
- **Meta** (500, 12px): cabeçalho de tabela, selos, legendas.

### Named Rules
**The Quiet Weight Rule.** Nada acima de 700. As classes `font-black` e
`font-extrabold` foram remapeadas (700/600) em `@theme` no `globals.css`.

**The Sentence Case Rule.** Rótulo, cabeçalho de tabela, selo e grupo do menu
em caixa normal. Caixa alta não aparece na interface.

**Exceções de impressão (fora da escala de propósito).** Os PDFs em
`src/lib/pdf/` usam Helvetica, a fonte embutida do react-pdf (sem baixar
arquivo de fonte). O rótulo nutricional "para varejo" em Nutricional imita a
tabela impressa da ANVISA: preto sobre branco, letra miúda, com cores e
tamanhos fixos. Nenhum dos dois é tela de operação.

## Layout

Casca única (`ShellPremium`) pro app e pra demo: menu de 240px com grupos
Operação, Qualidade e controle e Gestão, e barra superior de 56px translúcida.
O conteúdo vai até 1280px, com seções a 24px e cards com padding de 20px. Cada
página abre com um cabeçalho próprio (título de 22px + uma linha de contexto +
controles à direita, alinhados pela base) em vez de card-herói. Abaixo de 768px
o menu vira gaveta.

**The Aligned Columns Rule.** Tabelas usam um grid único para o cabeçalho e as
linhas, e a última coluna tem largura fixa.

**The Strip Rule.** Métricas irmãs ficam numa faixa só, dividida por linhas
finas, e não em cards separados.

## Elevation & Depth

Quase plano. Cards levam borda de 1px e `--shadow-card` (1px). Só o que flutua
(menus, modais) usa `--shadow-elevated`. Não existe halo colorido nem brilho.

## Shapes

Cantos de 6px em selos e controles pequenos, 8px em botões, campos e itens de
menu, 12px em cards, colunas do kanban e painéis. Pílula só em pontos e na
barra de progresso.

## Components

### Buttons
- **Primário:** tinta com texto papel, 8px de canto, 44px na operação e 40px no resto.
- **Secundário:** papel, borda `--linha-forte`, texto tinta; hover em `--panel-hover`.
- **Destrutivo:** só texto em sinal, fundo `--danger-soft` no hover.
- **Foco:** anel duplo no acento de marca, global.

### Selos de status
- Retângulo de 6px, texto de 12px peso 500, fundo da cor a 10–12%, sem borda.
  Exemplos: "No alvo", "Abaixo do alvo", "Entrada", "Saída (produção)".

### Cards / painéis
- Papel, 12px de canto, 1px de linha, sombra de 1px. Um card em risco muda só o
  número (sinal), nunca a borda inteira.

### Navegação
- Item de 40px: ícone de 17px em tinta-faint e rótulo 14px em tinta-sub. O item
  ativo usa fundo papel-elevado, rótulo tinta peso 500 e ícone na marca.

### Faixa de métricas (assinatura)
- Um painel dividido em 4 colunas por linha fina: rótulo 13px, número 28px/600
  (sinal quando em risco) e linha de contexto 12px com ponto de estado.

### Bloco "Onde a margem está vazando" (assinatura)
- Total em sinal no canto do cabeçalho ("deixados na mesa") e linhas ordenadas
  por R$: nome, explicação em uma frase e valor à direita.

### Kanban de produção
- Coluna com topo de 3px da etapa, fundo da etapa a 5% e rolagem interna. Card
  de papel com borda da etapa a 30% e botões de etapa tingidos com 44px.

### Checklist de operação
- Linha de 48px, caixa de 24px e texto de 15px; marcado vira verde sucesso com
  o texto riscado em tinta-faint. Progresso em trilho de 6px.

## Do's and Don'ts

### Do:
- **Do** formatar todo número em pt-BR com `formatBRL`, `formatNumero` ou `formatQtd` (`components/charts/format.ts`).
- **Do** manter os alvos de toque da operação (Produções, Checklists, Estoque) com 44px ou mais.
- **Do** usar `ShellPremium` pra qualquer tela nova, no app e na demo.
- **Do** marcar mudanças com `SISTEMA premium` ou `POLIMENTO <tela>` e registrar em `docs/POLIMENTO.md`.

### Don't:
- **Don't** usar caixa alta em rótulo, selo, cabeçalho ou menu.
- **Don't** usar degradê, halo colorido, brilho ou ponto pulsando.
- **Don't** preencher botão com cor de etapa ou de estado; use a versão tingida.
- **Don't** criar card-herói com título de marketing ("Centro de Inteligência...").
- **Don't** usar azul-marinho no escuro: o escuro é grafite neutro.
- **Don't** mostrar o agente IA ou dado simulado fora de `/preview` sem o selo "demo".
