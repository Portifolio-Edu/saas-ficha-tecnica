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
