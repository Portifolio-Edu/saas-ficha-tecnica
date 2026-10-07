# Revisão das interações — 07/10/2026

O guia reconhece modo de preparo tanto no texto geral quanto nas etapas, preservando a estrutura existente da ficha. Teste adicional cobre ficha feita só por etapas.

Na seção Plano, `Atualizar situação` também fica disponível antes da confirmação da primeira solicitação. Isso permite consultar uma criação interrompida sem repetir o POST financeiro. Após sucesso, o servidor é atualizado para que o resumo de plano/status acompanhe a conciliação. Cobrança continua desativada por padrão.

O leitor de configuração aceita um mapa de variáveis para testar configuração ausente sem exigir variáveis alheias à cobrança. Testes restauram o transporte global ao terminar.

Reversão: reverter o commit `fix: reconhecer preparo por etapas e permitir conciliação após falha`. O fluxo anterior da nova cobrança volta a só oferecer atualização após a solicitação confirmada; não há alteração de dados.
