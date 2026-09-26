// AGENTE IA (2026-09-26): variáveis do agente (só no servidor, sem NEXT_PUBLIC_).
//  - AGENTE_SEGREDO: assina o passe (≥ 32 caracteres). Só o app conhece.
//  - AGENTE_CHAVE_N8N: chave que o n8n manda no cabeçalho x-ft-chave (≥ 32).
//    O app manda a mesma pro n8n ao chamar o webhook do chat.
//  - AGENTE_N8N_URL: webhook do workflow "FT — Agente (web)".
//  - AGENTE_WHATSAPP_NUMERO: número do WhatsApp do agente (só pra mostrar na tela).
// Passo a passo: docs/AGENTE_IA.md.
export function configAgente() {
  return {
    segredo: process.env.AGENTE_SEGREDO ?? "",
    chaveN8n: process.env.AGENTE_CHAVE_N8N ?? "",
    urlN8n: process.env.AGENTE_N8N_URL ?? "",
    numeroWhatsapp: process.env.AGENTE_WHATSAPP_NUMERO ?? "",
  };
}

export function agenteConfigurado(): boolean {
  const c = configAgente();
  return c.segredo.length >= 32 && c.chaveN8n.length >= 32 && c.urlN8n.startsWith("http");
}
