# Falhas encontradas no CI — 07/10/2026

O primeiro teste completo de navegador da revisão encontrou duas violações de contraste na consulta do funcionário (tema claro no computador e celular) e uma falha no seletor do teste de produção.

O texto verde das etiquetas e do resumo de hoje usava `#047857`, com contraste medido de 4,19:1 no fundo do resumo. O token de texto `--etapa-produzido-texto` passa a `#065F46` no tema claro; o contraste nesse fundo passa a 5,87:1. A cor de acento, fundos e tema escuro permanecem. O token também melhora a leitura dos demais status verdes que o reutilizam. Nenhuma regra de escala/produção muda.

O gestor via a produção, mas o teste procurava a primeira ocorrência de “Ana Cozinha” na página e selecionava uma opção oculta do novo filtro. Agora confere prato e campo Responsável dentro da coluna Em produção. A verificação de banco que comprova responsável/status permanece. Não foi removida a exigência de visibilidade.

Falhas e diagnóstico: CI `37567012028`, com 125 testes de navegador aprovados, 3 falhas e testes posteriores da série de papéis interrompidos. Nova execução é obrigatória para conferir os fluxos restantes. Nenhuma falha foi marcada como concluída só por passar em teste isolado.

Reversão: reverter `fix: corrigir contraste da consulta e verificar responsável no quadro`. Volta à cor anterior e ao seletor antigo; não altera dados.
