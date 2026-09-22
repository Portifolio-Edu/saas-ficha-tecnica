---
name: Ficha Técnica
description: Controle de cozinha — fichas, produção, estoque e CMV — legível na bancada.
colors:
  tinta: "#0F172A"
  tinta-sub: "#334155"
  tinta-faint: "#64748B"
  fundo: "#F8FAFC"
  panel: "#FFFFFF"
  panel-elevated: "#F1F5F9"
  panel-hover: "#E2E8F0"
  sinal: "#E11D48"
  sucesso: "#059669"
  aviso: "#D97706"
  etapa-estoque: "#2563EB"
  etapa-producao: "#D97706"
  etapa-produzido: "#059669"
  etapa-perda: "#DC2626"
  grafite-fundo: "#0A0A0B"
  grafite-panel: "#141415"
  grafite-elevated: "#1C1C1E"
  grafite-tinta: "#F4F4F5"
  veu-modal: "rgba(0,0,0,0.5)"
typography:
  numero-destaque:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  numero-card:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 900
    lineHeight: 1
    fontFeature: "tnum"
  titulo-tela:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  titulo-secao:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 900
    lineHeight: 1.25
  titulo-card:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 900
    lineHeight: 1.3
  corpo:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.5
    fontFeature: "tnum"
  controle:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.3
  detalhe:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
  meta:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.4
  rotulo:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.04em"
rounded:
  sm: "8px"
  md: "14px"
  lg: "20px"
  pill: "9999px"
spacing:
  toque: "44px"
  card: "20px"
  secao: "32px"
components:
  botao-primario:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.panel}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  card:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.lg}"
    padding: "20px"
  chip-status:
    rounded: "{rounded.pill}"
    padding: "4px 12px"
---

# Design System: Ficha Técnica

## Overview

**Creative North Star: "A Bancada Calibrada"**

É a tela que o chef lê de pé, com a mão ocupada, no meio do serviço. Cada
superfície funciona como instrumento de medição de cozinha: ardósia e branco
neutros, e cor só quando significa alguma coisa (etapa, risco, ok). O número
que importa é o maior elemento do card. O resto é rótulo e contexto.

A identidade veio do trabalho no Antigravity: hub agrupado, réguas calibradas,
kanban colorido por etapa e o vermelho de risco. Este documento registra essa
identidade e a sobe de nível para o tablet na bancada, sem trocar de mundo.

**Key Characteristics:**
- Número grande e tabular primeiro; rótulo pequeno em caixa alta depois.
- Cor com significado fixo (etapa, risco, ok), nunca decorativa.
- Toque confortável: nada clicável abaixo de 44px na operação.
- Tema claro em ardósia; tema escuro em grafite neutro (escuro de verdade, sem azul).

## Colors

Neutros frios no claro, grafite neutro no escuro. Três cores de estado e
quatro de etapa, cada uma com um único significado.

