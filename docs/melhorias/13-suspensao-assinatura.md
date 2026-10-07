# Suspensão e cancelamento — 07/10/2026

A conciliação diferencia uma assinatura suspensa (`INACTIVE`) de uma assinatura removida (`deleted=true`). Só a removida é cancelamento definitivo. A suspensa pode ser encerrada pela seção Plano e continua protegida contra exclusão da conta ou criação de uma recorrência duplicada.

O resumo principal de Plano também ganhou rótulos para suspensão e pagamento pendente. Um teste unitário e duas verificações SQL adicionais cobrem esse caso.

A migration da assinatura é nova nesta revisão e não foi aplicada ao banco comercial; ela já contempla o estado `inativa`. Se alguém aplicar uma versão intermediária antes de concluir esta revisão, ajustar os constraints e a RPC antes de habilitar a cobrança.

Reversão: reverter `fix: distinguir suspensão de cancelamento da assinatura` junto com o pacote de cobrança. Se houver linhas com estado `inativa` em um ambiente ativado, manter a proteção no banco e conciliar/cancelar no provedor antes de reverter código; não converter suspensão em cancelamento apenas para liberar exclusão.
