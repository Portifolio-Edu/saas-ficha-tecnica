# Assinatura mensal — 07/10/2026

Antes: Plano mostrava situação e contato; não emitia nem conciliava cobrança.

Agora: integração Asaas para um plano mensal por restaurante. Somente o dono pode iniciar, consultar, atualizar e cancelar. O valor vem de `ASAAS_PLANO_MENSAL_CENTAVOS` no servidor; um preço diferente do exibido exige nova consulta antes de assinar. O restaurante precisa ter razão social, CNPJ válido e e-mail do dono. Os pagamentos acontecem no Asaas, sem coleta de cartão neste app.

Há emissão recorrente de faturas, não uma implementação própria de débito automático de cartão. Não foi escolhido um preço, duração de teste, nem política de bloqueio do acesso. Este pacote não expira contas de teste nem bloqueia a operação por cobrança.

## Segurança e recuperação

- Reserva única por restaurante/ambiente antes de qualquer POST ao provedor. POST com resposta incerta não é repetido. `Atualizar situação` busca a assinatura pela referência interna, inclusive canceladas. Se nenhuma assinatura foi criada, o suporte deve verificar cliente e assinatura no Asaas antes de liberar uma nova tentativa; não há remoção automática da reserva.
- Chaves privadas; prefixo compatível com ambiente; cobrança real proibida em preview da Vercel. Integração desligada por padrão. Sandbox não atualiza plano/status reais em `clientes`.
- Webhook autenticado por token próprio `asaas-access-token`. Consulta financeira canônica, sem ativar plano com base em callback, criação da assinatura ou conteúdo do evento.
- RPC transacional com idempotência por evento, bloqueio da linha e proteção contra conciliação antiga. Eventos de uma recorrência cancelada não alteram uma nova assinatura.
- Link de fatura restrito a HTTPS em `asaas.com` e subdomínios. Sem dados pessoais ou chaves nos logs de falha.
- Cancelamento explícito encerra recorrência e pendentes no provedor; histórico local permanece. Nova contratação é permitida após cancelamento. Exclusão da conta verifica assinatura antes de apagar fotos e tem proteção adicional no banco.
- Exportação da conta inclui situação e valor da assinatura. Compatível com implantação sem a nova tabela enquanto a cobrança está desligada.

## Ativação necessária, ainda não realizada

1. Aplicar `20261007120000_assinatura_saas.sql` primeiro em teste. Rodar o CI do banco e testar cadeia completa das migrations.
2. Definir preço e condições comerciais. Preencher dados públicos da empresa e suporte; revisar termos com essas condições.
3. Configurar conta sandbox: `ASAAS_AMBIENTE=sandbox`, chave sandbox, token de webhook diferente da chave (32–255 caracteres sem espaços), valor em centavos. Ativar flag somente nesse ambiente de teste.
4. Cadastrar webhook para `/api/webhooks/asaas`, com token, eventos `PAYMENT_*` e `SUBSCRIPTION_*`. Usar envio sequencial. Prévia protegida da Vercel exige ambiente de teste acessível ao webhook; a implantação atual protegida não serve por si só como prova do recebimento.
5. Testar início com conta real de teste, fatura hospedada, confirmação, atraso, estorno, repetição, entrega fora de ordem, timeout, cancelamento e nova assinatura. Conferir app → API → banco → Asaas.
6. Somente após essa homologação, configurar credenciais próprias de produção em deployment de produção. A flag continua `false` neste pacote; nenhum pagador, assinatura ou pagamento foi criado por esta implementação durante o trabalho.

## Validação executada

Testes unitários do adaptador, permissões da API, webhook, reserva e conciliação. 16 verificações SQL da migration em PostgreSQL WASM (PGlite) com base mínima. O teste está em `supabase/testes/assinatura_saas.sql` e também roda no CI existente do Supabase. A execução isolada não confirma a cadeia completa nem o banco de produção. Tipos, lint e regressões do projeto são registrados em `docs/PRONTIDAO_VENDA.md`.

## Reversão

Reverter o commit `feat: preparar assinatura mensal com conciliação segura`. Antes de reverter um ambiente que já emitiu cobranças: confirmar cancelamento das recorrências no Asaas, manter cópia do histórico financeiro e desligar `ASAAS_COBRANCA_HABILITADA`. Reverter código não cancela cobranças externas.

A migration é aditiva. Após reverter o código, manter tabelas/dados para conciliação e auditoria; não fazer `DROP` como reversão automática. Desligar flag não remove a proteção contra exclusão de conta com recorrência.

Referências técnicas primárias: [assinaturas](https://docs.asaas.com/reference/criar-nova-assinatura), [webhooks](https://docs.asaas.com/docs/webhook-para-cobrancas), [remoção da recorrência](https://docs.asaas.com/reference/remover-assinatura).
