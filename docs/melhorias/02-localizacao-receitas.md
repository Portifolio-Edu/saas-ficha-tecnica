# 02 — Localizar receitas no painel da gestão

Autorização: Edu, 06/10/2026. Base: `integracao`, `82d80b2`.

## Antes → depois

- Lista completa sem busca → busca por prato/categoria, sem exigir acentos.
- Sem filtros → categoria e margem abaixo da meta; filtros combináveis e botão para limpar.
- Nome sem foto → miniatura de 48px com a foto cadastrada; câmera discreta se faltar ou falhar.
- Sem informação sobre resultados → contagem de encontrados e estado vazio com recuperação da lista.
- Custos recalculados a cada tecla → cálculos existentes memoizados, sem trocar fórmulas.

A ficha completa continua expandida na lista, com ingredientes, FC, custos e indicadores. Ficha de produção, fotos, PDFs e ações continuam disponíveis. Durante a edição, os filtros ficam indisponíveis para não desmontar o formulário e perder o rascunho.

## Arquivos

`src/app/receitas/ReceitasClient.tsx`, `src/components/receitas/FotoReceitaMiniatura.tsx`, `filtros.ts`, `__tests__/filtros.test.ts`, `src/lib/busca.ts`.

## Reversão

`git log --oneline --grep='polimento(receitas): busca e filtros com fotos'`, depois `git revert <hash-do-commit>`.

O helper `src/lib/busca.ts` tem um commit de base separado; reverter este grupo não remove o helper usado pelo kanban. Nenhum dado é apagado: os filtros são locais e não persistidos.

## Verificação

Testes de busca sem acentos, categoria, combinação dos filtros, igualdade com a meta e precedência da meta individual. Resultado consolidado em `docs/MELHORIAS_FICHAS_KANBAN.md`.
