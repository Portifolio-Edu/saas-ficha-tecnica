# Início da operação — 07/10/2026

Antes: o cadastro com sessão aberta levava diretamente a Insumos; a Visão geral não orientava uma conta vazia.

Agora: os dois caminhos de cadastro levam à Visão geral. Um guia acompanha dados reais de insumos, ficha do prato (ingredientes, rendimento, preparo e foto), estoque rastreado, produção e fechamento. Saldo zero conta como estoque informado. As etapas podem ser abertas em qualquer ordem. O guia desaparece quando todas estão prontas. Links respeitam `/preview`.

Não há nova tabela, gravação automática, mudança de cálculo ou bloqueio dos fluxos existentes. A ficha de produção, ficha completa, fotos e Kanban continuam nos módulos atuais.

Validação: teste de conta vazia, ficha incompleta, estoque zero e operação completa; TypeScript e lint. Aparência em navegador e cadastro no banco real ainda exigem acesso à implantação protegida.

Reversão: reverter o commit `feat: orientar o início da operação com dados reais`; não há dados a migrar ou excluir.
