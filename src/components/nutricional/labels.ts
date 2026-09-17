import type { CampoNutricional } from "@/lib/calculo/nutricional";

// Rótulos em português dos campos nutricionais -- compartilhado entre
// NutricionalClient (tabela e edição de laudo) e InsumoNutricaoForm.
export const LABEL_CAMPO: Record<CampoNutricional, string> = {
  caloriasKcal: "Energia (kcal)",
  carboidratosG: "Carboidratos (g)",
  acucaresTotaisG: "Açúcares totais (g)",
  acucaresAdicionadosG: "Açúcares adic. (g)",
  proteinasG: "Proteínas (g)",
  gordurasTotaisG: "Gorduras totais (g)",
  gordurasSaturadasG: "Saturadas (g)",
  gordurasTransG: "Trans (g)",
  fibraAlimentarG: "Fibra (g)",
  sodioMg: "Sódio (mg)",
};
