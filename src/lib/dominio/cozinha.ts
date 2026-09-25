// EQUIPE (2026-09-25): o que o aparelho da cozinha enxerga. Nenhum campo em
// R$ nem saldo de estoque — vem de dados_cozinha() no banco, que só devolve
// isto. Tipos puros, sem Supabase (vão pro componente cliente).
import type { StatusProducao } from "./producao";

export interface IngredienteFicha {
  id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  /** Sub-receita (preparo da casa) em vez de insumo comprado. */
  ehPreparo: boolean;
}

export interface EtapaFicha {
  ordem: number;
  titulo: string | null;
  texto: string | null;
  fotoUrl: string | null;
}

export interface FichaCozinha {
  id: string;
  nome: string;
  tipo: "prato_final" | "preparo_base";
  categoria: string | null;
  rendimento: number;
  unidadeRendimento: string;
  pesoPorcaoG: number | null;
  modoPreparo: string | null;
  fotoUrl: string | null;
  ingredientes: IngredienteFicha[];
  etapas: EtapaFicha[];
}

/** Item da contagem cega: nome, unidade e onde fica. Sem saldo. */
export interface ItemContagem {
  insumoId: string;
  nome: string;
  unidade: string;
  local: string;
}

export interface ProducaoCozinha {
  id: string;
  lote: string;
  receitaId: string;
  nomeReceita: string;
  quantidade: number;
  unidade: string;
  responsavel: string;
  status: StatusProducao;
  motivoPerda: string | null;
  criadoEm: string;
}
