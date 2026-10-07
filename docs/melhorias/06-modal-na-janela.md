# Ficha de produção ancorada na janela

Pedido de Edu em 06/10/2026, segundo print: a ficha aberta na visão de dono/gestor aparecia deslocada no computador; no tablet a apresentação estava boa.

- Arquivo: `src/components/receitas/FichaProducaoModal.tsx`.
- Causa no código: a ficha era descendente de `.animate-fade-in`, cuja animação termina com `transform: translateY(0)` e `forwards`. Esse ancestral vira a referência de posicionamento de elementos `fixed`; em páginas longas, o modal pode ficar fora da janela e o fundo não cobre a lateral.
- Correção: ficha e foto ampliada passam a ser renderizadas em um portal no `document.body`, após a montagem no cliente. O posicionamento usa a janela e não depende do tamanho/rolagem da lista ou da lateral.
- Mantidos: largura máxima de 672px, altura máxima de 90dvh, apresentação em uma coluna no tablet, fotos, texto, ingredientes, botão de ampliar, cabeçalho fixo, rolagem interna, Escape, foco e retorno ao botão de origem. Não há alteração de custos ou banco.
- Verificação: teste de interação monta a ficha sob um ancestral transformado e confirma que o modal está fora dele, no body; confere fotos, foco, Escape e rolagem. DOM simulado não mede coordenadas: avaliação visual de desktop/tablet depende de acesso à prévia.
- Reversão: reverter o commit `fix(ficha): posicionar modal na janela via portal`; só esse grupo volta à implementação anterior.