### Primary
- **Tinta Ardósia** (#0F172A): texto principal, botão primário e preenchimento
  das réguas. No escuro vira Giz (#F4F4F5).

### Neutral
- **Papel** (#FFFFFF) e **Mesa** (#F8FAFC): cards e fundo da tela no tema claro.
- **Bancada Elevada** (#F1F5F9): trilhos, controles segmentados, cabeçalho de tabela.
- **Grafite** (#0A0A0B / #141415 / #1C1C1E): fundo, card e superfície elevada no escuro.
- **Véu de modal** (preto a 50%): fundo atrás de diálogo, igual nos dois temas.

### Estado
- **Sinal** (#E11D48): risco, perda, abaixo do alvo. No escuro, #FF3B30.
- **Sucesso** (#059669): no alvo, ok. No escuro, #10B981.
- **Aviso** (#D97706): atenção, demonstração.

### Etapas de produção (tokens `--etapa-*`, com variante `-texto`)
- **Em estoque** (#2563EB), **Em produção** (#D97706), **Produzido** (#059669),
  **Perda** (#DC2626). No escuro ficam mais claras (#60A5FA, #F59E0B, #34D399, #F87171).

### Named Rules
**The Stage Color Rule.** Etapa se pinta só com `--etapa-*`: a mesma cor para
a mesma etapa em qualquer tela (kanban, Visão Geral, estoque). Hex solto de
etapa em componente é bug.

**The Meaning-Only Rule.** Vermelho só aparece para risco ou perda, verde só
para ok. Nenhuma das duas decora.

## Typography

**Família única:** Plus Jakarta Sans (next/font, self-hosted), com algarismos
tabulares (`tnum`) no app inteiro e `word-spacing: 0.06em`, porque o espaço da
Jakarta é estreito.

**Character:** geométrica e firme; peso 900 nos números e títulos, 500–700 no resto.

### Hierarchy
Escala fixa em px, sem meio-pixel (12,5 / 13,5 são deriva):

- **Número de destaque** (900, 28px, lh 1): o valor que decide (CMV, margem, perda).
- **Número de card** (900, 24px): o número de um card de operação (lotes possíveis).
- **Título da tela** (900, 20px): barra superior e título de página.
- **Título de seção** (900, 18px): cabeçalho de seção.
- **Título de card** (900, 16px): nome do prato ou lote, título de coluna.
- **Corpo** (500, 15px, lh 1.5): texto corrido.
- **Controle** (700, 14px): botões, campos, células de tabela.
- **Detalhe** (600, 13px): linha secundária de card.
- **Meta** (600, 12px): turno, validade, contexto.
- **Rótulo** (700, 11px, caixa alta, +0.04em): nome de coluna, legenda de valor.

### Named Rules
**The Distance Rule.** Na operação (produção, checklist, estoque), o dado que o
chef precisa ler de longe tem no mínimo 16px e peso ≥700. Rótulo de 11px nunca
carrega informação que não esteja também no número ou na cor.

## Layout

Shell com menu lateral fixo (256px) agrupado em Operação, Qualidade & controle
e Gestão, mais barra superior com o título da tela. Conteúdo em até 1280px,
seções separadas por 32px e cards com padding de 20–24px. Abaixo de 768px o
menu vira gaveta; tabelas viram lista empilhada com rótulo por item.

**The Aligned Columns Rule.** Tabela de dados usa um grid único compartilhado
pelo cabeçalho e pelas linhas, para os números alinharem de uma linha à outra.

## Elevation & Depth

Profundidade suave e ambiente: cards com `--shadow-card` e o bloco principal
da tela com `--shadow-elevated`. Nada de halo colorido. Borda colorida só
quando o estado pede, sempre com 1px.

## Shapes

Cantos generosos e consistentes: 8px em controles pequenos, 14px em botões e
campos, 20px em cards, pílula em chips de status e contadores.

## Components

### Buttons
- **Primário:** fundo Tinta, texto Papel, 44px de altura na operação, cantos de 14px.
- **Secundário:** fundo Bancada Elevada, borda `--linha-forte`, texto Tinta.
- **Foco:** anel duplo (`0 0 0 2px panel, 0 0 0 4px accent`), já global.

### Chips de status
- Pílula com fundo da cor a 12–14%, borda a 35–40% e ponto sólido; texto
  11–12px, 800, caixa alta, sem quebra de linha.

### Cards
- Papel, 20px de canto, 1px `--linha`, `--shadow-card`. Card em risco troca
  só a borda para Sinal a 40%.

### Kanban de produção (componente assinatura)
- Coluna com topo de 4px na cor da etapa, fundo da cor a 4–6% e contador em
  pílula. Card de lote com borda de 1px da etapa a 30%, ponto da etapa antes
  do código do lote e ação primária de 44px.

### Régua calibrada (componente assinatura)
- Trilho de 12px, faixa aceitável tingida, pino do alvo e cursor do valor.
  Delta sempre em p.p. ou R$, com vírgula.

## Do's and Don'ts

### Do:
- **Do** usar `formatBRL` e `toLocaleString("pt-BR")` em todo número.
- **Do** usar `--etapa-*` para qualquer referência a etapa de produção.
- **Do** manter todo alvo de toque da operação com ≥44px (`--alvo-toque`).
- **Do** marcar mudanças de polimento com `POLIMENTO <tela>` e registrar em `docs/POLIMENTO.md`.

### Don't:
- **Don't** usar faixa lateral colorida acima de 1px (side-tab) em card, lista ou alerta.
- **Don't** usar halo colorido, brilho (glow) ou ponto pulsando sem estado novo.
- **Don't** usar azul-marinho no tema escuro: o escuro é grafite neutro.
- **Don't** usar chips de código ("CAL · 01", "EST · 01") ou eyebrow acima de título.
- **Don't** mostrar agente IA ou dado simulado fora de `/preview` sem o selo de demonstração.
