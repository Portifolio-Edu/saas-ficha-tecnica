# Busca de seções e lateral recolhível

Pedido de Edu em 06/10/2026, terceiro print: dois controles semelhantes aos da interface do ChatGPT, para buscar e minimizar o hub lateral.

- Arquivos: `src/components/ficha/ShellPremium.tsx` e `BuscaNavegacao.tsx`.
- Dois botões de ícone com alvo de 44px na barra superior: recolher/expandir a lateral (desktop/tablet) e buscar seção (também disponível no celular).
- A barra superior mantém altura mínima de 56px, mas permite que seus grupos quebrem em duas linhas em larguras curtas; os novos controles não forçam a saída dos botões de conta/papel/agente para fora da tela. Em larguras suficientes permanece uma linha.
- Ao recolher, a lateral de 240px fica oculta e o conteúdo ganha a largura liberada. O botão de expandir permanece visível na barra. A preferência é salva somente no navegador, com chaves separadas para demo e app (`ft:hub-lateral:v1:/preview` e `ft:hub-lateral:v1:app`). A barra inferior e o menu móvel continuam existentes.
- A busca filtra os nomes das seções que o papel atual pode acessar, ignorando acentos/maiúsculas. Usa links normais do Next.js e o prefixo correto da demo ou app. Não pesquisa registros de receitas/insumos no banco; a busca de pratos da tela de receitas continua disponível.
- Atalho Ctrl+K/⌘K abre/fecha. Setas percorrem resultados, Enter abre o resultado (o primeiro quando o foco está no campo), Escape fecha; Tab permanece dentro da janela. Foco inicial no campo, retorno ao botão/elemento de origem, rolagem do fundo bloqueada e restaurada; fundo fica inerte durante a busca.
- A busca usa portal no body, evitando o problema de posição da ficha. Ctrl+K não abre outra janela sobre uma ficha ou foto já aberta. Links continuam filtrados pelas mesmas permissões do menu; não há mudança de autenticação, RLS ou dados.
- Reversão: reverter o commit `feat(hub): busca de seções e lateral recolhível`. As chaves de preferência podem permanecer no navegador sem efeitos quando a versão anterior estiver em uso.
- Verificação: interações em DOM simulado cobrem persistência, reabertura, foco, Escape, teclado, busca sem acentos, rotas e papéis. Aparência, largura e uso em tablet dependem da conferência da prévia em um navegador autenticado.
