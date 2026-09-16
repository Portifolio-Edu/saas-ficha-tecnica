export type StatusProducao = "em_producao" | "produzido" | "perda";
export type TipoItemProducao = "preparo" | "prato";

export interface Turno {
  id: string;
  nome: string;
  horario: string | null;
}

export interface Producao {
  id: string;
  lote: string;
  tipo: TipoItemProducao;
  receitaId: string;
  nomeReceita: string;
  unidadeRendimento: string;
  quantidade: number;
  responsavel: string;
  turnoId: string | null;
  nomeTurno: string | null;
  chefeTurno: string | null;
  validade: string | null;
  status: StatusProducao;
  motivoPerda: string | null;
  criadoEm: string;
}

export interface ProducaoInput {
  lote: string;
  tipo: TipoItemProducao;
  receitaId: string;
  quantidade: number;
  responsavel: string;
  turnoId: string | null;
  chefeTurno: string | null;
  validade: string | null;
}
