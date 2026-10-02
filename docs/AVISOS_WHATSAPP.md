# Avisos no WhatsApp — como funciona e como ligar

Estado em 2026-10-02. O sistema avisa sozinho, pelo WhatsApp, o dono e os
gestores de cada restaurante sobre o que pede ação deles. É a primeira peça
da "central de automações" com o n8n.

**Problemas pra resolver** (chegam na hora; vários juntos viram um aviso só;
item já avisado não volta):

| Aviso | Quando | Opção na tela |
|---|---|---|
| Insumo abaixo do mínimo | Saldo < mínimo. Diz quanto tem e o prazo do fornecedor pra repor. Volta a avisar só depois de uma nova entrada (compra) e nova queda | Falta de insumo |
| Pedido do fornecedor fechando | Faltam até 2 h pro prazo do fornecedor e há pedido da cozinha esperando nas categorias dele | Problema com fornecedor |
| Fornecedor subiu o preço | Troca de preço de +10% ou mais nas últimas 24 h | Problema com fornecedor |
| Carne rendendo menos | Processamento das últimas 24 h com fator de correção 10%+ pior que o da ficha (cita o fornecedor) | Problema com fornecedor |
| Falta gente na equipe | Falta/atestado ou equipe abaixo do mínimo hoje ou amanhã (motor da escala), a partir do horário escolhido | Falta de funcionário |
| Produção perdida | Produção marcada como perda (últimas 72 h), com motivo e quem registrou | Desperdício |

**Relatórios**:

| Aviso | Quando | Opção na tela |
|---|---|---|
| Fechamento de vendas | Fechamento de CMV feito nas últimas 24 h: faturamento, CMV (% e R$) e os 5 pratos mais vendidos | Relatório de vendas |
| Resumo de ontem | No horário escolhido (janela de 3 h): produções, perdas, checklists, insumos abaixo do mínimo, pedidos esperando compra | Resumo de ontem |
| Abertura atrasada | Checklist de abertura incompleto depois do horário (janela de 4 h) | Abertura atrasada |

O **horário de silêncio** vale pra todos: o que acontecer chega junto quando
terminar. **Temperatura e higiene não entram**: são cobrança da
nutricionista (canal próprio, depois). Os limites (2 h, 10%, 24 h…) ficam em
`LIMITES`, em `src/lib/automacoes/avisos.ts`.

Cada restaurante escolhe em **Configurações → Avisos no WhatsApp** (dono e
gestor): liga/desliga, horários, horário de silêncio, quem recebe e o
histórico dos últimos 15 avisos.

## Quem decide o quê

```
n8n (a cada 5 min) ──POST /api/automacoes/pendentes──▶ app
                                                       ├─ monta os avisos que estão na hora (src/lib/automacoes)
                                                       ├─ guarda na caixa de saída (tabela avisos, chave única)
                                                       └─ devolve os pendentes já reservados
n8n ──Evolution sendText (1 por vez)──▶ WhatsApp
n8n ──POST /api/automacoes/resultado──▶ app (enviado / volta pra fila / falhou)
```

- **O app decide** (regras com teste, isolamento por restaurante). O n8n só
  agenda e entrega; não tem chave do banco.
- **Uma vez só**: a chave única (restaurante, tipo, chave, pessoa) impede
  aviso repetido, mesmo com dois disparos ao mesmo tempo
  (`reservar_avisos()` usa `skip locked`). Nos avisos em lote, os itens de
  cada aviso ficam em `avisos.detalhe`; o servidor só manda os que não
  saíram nos últimos 30 dias.
- **Falhou**: volta pra fila; depois de 3 tentativas fica "Não enviado" com
  o motivo no histórico.
- **Quem recebe**: dono/gestor ativo com o WhatsApp **verificado** no agente
  (Agente IA → WhatsApp → código de ativação).

## Ligar (🧑 você)

Pré-requisito: o agente já ligado (docs/AGENTE_IA.md): `AGENTE_CHAVE_N8N`
e `SUPABASE_SERVICE_ROLE_KEY` na Vercel, e a credencial **FT — chave do
app** no n8n.

1. n8n → pasta **FT — Ficha Técnica** → **FT — Avisos (WhatsApp)**.
2. Nó **Config**: endereço do sistema em produção e a instância da
   Evolution (a mesma do agente).
3. Nós **App: avisos pendentes** e **App: contar resultado**: selecionar a
   credencial **FT — chave do app**.
4. Testar: no sistema, ativar o seu WhatsApp no agente; baixar o saldo de
   um insumo abaixo do mínimo (Estoque) ou marcar uma produção como perda;
   no n8n, **Execute workflow**. Deve chegar a mensagem e o histórico
   mostrar "Enviado".
5. **Publicar** o workflow.

## Onde mexer

| O quê | Onde |
|---|---|
| Texto dos avisos, janelas, silêncio, limites | `src/lib/automacoes/avisos.ts` (+ testes em `__tests__`) |
| Quais dados entram em cada aviso | `src/lib/automacoes/gerar.ts` |
| Aviso novo | tipo em `avisos.ts` + `check` em `avisos.tipo` (migration) + busca em `gerar.ts` + opção e rótulo em `SecaoAvisos.tsx` |
| Tela | `src/components/configuracoes/SecaoAvisos.tsx` |
| Envio (ritmo, Evolution) | n8n, workflow **FT — Avisos (WhatsApp)** |

## Desligar

Despublicar o workflow no n8n (nada mais sai; os avisos ficam na fila e
vencem pela janela de horário). Cada restaurante também pode desligar cada
aviso na tela. Banco: `supabase/reverter/20261002120000_avisos_gestao.sql`
(volta ao formato anterior) e depois
`supabase/reverter/20261002100000_avisos_whatsapp.sql` (remove tudo).

## Próximos avisos (mesma estrutura)

- Escalas fase 3: falta na escala → chamar extras compatíveis (o aviso de
  equipe já sai; falta o disparo pros extras).
- Vendas do dia (quando o PDV estiver integrado): hoje só sai no fechamento.
- Nutricionista: temperatura e higiene, num canal dela.
- NF-e por e-mail → proposta de entrada no estoque.
