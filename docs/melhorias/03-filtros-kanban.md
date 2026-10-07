# 03 — Filtros e leitura dos lotes no kanban da gestão

Autorização: Edu, 06/10/2026. Base: `integracao`, `82d80b2`.

## Antes → depois

- Percorrer todos os lotes → busca por prato, código do lote ou responsável (com ou sem acentos), filtros combinados por responsável e turno, incluindo sem turno.
- Um único seletor de turno para novos registros → mantém esse seletor, agora rotulado "Turno do registro", e cria outro controle explicitamente chamado "Filtrar por turno".
- Contagem sem contexto de busca → mostra exibidos/total nas colunas filtradas, total geral em texto e ação para limpar.
- Registro manual com placeholders e campos pequenos → rótulos permanentes, controles de 44px e grid adaptado ao celular. Validação e campos existentes mantidos.
- Quantidade, pessoa, turno e validade misturados → quantidade em linha própria e metadados rotulados, com texto de 13px.

As quatro colunas e suas cores continuam iguais. Filtros de pessoa/turno agem só nos lotes; a primeira coluna (capacidade disponível) acompanha apenas a busca por nome de prato. Estado vazio distingue ausência de lotes de ausência de resultados. A tabela de capacidade permanece completa.

Filtros não alteram registros nem são persistidos. Iniciar, concluir, arrastar e registrar perda usam os mesmos handlers; consumo, quantidade, motivo obrigatório, fotos/fichas, estoque e seleção do turno de novos registros não foram substituídos.

## Arquivos

`src/app/producoes/ProducoesClient.tsx`, `src/components/producoes/NovaProducaoForm.tsx`, `src/components/producoes/filtros.ts`, `src/components/producoes/__tests__/filtros.test.ts`.

## Reversão

`git log --oneline --grep='polimento(producoes): filtros e leitura dos lotes'`, depois `git revert <hash-do-commit>`. Pode ser revertido sozinho; o helper de busca tem um commit de base separado.

Nenhuma migration; nenhum lote, estoque ou perda é apagado pelo revert. Resultado consolidado em `docs/MELHORIAS_FICHAS_KANBAN.md`.
