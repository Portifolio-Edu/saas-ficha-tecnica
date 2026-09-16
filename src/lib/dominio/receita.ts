// Tipos puros do domínio "receita" -- sem import de Supabase, mesmo motivo de
// src/lib/dominio/insumo.ts.
import type { UnidadeMedida } from "@/lib/calculo/types";

export type TipoReceita = "prato_final" | "preparo_base";
export type FormaFisica = "solido" | "liquido";
export type DestinoVenda = "proprio" | "varejo_terceiro";

export interface LinhaFichaInput {
  insumoId: string | null;
  subReceitaId: string | null;
  pesoLiquido: number;
  unidade: UnidadeMedida;
}

export interface LinhaFicha extends LinhaFichaInput {
  id: string;
}

export interface Receita {
  id: string;
  nomePrato: string;
  tipo: TipoReceita;
  categoria: string | null;
  precoVenda: number | null;
  vendasMes: number | null;
  rendimento: number;
  unidadeRendimento: string;
  pesoPorcaoG: number | null;
  formaFisica: FormaFisica;
  destinoVenda: DestinoVenda;
  margemAlvo: number | null;
  ficha: LinhaFicha[];
}

export interface ReceitaInput {
  nomePrato: string;
  tipo: TipoReceita;
  categoria: string | null;
  precoVenda: number | null;
  vendasMes: number | null;
  rendimento: number;
  unidadeRendimento: string;
  pesoPorcaoG: number | null;
  formaFisica: FormaFisica;
  destinoVenda: DestinoVenda;
  margemAlvo: number | null;
  ficha: LinhaFichaInput[];
}
