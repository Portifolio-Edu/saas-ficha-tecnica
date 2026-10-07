# Compras no Estoque com aprovação — 07/10/2026

Solicitação de Edu: uma seção Compras dentro do Estoque, com aprovação pelo gestor ou dono. A repetição de “estoque” na lista de acessos foi interpretada como estoquista, gestor e dono, coerente com os aprovadores mencionados. A cozinha continua solicitando pelo seu aparelho.

Atualização posterior: [delegação configurável ao estoque](17-permissoes-compras.md) mantém esta regra como padrão, mas permite gestor/dono autorizar também o perfil Estoquista. A matriz abaixo registra a configuração padrão da primeira entrega.

## Fluxo e permissões

| Ação | Estoquista | Gestor | Dono | Cozinha |
| --- | --- | --- | --- | --- |
| Abrir Estoque → Compras | Sim | Sim | Sim | Não |
| Criar requisição em Compras | Sim | Sim | Sim | Pelo painel Pedidos |
| Aprovar ou rejeitar | Não | Sim | Sim | Não |
| Confirmar compra já aprovada | Sim | Sim | Sim | Não |
| Acompanhar pedidos no painel da cozinha | — | — | — | Sim |

Requisição criada → aguardando aprovação → aprovada para comprar → compra confirmada. A gestão pode rejeitar uma requisição pendente ou cancelar uma já aprovada. Uma compra confirmada não pode ser reaberta por esse fluxo. A cozinha pode retirar apenas seu próprio pedido ainda pendente.

## Alterações

- Nova rota `/estoque/compras` e demonstração `/preview/estoque/compras`, acessadas pela navegação Estoque/Compras. O estoque mantém saldos, movimentações, contagens cegas, fornecedores e NF-e; seu antigo painel de pedidos passa a ser um resumo com link para Compras.
- Formulário para insumo cadastrado ou item livre, categoria, quantidade/unidade e observação. Seletores têm nomes explícitos para acessibilidade e interação automatizada. Responsável e restaurante vêm da sessão; a entrada do navegador não decide a autoria ou o restaurante.
- Compras separa aguardando aprovação, aprovadas para comprar e histórico recente. Mantém agenda/prazos dos fornecedores e preparação manual de mensagem no WhatsApp, somente para itens aprovados. Confirmar compra não registra recebimento nem altera saldo: o recebimento continua em Estoque/NF-e.
- Histórico recente conserva a janela existente de 3 dias e consulta limitada a 300 requisições; não foi acrescentado arquivo completo paginado. Pendentes e aprovadas entram na consulta independentemente da idade, dentro desse limite.
- A cozinha continua criando e acompanhando pedidos, agora distinguindo espera por aprovação e compra autorizada; exibe rejeições/cancelamentos recentes. Contagens da cozinha, agente e resumo diário incluem ambos os estados abertos. O lembrete de prazo do fornecedor considera somente aprovadas e aponta para Compras.
- Migration aditiva `20261007160000_aprovacao_compras.sql` amplia o status e acrescenta data, usuário e nome da aprovação, além do nome de quem concluiu/rejeitou. O banco carimba esses campos, mantém isolamento por restaurante e impede estoquista de aprovar, rejeitar ou comprar antes da aprovação, inclusive em chamada direta à API. A concessão de UPDATE continua restrita à coluna `status`; nomes/datas não podem ser forjados pela equipe.
- Atualizações repetidas, transições inválidas e lotes contendo pendências não autorizadas são recusados. Históricos antigos permanecem sem inventar aprovação retroativa. Aprovação e confirmação atualizam as telas do estoque e da cozinha.
- Na demonstração, solicitações e decisões usam o armazenamento local já compartilhado com a cozinha. A troca de perfil permite experimentar solicitação como estoquista, decisão como gestor/dono e conclusão como estoquista, sem gravar dados reais.

## Verificação e ativação

- Local: 305 testes unitários em 45 arquivos, tipos, lint e revisão de diff aprovados. Inclui testes de sessão expirada, autoria/restaurante da sessão, ação proibida e falha de aprovação.
- SQL isolado em PGlite: 32 verificações da política de requisições e mais 1 reversão com preservação dos dados. O script `scripts/verificar-compras-sql.mjs` usa as migrations reais; precisa de PGlite instalado fora das dependências comerciais, indicado por `COMPRAS_QA_MODULOS`.
- Na primeira execução E2E, 132 cenários passaram, incluindo aprovação/compra autenticadas e acessibilidade de Compras nos dois temas/celular. Foram corrigidos o status omitido numa fixture de inserção em lote e o nome acessível do seletor Categoria; a suíte completa é novamente exigida antes da entrega.
- CI do PR verifica a cadeia completa de migrations/Supabase, build, acessibilidade nos dois temas, uso em celular e fluxo autenticado cozinha → gestor → estoque, além de estoque → rejeição pelo dono. O resultado final e a revisão exata ficam registrados no PR.
- Aplicar a migration no banco do ambiente correspondente antes de servir as rotas autenticadas com o novo código; elas consultam os novos campos. A demonstração funciona sem essa ativação. Nenhuma migration, pagamento ou configuração comercial foi executada neste trabalho.

## Reversão

Base publicada: `66a33151db01fa29395668ee19b05a45e97e414e`, branch `lancamento/oferta-fundadores`. Este trabalho fica isolado em `melhoria/compras-aprovacao`. Para restaurar o código anterior, antes de trabalhos posteriores/merge:

```bash
git fetch origin melhoria/compras-aprovacao
git switch -c reversao/compras-aprovacao origin/melhoria/compras-aprovacao
git rev-list --first-parent HEAD ^66a33151db01fa29395668ee19b05a45e97e414e | xargs git revert --no-edit
```

Após alterações posteriores, identificar os commits deste PR e resolver eventuais conflitos preservando dados. O teste de reversão Git compara a árvore revertida com a árvore da base publicada; sua evidência final fica no PR.

Reverter Git não desfaz uma migration aplicada. Para voltar também ao fluxo antigo sem aprovação, coordenar troca de código e manutenção do banco usando `supabase/reverter/20261007160000_aprovacao_compras.sql`, com acesso de manutenção sem sessão de usuário. Guardar esse script antes de reverter o código. Ele retorna aprovadas a pendentes, restaura status/transições e política antiga, **sem excluir requisições nem colunas/dados de auditoria**. Compras confirmadas e rejeições permanecem. O roteiro foi testado apenas em banco descartável; não executar automaticamente em produção. Manter o novo trigger enquanto servir a UI antiga faria o antigo botão de compra direta ser recusado.

Uma migration já registrada permanece registrada no histórico do Supabase; reaplicar o recurso depois de executar o roteiro de reversão exige uma nova migration que restabeleça constraints, trigger e política, reutilizando as colunas existentes. Não apagar histórico de migrations nem recriar colunas preenchidas.
