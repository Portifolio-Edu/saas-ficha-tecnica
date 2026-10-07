# 01 — Cadastro e edição da ficha

Autorização: Edu, 06/10/2026. Base: `integracao`, `82d80b2`.

## Antes → depois

- Campos identificados sobretudo pelo placeholder → rótulos permanentes e controles de 44px, texto de 14px.
- Salvar sem nome, preço, rendimento ou ingredientes podia não dar retorno → mensagens junto dos campos, resumo anunciado e foco no primeiro campo inválido.
- Quantidade/unidade exigiam remover e adicionar o ingrediente → edição direta, com rascunho textual que permite apagar e redigitar antes de salvar.
- `parseFloat` podia truncar uma vírgula → números decimais com vírgula ou ponto, validação de positivos e opcionais.
- Trocar para preparo mantinha a unidade do insumo anterior → unidade inicial `un`, consistente com a quantidade do preparo usada no cálculo existente.
- Editar uma receita apagava `margemAlvo` → preserva a meta individual e a unidade de rendimento existentes.
- Controles pequenos de foto → alvos de 44px; armazenamento, compressão e preview continuam usando o mesmo fluxo.

Fotos do prato e de cada etapa, modo de preparo, sub-receitas, opcionais, custos e exportações continuam disponíveis. Nenhuma migration, alteração de banco ou mudança no motor de custos.

## Arquivos

`ReceitaForm.tsx`, `UploadFoto.tsx`, `formulario.ts` e `__tests__/formulario.test.ts`, em `src/components/receitas/`.

## Reversão

Localize o commit: `git log --oneline --grep='polimento(fichas): cadastro claro e edição direta'`.
Execute `git revert <hash-do-commit>` em uma branch limpa. Isso desfaz a interface sem apagar receitas, fotos ou registros já salvos. Dados digitados e salvos durante o uso permanecem no banco.

## Verificação

Testes cobrem vírgula decimal, campos obrigatórios, opcionais, zero/negativos e edição parcialmente vazia. A verificação consolidada e os hashes estão em `docs/MELHORIAS_FICHAS_KANBAN.md`.
