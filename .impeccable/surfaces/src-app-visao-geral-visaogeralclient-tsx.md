---
version: 1
slug: "src-app-visao-geral-visaogeralclient-tsx"
primary_target: "src/app/visao-geral/VisaoGeralClient.tsx"
related_targets: ["src/components/ficha/DemoShell.tsx","src/app/producoes/ProducoesClient.tsx"]
---

# Surface brief: plataforma inteira (demo /preview e app)

Escopo: todas as telas (pedido do usuário: "todas"). Modo: Operate.
Público: chef no tablet da bancada (operação) e dono do restaurante (gestão e compra do SaaS).
Tarefa central da Visão Geral: mostrar onde o lucro está vazando.

## Direction contract

THESIS: O Ficha Técnica com o acabamento de uma ferramenta cara: calmo, preciso,
denso na medida certa (Stripe no refinamento dos números, Linear na densidade e
no escuro, Toast nos alvos de tablet). Recusa o painel-template pesado: tudo em
peso 900, caixa alta, pílula colorida em cada dado e card dentro de card.

OWN-WORLD: superfícies neutras (papel e cinza-névoa no claro, grafite no escuro),
bordas de 1px no lugar de sombras, cantos de 8–12px. Hanken Grotesk em 400–600, com
números tabulares. Botão primário em tinta, um único acento violeta-índigo para
foco, seleção e item ativo. Cor de etapa e de status só onde tem significado.
Badge em retângulo pequeno, em caixa normal.

STORY: o dono abre a Visão Geral e entende em 5 segundos quanto margem perdeu e
em quais pratos; o chef abre Produções e opera com o dedo, sem ler rótulo miúdo.

FIRST VIEWPORT: Visão Geral com cabeçalho enxuto (título + período + meta);
uma faixa única de 4 métricas (CMV, margem média, perda do mês, pratos abaixo
do alvo), divididas por linhas finas; logo abaixo, "Onde a margem está vazando",
com os pratos abaixo do alvo ordenados pelo R$ perdido; depois a tabela completa.

FORM: canon (saída padrão escolhida pelo usuário), à altura de Stripe/Linear/Toast; seed 51421195 (roll degradado, sem rede).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
