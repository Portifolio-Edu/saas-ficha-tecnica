# src/components/charts/

Wrappers reutilizáveis sobre o Recharts, usados por todo gráfico do app pra
garantir um padrão visual único (altura mínima 320px, margem generosa, grade
horizontal sutil, eixo formatado, rótulo de valor direto, tooltip elevado,
estado vazio explicativo e transição de entrada suave).

- `theme.ts` — margens, grade, estilo de eixo, paleta categórica (donut) e
  constantes de animação compartilhadas.
- `format.ts` — formatação de R$ (separador de milhar) e % (com o sinal de
  porcentagem) pra eixo e tooltip. Nenhum gráfico formata isso na mão.
- `ChartFrame` — casca comum: `ResponsiveContainer` com altura mínima,
  transição de entrada (`animate-in fade-in-0`) e troca para
  `ChartEmptyState` quando não há dado.
- `ChartEmptyState` — mensagem de estado vazio que diz o que fazer pra
  preencher aquele gráfico específico (nunca só "sem dados").
- `ChartTooltipCard` — card de tooltip elevado (sombra + borda), com
  hierarquia tipográfica: título, rótulo secundário, valor em destaque.
- `Donut` — donut completo (fatias, legenda, tooltip, paleta categórica
  validada contra confusão de cor — ver `theme.ts`) com rótulo de nome + %
  na própria fatia, não só no hover.

Barras e linhas continuam montadas com os componentes nativos do Recharts
(`Bar`, `Line`, `LabelList`, etc.) em cada tela — só o entorno (moldura,
eixo, grade, tooltip, estado vazio, animação) vem daqui, pra manter
composição livre sem duplicar o boilerplate visual.
