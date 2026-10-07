# Melhorias reversíveis — fichas e kanban

Autorizadas por Edu em 06/10/2026: aplicar os aprimoramentos propostos e documentar todas as alterações para permitir arrependimento e reversão.

**Base anterior:** branch `integracao`, commit `82d80b2cc819f23ce49b758e06d9063154b4d72c`.
**Branch de trabalho:** `melhoria/fichas-kanban-polimento`.

## Registro de alterações

| Grupo | Commit | Resultado | Antes/depois, arquivos e reversão |
|---|---|---|---|
| 1 — Cadastro e edição | `3a294df` | Rótulos permanentes, validação, quantidade/unidade editáveis; preservação de fotos, etapas e meta individual | [Detalhes](melhorias/01-ficha-cadastro.md) |
| Base da busca | `344a5e1` | Normalização de texto com ou sem acentos, usada pelos dois filtros; sem alteração de dados | `src/lib/busca.ts` |
| 2 — Localizar receitas | `3fd2535` | Busca, categoria, margem abaixo da meta e miniatura de foto; ficha completa e PDFs mantidos | [Detalhes](melhorias/02-localizacao-receitas.md) |
| 3 — Kanban da gestão | `75c1d80` | Busca, filtros por turno/responsável, contagem exibidos/total, metadados legíveis e registro manual com rótulos | [Detalhes](melhorias/03-filtros-kanban.md) |
| 4 — Ficha de produção | `d818e51` | Cabeçalho fixo, rendimento, texto maior, fotos preservadas, fechar de 44px e navegação por teclado | [Detalhes](melhorias/04-ficha-producao.md) |

A navegação geral, os temas, as quatro etapas do kanban, o motor de custos, o consumo de estoque e as permissões não foram substituídos. Não há migration ou alteração de schema. A ficha interativa da cozinha, com “Vou fazer”, marcações e acesso aos preparos, continua sendo a existente.

## Desfazer uma melhoria

Em uma branch com o trabalho salvo, use o commit do grupo desejado:

```bash
git revert 3a294df  # cadastro e edição
git revert 3fd2535 # localizar receitas
git revert 75c1d80 # filtros e leitura do kanban
git revert d818e51 # modal da ficha de produção
```

**Escolha apenas a linha do grupo que deseja desfazer.** Os quatro grupos podem ser revertidos individualmente. O helper de busca tem um commit separado justamente para que desfazer os filtros de receitas não quebre os filtros do kanban.

## Desfazer todas as melhorias de interface

Execute a sequência abaixo, do mais recente para o mais antigo:

```bash
git revert --no-commit d818e51 75c1d80 3fd2535 344a5e1 3a294df
git commit -m "revert: retornar fichas e kanban ao visual anterior"
```

O revert cria um registro da volta e conserva o histórico. Não apaga receitas, fotos, lotes, perdas ou estoque salvos durante o uso. Para restaurar valores de negócio alterados por uma pessoa (por exemplo, uma quantidade de receita salva), é necessário editar esses dados: reverter código não restaura dados do banco.

Quando publicado, o commit de reversão precisa ser enviado à branch/deployment utilizado pelo restaurante para a volta aparecer na aplicação. Não use `reset --hard` na branch compartilhada para apagar o histórico.

## Verificação executada

- `npm test`: **268 testes aprovados em 39 arquivos**, incluindo 11 casos novos de formulário e filtros.
- `npx tsc --noEmit --incremental false`: aprovado.
- ESLint: sem erros nos arquivos alterados. O lint completo concluiu com **0 erros** e 94 avisos preexistentes nos scripts de uma skill local; esses arquivos não foram alterados.
- Interações dos componentes em **DOM simulado**, com as ações do servidor substituídas por retornos controlados: cadastro incompleto, decimal com vírgula, edição direta, preservação de fotos/etapas/meta, busca e combinação/limpeza dos filtros, proteção do rascunho, início/conclusão/perda de produção, turno de registro independente do filtro, baixa de estoque uma única vez, fotos/texto da ficha operacional, Tab, Escape, foco e desbloqueio da rolagem.
- Reversão de cada grupo testada em uma worktree temporária: arquivos do grupo voltaram à base. Reversão completa também testada: arquivos iguais a `82d80b2`. A worktree de trabalho não foi resetada.
- `git diff --check`: aprovado.

### Reproduzir as interações

O script não chama APIs, não faz upload e não grava no banco. Os registros de demonstração são criados apenas na memória/localStorage do DOM simulado e descartados ao encerrar.

```bash
npm ci
npm install --prefix /tmp/ficha-qa --no-save jsdom@26.1.0
FICHA_QA_MODULES=/tmp/ficha-qa/node_modules node scripts/verificar-fichas-kanban.mjs
```

O script usa o esbuild já instalado pelas dependências de desenvolvimento do projeto. A instalação de jsdom fica fora do projeto e não muda seu package.json/lockfile.

## Limites da validação e publicação

- O build local chegou à etapa de compilação, mas foi bloqueado por falha de conexão ao baixar **Hanken Grotesk** do Google Fonts (`next/font`). A fonte de produção não foi trocada para contornar a falha. O build de produção **não foi validado**.
- DOM simulado não valida aparência, medidas reais, contraste ou arrasto em um navegador/tablet. Essas verificações visuais e o salvamento contra o banco real continuam pendentes.
- A publicação da prévia separada foi autorizada pelo pedido de link em 2026-10-07. O Git local não tinha credenciais; os commits foram enviados pela conexão do GitHub, preservando a divisão por melhoria. Os códigos nesta tabela e nos comandos de reversão são os commits publicados. Nenhum merge em `integracao` ou `main` foi feito.

O código, a documentação e o histórico dos commits estão preparados localmente. Antes de promover a mudança, confirme a compilação no ambiente que consegue baixar a fonte e os fluxos em navegador/tablet.

## Registro da publicação da prévia (2026-10-07)

Branch: `melhoria/fichas-kanban-polimento`, baseada em `82d80b2` de `integracao`. A URL da prévia será registrada no PR assim que o build terminar; o endereço antigo de `integracao` não contém estas alterações.

A recriação dos commits pela API mudou seus códigos, mas as árvores Git de todos os cinco commits de implementação foram conferidas e são idênticas às árvores locais testadas. A documentação foi atualizada para usar os códigos publicados. O bundle local original continua sendo um backup adicional.
