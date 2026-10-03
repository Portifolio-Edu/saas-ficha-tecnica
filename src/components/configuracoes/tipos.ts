import type { Turno } from "@/lib/dominio/producao";

// CONFIGURAÇÕES (2026-10-03): as telas de Configurações recebem as ações por
// prop. No sistema são as server actions (app/configuracoes/actions.ts); na
// demo (/preview/configuracoes) são funções que gravam no "banco" da demo
// (lib/demo/armazem.ts). Assim a tela é uma só nos dois lugares.

export type ResultadoConfig = { ok: true } | { ok: false; erro: string };

export interface AcoesConfiguracoes {
  salvarRestaurante(entrada: { nomeRestaurante: string; nome: string; cnpj: string; margemAlvoPct: string }): Promise<ResultadoConfig>;
  salvarCanal(id: string | null, entrada: { nomeCanal: string; comissaoPct: string; embala: boolean; ativo: boolean }): Promise<ResultadoConfig>;
  excluirCanal(id: string): Promise<ResultadoConfig>;
  salvarTurno(id: string | null, entrada: { nome: string; horario: string }): Promise<ResultadoConfig>;
  excluirTurno(id: string): Promise<ResultadoConfig>;
}

export type TurnoConfig = Turno;
