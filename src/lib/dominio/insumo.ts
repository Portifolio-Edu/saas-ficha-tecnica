// Tipos e constantes puras do domínio "insumo" -- sem import de Supabase, pra
// poder ser importado tanto por código de servidor (src/lib/dados/insumos.ts)
// quanto por componentes cliente sem puxar `next/headers` pro bundle deles.
import type { UnidadeMedida } from "@/lib/calculo/types";

export type Categoria = "proteina" | "hortalica" | "fruta" | "laticinio" | "tempero" | "embalagem" | "outro";

export const CATEGORIAS: { id: Categoria; label: string }[] = [
  { id: "proteina", label: "Proteína (carne/peixe/aves)" },
  { id: "hortalica", label: "Hortaliça/legume" },
  { id: "fruta", label: "Fruta" },
  { id: "laticinio", label: "Laticínio" },
  { id: "tempero", label: "Tempero" },
  { id: "embalagem", label: "Embalagem" },
  { id: "outro", label: "Outro" },
];

export const UNIDADES: UnidadeMedida[] = ["kg", "g", "l", "ml", "un"];

export interface Insumo {
  id: string;
  nome: string;
  categoria: Categoria;
  unidadeMedida: UnidadeMedida;
  tamanhoEmbalagem: number;
  precoEmbalagem: number;
  precoUnitario: number;
  fatorCorrecao: number;
  pesoPorUnidade: number | null;
  estoque: { saldoAtual: number; estoqueMinimo: number } | null;
}

export interface InsumoInput {
  nome: string;
  categoria: Categoria;
  unidadeMedida: UnidadeMedida;
  tamanhoEmbalagem: number;
  precoEmbalagem: number;
  fatorCorrecao: number;
  pesoPorUnidade: number | null;
}
