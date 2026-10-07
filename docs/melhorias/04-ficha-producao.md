# 04 — Leitura da ficha de produção no modal da gestão

Autorização: Edu, 06/10/2026. Base: `integracao`, `82d80b2`.

## Antes → depois

- Cabeçalho saía da tela ao rolar → cabeçalho fixo, com título e rendimento; porção em gramas quando cadastrada.
- Fechar era apenas um ícone pequeno → área de 44×44px, incluindo foto ampliada.
- Ingredientes e etapas de 12,5px → texto de 15px, títulos de 16px, quantidade alinhada à direita, etapas numeradas em lista.
- Foto com mínimo fixo de 400px, inclusive placeholder vazio → foto inteira com limite proporcional à altura da tela e ampliação preservada; placeholder mais compacto.
- Etapas sem apresentar o texto geral → modo de preparo cadastrado também aparece; fichas com apenas texto não são apresentadas como vazias.
- Foco podia passar à página atrás → foco inicial no fechar, ciclo de Tab dentro do modal, Escape fecha a foto antes da ficha, retorno ao botão que abriu e rolagem do fundo bloqueada enquanto aberto.

Foto principal, fotos por etapa, sub-receitas e quantidades continuam presentes. Este é o modal aberto no painel de gestão; a ficha interativa do modo cozinha, com ajuste de quantidades e marcações, não foi substituída. Nenhum custo aparece na ficha operacional.

## Arquivo

`src/components/receitas/FichaProducaoModal.tsx`.

## Reversão

`git log --oneline --grep='polimento(ficha-producao): leitura e navegação no modal'`, depois `git revert <hash-do-commit>`. O grupo é independente e o revert não apaga fotos nem receitas.

Verificação consolidada em `docs/MELHORIAS_FICHAS_KANBAN.md`.
