import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "./erros";
import { CAMPOS_NUTRICIONAIS, type ValoresNutricionais } from "@/lib/calculo/nutricional";
import type {
  NutricionalOverride,
  NutricionalOverrideInput,
  Rotulagem,
  RotulagemInput,
  ValoresNutricionaisInsumo,
  ValoresNutricionaisInsumoInput,
} from "@/lib/dominio/nutricional";

export type {
  NutricionalOverride,
  NutricionalOverrideInput,
  Rotulagem,
  RotulagemInput,
  ValoresNutricionaisInsumo,
  ValoresNutricionaisInsumoInput,
} from "@/lib/dominio/nutricional";

// As colunas do banco usam snake_case (calorias_kcal, ...) e os tipos do
// motor de cálculo usam camelCase (caloriasKcal, ...) -- esse mapa evita
// escrever a tradução campo a campo em cada função abaixo.
const COLUNA_POR_CAMPO: Record<keyof ValoresNutricionais, string> = {
  caloriasKcal: "calorias_kcal",
  carboidratosG: "carboidratos_g",
  acucaresTotaisG: "acucares_totais_g",
  acucaresAdicionadosG: "acucares_adicionados_g",
  proteinasG: "proteinas_g",
  gordurasTotaisG: "gorduras_totais_g",
  gordurasSaturadasG: "gorduras_saturadas_g",
  gordurasTransG: "gorduras_trans_g",
  fibraAlimentarG: "fibra_alimentar_g",
  sodioMg: "sodio_mg",
};

type LinhaValores = Record<string, number | null>;

function valoresParaLinha(valores: Partial<ValoresNutricionais>): LinhaValores {
  const linha: LinhaValores = {};
  for (const campo of CAMPOS_NUTRICIONAIS) {
    linha[COLUNA_POR_CAMPO[campo]] = valores[campo] ?? null;
  }
  return linha;
}

function linhaParaValores(linha: LinhaValores): Partial<ValoresNutricionais> {
  const valores: Partial<ValoresNutricionais> = {};
  for (const campo of CAMPOS_NUTRICIONAIS) {
    const bruto = linha[COLUNA_POR_CAMPO[campo]];
    if (bruto != null) valores[campo] = Number(bruto);
  }
  return valores;
}

export async function listarValoresNutricionaisInsumos(): Promise<ValoresNutricionaisInsumo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("valores_nutricionais_insumo").select("*");
  if (error) throw new Error(mensagemErro(error));
  return ((data ?? []) as (LinhaValores & { insumo_id: string; base_gramas: number })[]).map((l) => ({
    insumoId: l.insumo_id,
    baseGramas: Number(l.base_gramas),
    valores: linhaParaValores(l),
  }));
}

export async function salvarValoresNutricionaisInsumo(insumoId: string, input: ValoresNutricionaisInsumoInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("valores_nutricionais_insumo")
    .upsert({ insumo_id: insumoId, base_gramas: input.baseGramas, ...valoresParaLinha(input.valores) }, { onConflict: "insumo_id" });
  if (error) throw new Error(mensagemErro(error));
}

export async function listarNutricionalOverrides(): Promise<NutricionalOverride[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("nutricional_override").select("*");
  if (error) throw new Error(mensagemErro(error));
  return ((data ?? []) as (LinhaValores & { receita_id: string; origem: string; informado_em: string })[]).map((l) => ({
    receitaId: l.receita_id,
    origem: l.origem,
    valores: linhaParaValores(l) as ValoresNutricionais,
    informadoEm: l.informado_em,
  }));
}

export async function salvarNutricionalOverride(receitaId: string, input: NutricionalOverrideInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("nutricional_override")
    .upsert({ receita_id: receitaId, origem: "laudo", ...valoresParaLinha(input.valores) }, { onConflict: "receita_id" });
  if (error) throw new Error(mensagemErro(error));
}

export async function removerNutricionalOverride(receitaId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("nutricional_override").delete().eq("receita_id", receitaId);
  if (error) throw new Error(mensagemErro(error));
}

interface LinhaRotulagem {
  receita_id: string;
  ingredientes: string | null;
  alergenos: string | null;
  gluten: string | null;
  lactose: string | null;
  fabricante: string | null;
  endereco: string | null;
  peso_liquido: string | null;
  conservacao: string | null;
}

function paraRotulagem(l: LinhaRotulagem): Rotulagem {
  return {
    receitaId: l.receita_id,
    ingredientes: l.ingredientes,
    alergenos: l.alergenos,
    gluten: l.gluten,
    lactose: l.lactose,
    fabricante: l.fabricante,
    endereco: l.endereco,
    pesoLiquido: l.peso_liquido,
    conservacao: l.conservacao,
  };
}

export async function listarRotulagens(): Promise<Rotulagem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rotulagem")
    .select("receita_id, ingredientes, alergenos, gluten, lactose, fabricante, endereco, peso_liquido, conservacao");
  if (error) throw new Error(mensagemErro(error));
  return ((data ?? []) as LinhaRotulagem[]).map(paraRotulagem);
}

export async function salvarRotulagem(receitaId: string, input: RotulagemInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("rotulagem").upsert(
    {
      receita_id: receitaId,
      ingredientes: input.ingredientes || null,
      alergenos: input.alergenos || null,
      gluten: input.gluten || null,
      lactose: input.lactose || null,
      fabricante: input.fabricante || null,
      endereco: input.endereco || null,
      peso_liquido: input.pesoLiquido || null,
      conservacao: input.conservacao || null,
    },
    { onConflict: "receita_id" },
  );
  if (error) throw new Error(mensagemErro(error));
}
