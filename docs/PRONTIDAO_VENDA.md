# Prontidão para venda — revisão de 07/10/2026

Esta revisão substitui estimativas percentuais como critério de lançamento. Existência de código, teste local e ativação no ambiente comercial são evidências diferentes. Documentos de setembro continuam como histórico, não comprovam configuração atual das contas.

Base: `integracao`, com melhorias de fichas/Kanban até `1bc9565ea780c5e53f595f3c8f172693b5895101`. Trabalho desta revisão isolado em `lancamento/onboarding-prontidao`; sem merge em `main` ou `integracao`.

| Item | Evidência no projeto | O que falta para encerrar |
|---|---|---|
| Primeiro uso | Guia por dados reais na Visão geral e cadastro direcionado para ele | Conferir cadastro, confirmação de e-mail e conta vazia na implantação |
| Assinatura | Emissão mensal Asaas, página hospedada, conciliação autenticada, cancelamento e proteção contra duplicação | Preço, conta, webhook, migration, homologação sandbox e ativação deliberada; flag desligada |
| Oferta e acesso | 7 dias grátis, R$ 297/mês; 10 fundadores a R$ 197 enquanto mantiverem assinatura; vaga confirmada no primeiro pagamento. Datas e reserva protegidas preparadas na migration da oferta | Definir e implementar a regra de acesso após vencimento/cancelamento; expiração/bloqueio comercial não implementados. Ativar e homologar a oferta em sandbox |
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

- 294 testes em 44 arquivos passaram; 6 blocos de interação das fichas, Kanban e hub passaram. TypeScript e lint do código e dos scripts passaram; resultados finais registrados no PR da revisão.
- Migration de assinatura: 18 verificações SQL isoladas em PGlite, com papéis, privilégios, transação PostgreSQL e suspensão. O CI do commit `b607184` recriou a cadeia completa de migrations no Supabase e passou em todos os testes SQL da versão inicial de cobrança (16 verificações); a versão atual também integra esse runner. Conferir a rodada final no PR. Isso não confirma migrations aplicadas no banco comercial.
- O build local depende da fonte hospedada no Google, inacessível neste ambiente. Build do app no GitHub Actions e implantação Vercel do commit `b607184` passaram. O status final da revisão está no PR.
- O navegador encontrou proteção de acesso na prévia; não há comprovação visual da implantação nem teste de gravação no Supabase real nesta revisão.
- Conexão Vercel disponível não tem acesso ao escopo `voycompany`. Não há conexão Supabase/n8n disponível. Não foram alteradas variáveis remotas, SMTP, domínio, backups ou migrations de produção.
- Verificador local exercitado com ambiente vazio (retorno 1) e configuração sintética completa (retorno 0), sem reproduzir os valores configurados.
- Testes de navegador do commit `594bd6f`: 125 passaram, 3 falharam. O diagnóstico mostrou contraste verde insuficiente na consulta e um seletor que escolhia a opção oculta do filtro de responsável. Correções documentadas no grupo 14; resultado da nova rodada registrado no PR. Testes posteriores da série de papéis devem ser executados, não considerados cobertos por essa rodada interrompida.

Não publicar como produto amplamente disponível até encerrar os itens de configuração, oferta, cobrança e fluxo operacional. Um piloto acompanhado pode validar o produto sem declarar essas etapas concluídas.

## Registro e reversão

Cada grupo tem commit e documentação próprios: [início da operação](melhorias/08-inicio-operacao.md), [assinatura mensal](melhorias/09-assinatura-mensal.md), [configuração](melhorias/10-configuracao-prontidao.md), [revisão das interações](melhorias/11-conciliacao-e-preparo-etapas.md), [cadastro ponta a ponta](melhorias/12-cadastro-e2e.md), [suspensão da recorrência](melhorias/13-suspensao-assinatura.md) e [correções encontradas no navegador](melhorias/14-contraste-consulta-e-teste-quadro.md).

Reversão do código deve usar `git revert` dos commits publicados, do mais recente para o mais antigo; não resetar as branches principais. A migration de assinatura é aditiva e não deve ser removida automaticamente. Se cobrança vier a ser habilitada, seguir a reversão específica que considera recorrências externas e histórico.

## Commits publicados desta revisão

| Commit | Alteração |
|---|---|
| 5d42edb | feat: orientar o início da operação com dados reais |
| 23e8b21 | feat: preparar assinatura mensal com conciliação segura |
| a042398 | docs: registrar prontidão e configurar dados públicos da empresa |
| 5a09c23 | fix: reconhecer preparo por etapas e permitir conciliação após falha |
| b607184 | docs: registrar commits publicados e reversão |
| 002bcc7 | test: verificar guia e próximo passo após cadastro |
| 6fc11c7 | docs: registrar validação do banco e atualizar reversão |
| 0873e49 | fix: distinguir suspensão de cancelamento da assinatura |
| 594bd6f | docs: consolidar revisão e reversão da assinatura |
| 1b472c1 | fix: corrigir contraste da consulta e verificar responsável no quadro |

As árvores desses commits foram comparadas às árvores locais validadas antes de publicar. A revisão inclui um último commit que só registra esta seção.

Para reverter o pacote em uma branch nova, partindo exatamente da revisão publicada e sem alterações posteriores:

```sh
git switch -c reversao/onboarding-prontidao origin/lancamento/onboarding-prontidao
# Primeiro desfaz o último commit, que somente registra as instruções.
git revert --no-edit HEAD
git revert --no-edit 1b472c19735e9afbe54f148cafe436d634f938e8 594bd6fdaa92921dfdaf8ad3b90b3b47f32e24fe 0873e49bf3640f149add7076813f42d28042934c 6fc11c77a6f7961cb3793aeb47bddc3c3a59a680 002bcc7a7cc845dc81341a031bf67ab881e98406 b607184a2f8d497191698876f699fef794aacaa2 5a09c23761d1ae7572a791a53c260d7285284f0c a042398bfebe9b1c2e25f894982b3a011789616f 23e8b215014c10218911f94fba9ff08e4170a9de 5d42edb16ac2f5bcb39120649501d7b2538427d8
```

Não usar esses comandos cegamente se houver commits posteriores: identificar primeiro o commit de registro e preservar novas alterações. Para reverter somente uma melhoria, usar seu hash da tabela e conferir dependências.

A reversão de código não remove a migration aplicada nem cancela recorrências externas. Seguir o procedimento específico de [assinatura](melhorias/09-assinatura-mensal.md) antes de reverter um ambiente com cobrança habilitada.

## Oferta aprovada em 07/10/2026

A revisão isolada `lancamento/oferta-fundadores` acrescenta [oferta e controle das vagas](melhorias/15-oferta-fundadores.md). Esta revisão não muda a oferta no banco comercial nem habilita pagamentos. As evidências acima referem-se à versão anterior; os resultados desta oferta ficam no documento e no PR correspondentes.

A revisão `melhoria/compras-aprovacao` acrescenta [Compras no Estoque com aprovação pelo gestor/dono](melhorias/16-compras-aprovacao.md), mantendo pedidos da cozinha, agenda de fornecedores e recebimento por estoque/NF-e. A demonstração e os testes não aplicam a migration no banco comercial; a ativação autenticada exige a migration documentada antes de servir o novo código.

A revisão `melhoria/permissoes-compras` acrescenta [delegação da aprovação ao estoque por restaurante](melhorias/17-permissoes-compras.md), configurada somente pela gestão e desligada por padrão. Concessão, revogação, autoria e reversão estão documentadas; nenhuma permissão comercial foi alterada pelo preview.
