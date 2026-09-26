# Agente IA — como funciona e como ligar

Estado em 2026-09-26. O agente atende cada restaurante separado, pelo chat do
sistema (botão **Agente IA**) e pelo WhatsApp. Entende texto, foto (nota
fiscal, cupom, tabela nutricional), áudio, PDF e XML de NF-e.

## Como ele sabe quem é quem

```
Chat do sistema ──► app /api/agente/mensagem ──► n8n "FT — Agente IA" ──► Claude
WhatsApp ─► Evolution ─► n8n ─► app /api/agente/whatsapp/sessao (quem é este número?)
                                   │
                  ferramenta "sistema" ─► app /api/agente/ferramentas (com o passe)
```

- A cada mensagem, o app gera um **passe** assinado (HMAC com
  `AGENTE_SEGREDO`) com: pessoa, restaurante (`cliente_id`), papel, nome e
  validade de 15 minutos. O n8n não sabe assinar; só repassa o passe.
- O n8n **não tem chave do banco**. As ferramentas rodam no app **como a
  pessoa** (sessão Supabase dela, mesma RLS das telas): estoquista não vê
  custo, um restaurante nunca enxerga o outro.
- No WhatsApp, o número só identifica alguém depois de **ativado**: a
  pessoa gera um código no sistema (Agente IA → aba WhatsApp) e manda
  `ATIVAR 123456` pro número do agente. Número não ativado recebe só a
  instrução de ativação.
- Memória da conversa no Redis, separada por `ft:<restaurante>:<pessoa>:<canal>`
  (7 dias).
- O agente **não grava sozinho**: o que muda dado (entrada de nota, perda,
  pedido de compra, tabela nutricional, lista de produção) vira proposta.
  Só vale quando a pessoa confirma ("sim" na conversa ou o botão
  **Confirmar** no chat), e uma vez só. Tudo fica em `agente_acoes`.
- Ferramentas: `src/lib/agente/ferramentas.ts`. O app manda pro n8n só as
  que o papel da pessoa pode usar; ferramenta nova não precisa mexer no n8n.

## Passo a passo pra ligar (🧑 você)

1. **Gerar dois segredos** (um terminal qualquer): `openssl rand -hex 32`
   duas vezes. Um é o `AGENTE_SEGREDO`, o outro a `AGENTE_CHAVE_N8N`.
2. **Vercel → variáveis** (Production e Preview, sem `NEXT_PUBLIC_`):
   - `AGENTE_SEGREDO` = primeiro segredo (só o app conhece);
   - `AGENTE_CHAVE_N8N` = segundo segredo;
   - `AGENTE_N8N_URL` = `https://webhook.eduandreazza.site/webhook/ft-agente-web`;
   - `AGENTE_WHATSAPP_NUMERO` = número do agente com DDI, só dígitos (ex.: `5511999998888`);
   - `NEXT_PUBLIC_SITE_URL` = endereço de produção (o n8n chama as ferramentas nele).
3. **n8n → Credentials → Header Auth** chamada **FT — chave do app**:
   Name `x-ft-chave`, Value = `AGENTE_CHAVE_N8N`. Me avise que eu ligo a
   credencial nos três nós (webhook "Chat do sistema", "Ativar número" e
   "Quem está falando?"). O webhook do chat está **sem autenticação** até lá:
   não publique antes.
4. **n8n → workflow "FT — Agente IA"** (pasta *FT — Ficha Técnica*), nó
   **Config WhatsApp**: endereço do sistema e nome da instância da Evolution
   do número do agente.
5. **Crédito de IA**: o agente usa Claude (credencial *Anthropic account*) e,
   se falhar, GPT (*OpenAi account*); o áudio é transcrito pela *OpenAi
   account*. Em 26/09 as duas contas estavam **sem crédito**.
6. **Evolution**: na instância do agente, webhook com o evento
   `MESSAGES_UPSERT` apontando pra
   `https://webhook.eduandreazza.site/webhook/ft-agente-whatsapp-eab93b86dfe77e890c6d0c3aa9b1c702`.
   O final aleatório do endereço é o que protege esse webhook: não publique
   esse link.
7. **Publicar** o workflow no n8n (só depois dos itens 3 a 5).
8. **Teste de fumaça**: no sistema, Agente IA → "O que tem com estoque baixo?";
   depois aba WhatsApp → gerar código → mandar `ATIVAR …` → mandar foto de uma
   nota.

## Onde mexer

| O quê | Onde |
|---|---|
| Ferramenta nova ou regra de quem usa | `src/lib/agente/ferramentas.ts` |
| O que precisa de confirmação | `src/lib/agente/propostas.ts` + migration `agente_acoes` |
| Jeito de falar, regras do agente | n8n, nó "Agente Ficha Técnica" (mensagem de sistema) |
| Modelo (Claude / reserva GPT) | n8n, nós "Claude" e "GPT (reserva)" |
| Tela do chat e aba WhatsApp | `src/components/ia/AgenteChat.tsx` |

## Desligar

Tirar `AGENTE_N8N_URL` da Vercel: o chat responde "o agente ainda não está
ligado" e nada mais é chamado. No n8n, despublicar o workflow. O banco volta
com `supabase/reverter/20260928170000_agente_ia.sql`.
