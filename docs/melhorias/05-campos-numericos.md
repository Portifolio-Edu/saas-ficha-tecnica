# Campos numéricos sem setas nativas

Pedido de Edu em 06/10/2026, primeiro print: as setas brancas do navegador destoavam dos campos no tema escuro.

- Arquivo: `src/app/globals.css`.
- Antes: o navegador desenhava botões de incremento/decremento dentro dos inputs numéricos, inclusive no fechamento de CMV.
- Depois: os botões nativos ficam ocultos em Chromium/WebKit e Firefox. O tipo numérico, valores, limites, teclado e validação continuam existentes; nenhuma fórmula ou gravação foi alterada.
- Escopo: todos os inputs `type="number"` do sistema, em tema claro e escuro.
- Reversão: reverter o commit `polimento(campos): ocultar setas numéricas nativas`, ou remover somente o bloco comentado `AJUSTES prints` no início do CSS.
- Verificação: conferir CSS gerado no build; a avaliação de aparência no navegador requer acesso à prévia.
