# Agente IA — como funciona e como ligar

Estado em 2026-09-26. O agente atende cada restaurante separado, pelo chat do
sistema (botão **Agente IA**) e pelo WhatsApp. Entende texto, foto (nota
fiscal, cupom, tabela nutricional), áudio, PDF e XML de NF-e.

## Como ele sabe quem é quem

Três workflows no n8n, pasta **FT — Ficha Técnica**:

| Workflow | O que faz |
|---|---|
| **FT — Agente IA · Chat do sistema** | Webhook do botão Agente IA. Confere o passe no próprio app (`/api/agente/passe`); sem passe válido responde 401 e não gasta IA. |
| **FT — Agente IA · WhatsApp** | Webhook da Evolution. Ativação por código, pergunta ao app quem é o número, marca como lida, "digitando…", baixa a mídia e responde. Evolution só por HTTP Request (credencial *evolutionapi*). |
| **FT — Agente IA · Núcleo** | Chamado pelos dois. Gemini lê os anexos (foto, áudio, PDF, XML) numa chamada HTTP e vira texto; o agente responde com **DeepSeek** e cai no **Gemini** se o DeepSeek falhar; memória no Redis. |

- A cada mensagem, o app gera um **passe** assinado (HMAC com
  `AGENTE_SEGREDO`): pessoa, restaurante (`cliente_id`), papel, nome, 15 min.
  O n8n não sabe assinar; só repassa.
- O n8n **não tem chave do banco**. A ferramenta "sistema" chama
  `/api/agente/ferramentas` com o passe, e o app roda **como a pessoa**
  (sessão Supabase dela, mesma RLS das telas): estoquista não vê custo, um
  restaurante nunca enxerga o outro.
- WhatsApp: o número só identifica alguém depois de **ativado** (a pessoa
  gera o código em Agente IA → aba WhatsApp e manda `ATIVAR 123456`).
- Memória separada por `ft:<restaurante>:<pessoa>:<canal>` (7 dias).
- O agente **não grava sozinho**: o que muda dado vira proposta e só vale
  quando a pessoa confirma ("sim" ou o botão **Confirmar**), uma vez só.
- O app manda pro n8n só as ferramentas que o papel pode usar; ferramenta
  nova (`src/lib/agente/ferramentas.ts`) não precisa mexer no n8n.

## Passo a passo pra ligar (🧑 você)

1. **Gerar dois segredos**: `openssl rand -hex 32` duas vezes
   (`AGENTE_SEGREDO` e `AGENTE_CHAVE_N8N`).
2. **Vercel → variáveis** (Production e Preview, sem `NEXT_PUBLIC_`):
   `AGENTE_SEGREDO`, `AGENTE_CHAVE_N8N`,
   `AGENTE_N8N_URL=https://webhook.eduandreazza.site/webhook/ft-agente-web`,
   `AGENTE_WHATSAPP_NUMERO` (só dígitos, com 55) e `NEXT_PUBLIC_SITE_URL`.
3. **n8n → Credentials → Header Auth** "FT — chave do app": Name
   `x-ft-chave`, Value = `AGENTE_CHAVE_N8N`. Selecionar nos nós
   **App: ativar número** e **App: quem está falando?** (workflow WhatsApp).
4. **Config** (nó no começo dos workflows Chat e WhatsApp): endereço do
   sistema em produção; no WhatsApp, também o nome da instância da Evolution.
   Enquanto a instância não for preenchida, o WhatsApp ignora tudo.
5. **Evolution**: na instância do agente, webhook `MESSAGES_UPSERT` para
   `https://webhook.eduandreazza.site/webhook/ft-agente-whatsapp-eab93b86dfe77e890c6d0c3aa9b1c702`
   (o final aleatório protege o webhook: não divulgue).
6. **Publicar** os três workflows (o Núcleo primeiro).
7. **Teste de fumaça**: Agente IA → "O que tem com estoque baixo?"; aba
   WhatsApp → gerar código → mandar `ATIVAR …` → mandar foto de uma nota e
   um áudio.

Modelos: DeepSeek (*DeepSeek account 3*) pra testes, Gemini (*Google
Gemini(PaLM) Api account*) de reserva e na leitura dos anexos. Trocar = nós
"DeepSeek (principal)" e "Gemini (reserva)" do Núcleo.

## Avisos automáticos

O mesmo WhatsApp do agente manda avisos sozinho (temperatura, abertura
atrasada, resumo de ontem): workflow **FT — Avisos (WhatsApp)**. Ver
docs/AVISOS_WHATSAPP.md.

## Onde mexer

| O quê | Onde |
|---|---|
| Ferramenta nova ou regra de quem usa | `src/lib/agente/ferramentas.ts` |
| O que precisa de confirmação | `src/lib/agente/propostas.ts` + migration `agente_acoes` |
| Jeito de falar, regras do agente | n8n, Núcleo, nó "Agente Ficha Técnica" (mensagem de sistema) |
| Modelos | n8n, Núcleo, nós "DeepSeek (principal)" e "Gemini (reserva)" |
| Leitura de foto/áudio/PDF | n8n, Núcleo, nó "Gemini: ler anexos" (instrução em "Preparar anexos") |
| Tela do chat e aba WhatsApp | `src/components/ia/AgenteChat.tsx` |

## Desligar

Tirar `AGENTE_N8N_URL` da Vercel: o chat responde "o agente ainda não está
ligado" e nada mais é chamado. No n8n, despublicar os workflows FT — Agente IA. O banco volta
com `supabase/reverter/20260928170000_agente_ia.sql`.
