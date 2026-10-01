// Tipos puros do domínio "nutricional" -- sem import de Supabase, mesmo
// motivo de src/lib/dominio/insumo.ts. Reaproveita os tipos do motor de
// cálculo (puro, sem I/O), igual dominio/insumo.ts já faz com UnidadeMedida.
import type { ValoresNutricionais } from "@/lib/calculo/nutricional";
import type { MapaAlergenicos, StatusGluten, StatusLactose } from "./rotuloVarejo";

export interface ValoresNutricionaisInsumo {
  insumoId: string;
  baseGramas: number;
  valores: Partial<ValoresNutricionais>;
}

export interface ValoresNutricionaisInsumoInput {
  baseGramas: number;
  valores: Partial<ValoresNutricionais>;
}

export interface NutricionalOverride {
  receitaId: string;
  origem: string;
  valores: ValoresNutricionais;
  informadoEm: string;
}

export interface NutricionalOverrideInput {
  valores: ValoresNutricionais;
}

export interface Rotulagem {
  receitaId: string;
  ingredientes: string | null;
  alergenos: string | null;
  gluten: string | null;
  lactose: string | null;
  fabricante: string | null;
  endereco: string | null;
  pesoLiquido: string | null;
  conservacao: string | null;
  /** RÓTULO PARA VAREJO (2026-09-26): campos estruturados (rotuloVarejo.ts). */
  alergenicos: MapaAlergenicos | null;
  glutenStatus: StatusGluten | null;
  lactoseStatus: StatusLactose | null;
  medidaCaseira: string | null;
  modoPreparo: string | null;
}

export interface RotulagemInput {
  ingredientes: string;
  alergenos: string;
  gluten: string;
  lactose: string;
  fabricante: string;
  endereco: string;
  pesoLiquido: string;
  conservacao: string;
  alergenicos: MapaAlergenicos | null;
  glutenStatus: StatusGluten | null;
  lactoseStatus: StatusLactose | null;
  medidaCaseira: string;
  modoPreparo: string;
}
