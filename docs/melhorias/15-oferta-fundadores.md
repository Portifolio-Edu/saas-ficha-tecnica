# Oferta e vagas de fundador — 07/10/2026

Oferta aprovada por Edu: 7 dias grátis, R$ 297/mês por restaurante para toda a equipe; R$ 197/mês para 10 fundadores. Nas perguntas complementares, definiu que o desconto vale durante a assinatura contínua e a vaga é confirmada no primeiro pagamento. Após cancelar, uma nova assinatura não herda o benefício confirmado.

## O que mudou

- Configurações → Plano apresenta valores, duração, condições e, com contratação habilitada, data final do teste, primeiro vencimento, preço aplicável e condição de fundador. A demonstração não consulta nem reserva vagas reais.
- Migration aditiva `20261007150000_oferta_fundadores.sql`: período gratuito imutável pelo dono, iniciado na criação do restaurante. Para contas já em teste, usa a data original de criação; não reinicia o período nem bloqueia contas antigas. Cada restaurante tem um único período, independentemente de cancelar e reassinar.
- Primeiro vencimento no Asaas é o dia seguinte ao término do teste em Brasília, ou hoje se o teste já terminou. O Asaas recebe preço e vencimento gravados no banco; uma resposta sem data é recusada antes de qualquer POST financeiro. Faturas podem ficar disponíveis antes do vencimento; não há débito automático implementado pelo app.
- A oferta é novamente conferida na mesma transação que reserva a assinatura. Dez posições numeradas por ambiente, índice único e trava transacional compartilhada com a conciliação evitam duplicidade. Se a oferta de R$ 197 acabou entre consulta e contratação, a operação é recusada e exige nova aceitação de R$ 297; nunca cobra valor maior silenciosamente.
- Criar a assinatura reserva provisoriamente a posição para permitir emitir a primeira fatura de R$ 197. Cadastro/teste grátis sozinho não reserva. A confirmação ocorre apenas com pagamento canônico recebido/confirmado, do mesmo cliente, assinatura e valor, inclusive quando pago antes do vencimento. O preço reservado continua durante a assinatura.
- Cancelar uma reserva sem pagamento libera a posição. Fundador pago continua contado entre os 10 após cancelar, inclusive após excluir a conta: fica apenas a posição anônima ocupada, sem dados do restaurante. A exclusão mantém as proteções contra recorrências financeiras órfãs.
- Sandbox e produção têm contagens separadas. Sandbox não promove o restaurante a plano pago. Exportação dos dados inclui período de teste e condições da assinatura.
- `.env.example` usa `29700`; configuração habilitada rejeita preço normal diferente da oferta aprovada. A flag segue `false`.

## Limites e ativação

A reserva provisória protege a emissão das faturas; por isso uma vaga pode ficar temporariamente indisponível antes do pagamento. Não foi inventado prazo de expiração para reservas. Cobranças não pagas e POSTs de resultado incerto precisam de conciliação/cancelamento com suporte para liberar a posição. Não liberar via edição direta enquanto houver fatura ou recorrência no Asaas. As primeiras 10 condições são confirmadas entre reservas disponíveis, sem prometer prioridade absoluta por milissegundo do pagamento sobre uma reserva já emitida.

Código preparado e preview não ativam pagamentos. Aplicar as duas migrations de assinatura somente no ambiente de homologação antes de habilitar sandbox; validar fatura, webhook, pagamentos antecipados, cancelamento com histórico e repetição. Dados públicos da empresa, SMTP, credenciais e domínio comercial continuam pendentes. Regra de acesso depois dos 7 dias/atraso/cancelamento ainda precisa de decisão e implementação: este pacote registra as datas e protege o primeiro vencimento, mas não bloqueia a operação.

Fontes técnicas: [primeiro vencimento e valor no Asaas](https://docs.asaas.com/reference/criar-nova-assinatura), [comportamento da recorrência](https://docs.asaas.com/docs/faq-assinaturas) e [respostas RPC do PostgREST](https://docs.postgrest.org/en/stable/references/api/functions.html).

## Verificações

- Tipos e lint passaram. Suíte unitária: 298 testes em 44 arquivos, incluindo oferta perdida, resposta sem vencimento e confirmação antecipada canônica. Conferir resultado final no CI do PR.
- 36 verificações SQL isoladas em PGlite: 18 de assinatura e 18 de oferta. Limite, preço aceito, privilégios, sete dias, cancelamento, reassinatura, contagem anônima e independência de ambientes passaram.
- Novo teste E2E usa Supabase local de verdade e PostgREST, com 12 solicitações simultâneas, além de datas e confirmação. Sua execução e a cadeia completa de migrations serão confirmadas pelo CI do PR; a base anterior tinha 139 testes de navegador aprovados.
- Nenhum pagamento, migration ou ajuste de configuração aplicado em produção.

## Reversão

Esta branch parte da árvore publicada de `29c2280ed27bca7bbce3d37d0a6fa5a996ea5012` (`lancamento/onboarding-prontidao`). Para desfazer todos os commits exclusivos da oferta preservando a versão anterior, criar uma branch a partir da revisão publicada e reverter o intervalo, do mais recente para o mais antigo:

```bash
git fetch origin lancamento/oferta-fundadores
git switch -c reversao/oferta-fundadores origin/lancamento/oferta-fundadores
git rev-list --first-parent HEAD ^29c2280ed27bca7bbce3d37d0a6fa5a996ea5012 | xargs git revert --no-edit
```

A instrução vale para esta branch isolada, antes de novos trabalhos/merge; após alterações adicionais, identificar os commits da oferta no PR. Registrar e resolver conflitos sem apagar dados. A versão comercial permanece intacta neste trabalho.

Reverter Git não cancela assinaturas no Asaas nem remove uma migration já aplicada. Se a migration foi aplicada, manter tabelas/colunas aditivas e os dados históricos; desabilitar novas contratações antes de trocar o código e conciliar as recorrências existentes com o provedor. Nunca alterar R$ 197 para R$ 297 em contratos existentes como efeito de reversão.
