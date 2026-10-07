# Delegação da aprovação de compras — 07/10/2026

Solicitação de Edu: a gestão deve poder permitir que o estoque execute também a aprovação; restaurantes que concentram as decisões no gerente/gestor devem manter essa etapa restrita.

## Comportamento

Em **Configurações → Compras**, gestor e dono podem salvar “Permitir que o estoque aprove e rejeite compras”. O padrão é desligado, mantendo a regra anterior. A concessão vale para todos os usuários ativos com perfil Estoquista daquele restaurante, inclusive para aprovar as próprias solicitações. Não é uma permissão individual ou um limite por valor.

| Ação | Opção desligada | Opção ligada |
| --- | --- | --- |
| Alterar a configuração | Gestor/dono | Gestor/dono |
| Solicitar em Compras | Estoquista/gestor/dono | Estoquista/gestor/dono |
| Aprovar, rejeitar ou cancelar antes da compra | Gestor/dono | Estoquista/gestor/dono |
| Confirmar compra já aprovada | Estoquista/gestor/dono | Estoquista/gestor/dono |
| Solicitar pelo painel da cozinha | Cozinha | Cozinha |

A compra continua passando por aprovação, mesmo quando a mesma pessoa do estoque solicita e aprova. Confirmar compra não registra recebimento/saldo. Revogar bloqueia novas aprovações/rejeições/cancelamentos do estoque; as aprovações anteriores e sua autoria continuam válidas e podem ter a compra confirmada. O perfil Cozinha não herda a delegação.

## Alterações

- Nova seção Compras em Configurações, somente para gestão, com explicação do alcance, Salvar permissões e data/nome da última alteração. Mantidos os componentes, temas e navegação responsiva existentes.
- Migration aditiva `20261007170000_permissoes_compras.sql`: quatro colunas em `clientes` para flag e autoria/data da última mudança. A escrita da flag segue a RLS da gestão; campos de auditoria são preenchidos pelo banco e não têm concessão de escrita para o app. A criação de restaurante não pode escolher a flag, cujo padrão é `false`.
- A ação de salvar usa o restaurante da sessão. O estoque não pode conceder autorização a si mesmo, nem via ação direta ou UPDATE autenticado. Outra casa não pode ler/alterar a permissão desta.
- A ação de decisão consulta a permissão atual no servidor; o trigger de requisições a confere novamente no banco. Falha na consulta não concede acesso. Interface desatualizada não autoriza uma nova decisão após revogação efetivada.
- Compras apresenta Aprovar/Rejeitar conforme a permissão efetiva. Itens aprovados ganharam Cancelar antes da confirmação, somente para pessoas autorizadas; erros de comunicação liberam os botões e exibem aviso, sem anunciar conclusão.
- Textos da cozinha e do formulário passam a indicar aprovação sem atribuí-la automaticamente à gestão. Histórico mantém o nome real de quem aprovou, inclusive estoquista. Na demo, também foi ajustado o nome do aprovador para Estoque.
- A configuração da demo é compartilhada com Compras pelo armazenamento/eventos existentes; a troca de perfil permite testar concessão, decisão pelo estoque e revogação. Somente gestor/dono vê e altera a opção. Exportação de dados inclui a flag e data/nome da última alteração.

## Verificação e ativação

- 312 testes unitários em 46 arquivos aprovados localmente; tipos, lint e diff aprovados. Incluem autorização/revogação, sessão, restaurante da sessão, falha de consulta e falha de gravação.
- 48 verificações SQL de requisições aprovadas em PGlite, mais três verificações de reversão: configuração preservada com aprovação do estoque novamente bloqueada, privilégio retirado e pedidos/autoria preservados.
- CI do PR exige cadeia completa de migrations, build e navegador. Os cenários novos verificam gestor delegando, estoque aprovando a própria requisição, dono revogando, confirmação de aprovação anterior e compartilhamento da configuração na demo, inclusive cancelamento com autoria do estoque. Acessibilidade e largura no celular incluem a nova seção. Os resultados finais e SHA exato ficam no PR.
- Aplicar a nova migration no ambiente correspondente antes de servir o código autenticado. Nenhuma migration ou concessão foi aplicada no ambiente comercial durante este trabalho. O preview permite avaliação sem mudar permissões reais.

## Reversão

Base publicada: `d8957b04a0947e99b7906ff134f841b2d5157104`, branch `melhoria/compras-aprovacao`, árvore `2e6410f94b3928bef6c400d9934836d136d3b2ad`. Este ajuste fica separado em `melhoria/permissoes-compras`. Para reverter o código exclusivo desta revisão, antes de outros trabalhos/merge:

```bash
git fetch origin melhoria/permissoes-compras
git switch -c reversao/permissoes-compras origin/melhoria/permissoes-compras
git rev-list --first-parent HEAD ^d8957b04a0947e99b7906ff134f841b2d5157104 | xargs git revert --no-edit
```

Se a migration já foi aplicada, coordenar a troca do código com o roteiro `supabase/reverter/20261007170000_permissoes_compras.sql`, executado em manutenção sem sessão de usuário. Guardar esse arquivo antes de reverter Git. Ele restaura o trigger anterior (somente gestão aprova/rejeita/cancela) e retira o privilégio de escrita da flag, **mantendo colunas, valores da configuração, auditoria e todas as requisições**. A flag armazenada pode continuar `true`, mas deixa de conceder aprovação porque o trigger anterior não a usa. Aprovações anteriores continuam registradas; não são apagadas nem convertidas em decisões da gestão.

Reverter somente Git não restringe uma delegação já concedida no banco. O roteiro de banco foi testado em ambiente descartável e não roda automaticamente em produção. Para reinstalar depois dele, criar uma nova migration que restabeleça o trigger e grant, reutilizando as colunas preservadas; não apagar histórico de migrations nem recriar colunas preenchidas. Para reverter também a própria seção Compras, seguir adicionalmente o documento 16 e seu roteiro, depois de reverter esta delegação.
