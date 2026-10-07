# Prontidão para venda — revisão de 07/10/2026

Esta revisão substitui estimativas percentuais como critério de lançamento. Existência de código, teste local e ativação no ambiente comercial são evidências diferentes. Documentos de setembro continuam como histórico, não comprovam configuração atual das contas.

Base: `integracao`, com melhorias de fichas/Kanban até `1bc9565ea780c5e53f595f3c8f172693b5895101`. Trabalho desta revisão isolado em `lancamento/onboarding-prontidao`; sem merge em `main` ou `integracao`.

| Item | Evidência no projeto | O que falta para encerrar |
|---|---|---|
| Primeiro uso | Guia por dados reais na Visão geral e cadastro direcionado para ele | Conferir cadastro, confirmação de e-mail e conta vazia na implantação |
| Assinatura | Emissão mensal Asaas, página hospedada, conciliação autenticada, cancelamento e proteção contra duplicação | Preço, conta, webhook, migration, homologação sandbox e ativação deliberada; flag desligada |
| Oferta e acesso | Plano mensal único escolhido pelo responsável | Valor, duração do teste e regra de acesso após vencimento/cancelamento; expiração/bloqueio comercial não implementados |
| Empresa e suporte | Dados centralizados, agora configuráveis por variáveis públicas | Razão social, CNPJ, endereço, contato, contato de privacidade e foro reais; termos comerciais revisados |
| Login e equipe | Código de cadastro, confirmação, recuperação e papéis; suíte E2E existente | SMTP e redirects no domínio definitivo, com teste de entrega e login por papel |
| Banco | Migrations e testes SQL existentes; teste novo de assinatura | Confirmar migrations aplicadas no projeto atual, isolamento e cadeia completa em Supabase |
| XML de compras | Importação/conferência/entrada implementadas | Exercitar XML real e confirmar migration/estoque na implantação; não chamar “ausente” |
| Agente e WhatsApp | APIs, propostas com confirmação e ferramentas implementadas; fluxos n8n documentados | Verificar credenciais, workflows publicados e execução por restaurante; não chamar “apenas demo” |
| Monitoramento | Registro de erro, tabela e testes presentes | Provocar falha controlada e conferir registro no ambiente; acesso e rotina de acompanhamento |
| Backup | Procedimento precisa ser confirmado com responsável pela infraestrutura | Evidência de backup recente e restauração em ambiente separado; sem alteração de plano/compra durante este trabalho |
| Operação real | Fotos, duas visões de ficha e PDFs, Kanban, estoque e CMV preservados | Piloto com restaurante real: compra → ficha → produção → estoque → fechamento, em computador/tablet/celular |

## Configuração e verificação

`.env.example` agora existe, sem valores privados. Os dados `NEXT_PUBLIC_EMPRESA_*` são da empresa fornecedora do SaaS e serão públicos; não são dados do restaurante cliente. Alterações nessas variáveis exigem rebuild.

Com as variáveis locais preenchidas:

```sh
node --env-file=.env.local scripts/verificar-prontidao.mjs
```

O comando imprime somente nomes/estado dos itens. Não valida credenciais remotas, SMTP, domínio, plano Supabase ou pagamentos; não confundir todos os itens locais “OK” com autorização de lançamento. Não disponibilizar esse diagnóstico técnico como tela para clientes.

## Evidências desta revisão

- 293 testes em 44 arquivos passaram; 6 blocos de interação das fichas, Kanban e hub passaram. TypeScript e lint do código e dos scripts passaram; resultados finais registrados no PR da revisão.
- Migration de assinatura: 16 verificações SQL isoladas em PGlite, com papéis, privilégios e transação PostgreSQL. Há teste correspondente no runner SQL existente do Supabase.
- O build local depende da fonte hospedada no Google, inacessível neste ambiente; status da implantação Vercel deve ser conferido pelo SHA publicado.
- O navegador encontrou proteção de acesso na prévia; não há comprovação visual da implantação nem teste de gravação no Supabase real nesta revisão.
- Conexão Vercel disponível não tem acesso ao escopo `voycompany`. Não há conexão Supabase/n8n disponível. Não foram alteradas variáveis remotas, SMTP, domínio, backups ou migrations de produção.
- Verificador local exercitado com ambiente vazio (retorno 1) e configuração sintética completa (retorno 0), sem reproduzir os valores configurados.

Não publicar como produto amplamente disponível até encerrar os itens de configuração, oferta, cobrança e fluxo operacional. Um piloto acompanhado pode validar o produto sem declarar essas etapas concluídas.

## Registro e reversão

Cada grupo tem commit e documentação próprios: [início da operação](melhorias/08-inicio-operacao.md), [assinatura mensal](melhorias/09-assinatura-mensal.md), [configuração](melhorias/10-configuracao-prontidao.md) e [revisão das interações](melhorias/11-conciliacao-e-preparo-etapas.md).

Reversão do código deve usar `git revert` dos commits publicados, do mais recente para o mais antigo; não resetar as branches principais. A migration de assinatura é aditiva e não deve ser removida automaticamente. Se cobrança vier a ser habilitada, seguir a reversão específica que considera recorrências externas e histórico.
