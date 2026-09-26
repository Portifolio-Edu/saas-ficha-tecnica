// AGENTE IA (2026-09-26): erro de uso (argumento faltando, item não achado,
// proposta já decidida). Volta pro agente ler e corrigir; não entra no
// monitoramento de erros (erros_sistema), que é pra falha do sistema.
export class ErroFerramenta extends Error {}
