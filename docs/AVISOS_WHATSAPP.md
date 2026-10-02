# Avisos no WhatsApp — como funciona e como ligar

Estado em 2026-10-02. O sistema avisa sozinho, pelo WhatsApp, o dono e os
gestores de cada restaurante. É a primeira peça da "central de automações"
com o n8n.

| Aviso | Quando | Respeita o silêncio? |
|---|---|---|
| Temperatura fora da faixa | Até 5 min depois de alguém registrar (registros das últimas 2 h) | Não: é segurança do alimento |
| Abertura atrasada | Checklist de abertura incompleto depois do horário (janela de 4 h) | Sim |
| Resumo de ontem | No horário escolhido (janela de 3 h): produções, perdas, temperaturas, checklists, pedidos esperando compra | Sim |

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
  (`reservar_avisos()` usa `skip locked`).
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
4. Testar: no sistema, ativar o seu WhatsApp no agente; registrar uma
   temperatura fora da faixa; no n8n, **Execute workflow**. Deve chegar a
   mensagem e o histórico mostrar "Enviado".
5. **Publicar** o workflow.

## Onde mexer

| O quê | Onde |
|---|---|
| Texto dos avisos, janelas, silêncio | `src/lib/automacoes/avisos.ts` (+ testes em `__tests__`) |
| Quais dados entram em cada aviso | `src/lib/automacoes/gerar.ts` |
| Aviso novo | tipo em `avisos.ts` + `check` em `avisos.tipo` (migration) + busca em `gerar.ts` + opção em `SecaoAvisos.tsx` |
| Tela | `src/components/configuracoes/SecaoAvisos.tsx` |
| Envio (ritmo, Evolution) | n8n, workflow **FT — Avisos (WhatsApp)** |

## Desligar

Despublicar o workflow no n8n (nada mais sai; os avisos ficam na fila e
vencem pela janela de horário). Cada restaurante também pode desligar cada
aviso na tela. Banco: `supabase/reverter/20261002100000_avisos_whatsapp.sql`.

## Próximos avisos (mesma estrutura)

- Escalas fase 3: falta na escala → chamar extras compatíveis.
- Estoque abaixo do mínimo com sugestão de pedido.
- Preço de insumo que subiu e pratos que perderam margem.
- NF-e por e-mail → proposta de entrada no estoque.
