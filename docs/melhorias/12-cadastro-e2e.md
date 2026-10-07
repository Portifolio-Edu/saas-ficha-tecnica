# Verificação do cadastro — 07/10/2026

O teste ponta a ponta do cadastro esperava o destino antigo `/insumos`. Ele agora verifica chegada à Visão geral, presença do guia vazio e navegação pelo próximo passo até Insumos. As verificações de restaurante criado, telefone e aceite dos termos continuam.

Essa alteração adapta a expectativa ao fluxo implementado e testa a utilidade do guia; não remove verificações nem altera código de produção. Execução depende do CI com Supabase e navegador.

Reversão: reverter o commit `test: verificar guia e próximo passo após cadastro` junto com a reversão do novo destino de cadastro. Sem mudança de dados.
