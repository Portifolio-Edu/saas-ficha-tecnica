// ESCALAS (2026-09-26): tipos do motor de escalas. Puros (sem Supabase), pra
// rodar igual no servidor, no navegador e nos testes.

/** "2026-10-03". Datas sempre como dia civil, sem hora nem fuso. */
export type DataISO = string;

/** 0 = domingo … 6 = sábado (igual ao Date do JS). */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type TipoEscala = "5x2" | "6x1" | "12x36" | "24x48";
export type Setor = "cozinha" | "salao" | "bar" | "outro";
export type Nivel = "auxiliar" | "junior" | "pleno" | "senior" | "chefe";

/** Restrição temporária vinda do prontuário. Guarda o efeito na escala,
 * nunca o diagnóstico (LGPD: dado de saúde é sensível). */
export type Restricao = "sem_escala_longa" | "sem_noturno" | "sem_carga_pesada";

export type TipoOcorrencia = "falta" | "atestado" | "afastamento" | "ferias" | "restricao" | "ausencia" | "ausencia_prolongada";
// Versões públicas (tablet da cozinha), sem o motivo:
//  - "ausencia" = falta ou atestado: só vale nos dias em que a pessoa trabalharia;
//  - "ausencia_prolongada" = afastamento: vale no período todo (folga inclusive).
// Assim a cozinha vê exatamente o que o gestor vê, só que como "Ausente".

export interface ConfigEscala {
  tipo: TipoEscala;
  /** Primeiro dia de trabalho do ciclo. Nos regimes alternados (12x36, 24x48)
   * é o que define em quais dias a pessoa trabalha. */
  ancora: DataISO;
  /** 5x2 e 6x1: dias de folga escolhidos pelo gestor (seg a qui). Vazio =
   * calcula pela âncora e remaneja o que cair fora de seg–qui. */
  folgasPreferidas?: DiaSemana[];
  /** Sobrescreve o intervalo do rodízio de domingo só pra esta pessoa. */
  intervaloDomingoSemanas?: number;
  turno?: { inicio: string; fim: string };
}

export interface FuncionarioEscala {
  id: string;
  nome: string;
  setor: Setor;
  cargo: string;
  nivel?: Nivel;
  habilidades?: string[];
  admissao: DataISO;
  desligamento?: DataISO | null;
  escala: ConfigEscala;
}

export interface Ocorrencia {
  id: string;
  funcionarioId: string;
  tipo: TipoOcorrencia;
  inicio: DataISO;
  fim: DataISO;
  restricoes?: Restricao[];
  nota?: string;
}

/** O que o restaurante configura. Sexta/sábado protegidos, folga só seg–qui
 * e máximo de 6 dias seguidos NÃO são configuráveis (ver motor.ts). */
export interface RegrasEscala {
  /** A cada quantas semanas cada pessoa folga um domingo (rodízio). */
  intervaloDomingoSemanas: number;
  /** Mínimo de pessoas trabalhando por dia em cada equipe ("cozinha:Sushiman"). */
  coberturaMinima: Record<string, number>;
}

export type SituacaoDia =
  | "trabalho"
  | "folga"
  | "folga_domingo"
  | "folga_compensatoria"
  | "falta"
  | "atestado"
  | "afastado"
  | "ferias"
  | "ausente"
  | "fora_do_contrato";

export interface DiaEscala {
  data: DataISO;
  situacao: SituacaoDia;
  /** Por que o motor mexeu neste dia (mostrado no calendário). */
  ajuste?: string;
}

export type TipoAlerta = "contingencia" | "cobertura" | "restricao" | "folga_remanejada" | "legal";
export type Severidade = "info" | "atencao" | "critico";

/** Perfil que a contingência (Fase 3) usa pra achar extras. */
export interface PerfilVaga {
  setor: Setor;
  cargo: string;
  nivel?: Nivel;
  habilidades: string[];
}

export interface Alerta {
  tipo: TipoAlerta;
  severidade: Severidade;
  mensagem: string;
  data?: DataISO;
  funcionarioId?: string;
  equipe?: string;
  /** Contingência: perfil de quem faltou (cenário A) ou da equipe (cenário B). */
  perfil?: PerfilVaga;
  /** Cobertura: quantas pessoas faltam pra chegar no mínimo. */
  faltam?: number;
}

export interface ResultadoEscala {
  porFuncionario: Record<string, DiaEscala[]>;
  alertas: Alerta[];
}
