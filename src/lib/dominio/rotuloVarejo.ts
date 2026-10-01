// RÓTULO PARA VAREJO (2026-09-26): regras puras do rótulo de produto vendido
// em supermercado/varejo de terceiro. Sem Supabase (vai pro navegador e pro PDF).
//
// Normas usadas (resumo, a revisão final é do responsável técnico):
//  - RDC 429/2020 e IN 75/2020: tabela nutricional por 100 g/mL E por porção,
//    com medida caseira, %VD, arredondamento (Anexo IV) e lupa frontal.
//  - RDC 26/2015: alergênicos ("ALÉRGICOS: CONTÉM…", "CONTÉM DERIVADOS DE…",
//    "PODE CONTER…"), em caixa alta e negrito.
//  - Lei 10.674/2003: "CONTÉM GLÚTEN" ou "NÃO CONTÉM GLÚTEN" em todo alimento.
//  - RDC 136/2017: "CONTÉM LACTOSE" (> 100 mg/100 g), "ZERO LACTOSE",
//    "BAIXO TEOR DE LACTOSE".
//  - RDC 727/2022: ingredientes em ordem decrescente de quantidade;
//    ingrediente composto com os dele entre parênteses.
// Onde mexer: aqui (texto e regras) e src/components/nutricional/RotuloVarejo*.
import type { Insumo } from "./insumo";
import type { LinhaFicha, Receita } from "./receita";
import { converterParaUnidadeDoInsumo } from "@/lib/calculo/conversaoUnidade";
import { VDR, pesoBrutoEmGramas, type CampoNutricional, type ValoresNutricionais } from "@/lib/calculo/nutricional";

// ---------------------------------------------------------------------------
// Alergênicos (RDC 26/2015, Anexo)

export const ALERGENICOS = [
  { id: "trigo", nome: "trigo", gluten: true },
  { id: "centeio", nome: "centeio", gluten: true },
  { id: "cevada", nome: "cevada", gluten: true },
  { id: "aveia", nome: "aveia", gluten: true },
  { id: "leite", nome: "leite", gluten: false },
  { id: "ovos", nome: "ovos", gluten: false },
  { id: "soja", nome: "soja", gluten: false },
  { id: "amendoim", nome: "amendoim", gluten: false },
  { id: "peixes", nome: "peixes", gluten: false },
  { id: "crustaceos", nome: "crustáceos", gluten: false },
  { id: "amendoa", nome: "amêndoa", gluten: false },
  { id: "avela", nome: "avelã", gluten: false },
  { id: "castanha-caju", nome: "castanha-de-caju", gluten: false },
  { id: "castanha-para", nome: "castanha-do-brasil", gluten: false },
  { id: "macadamia", nome: "macadâmia", gluten: false },
  { id: "nozes", nome: "nozes", gluten: false },
  { id: "peca", nome: "pecã", gluten: false },
  { id: "pistache", nome: "pistache", gluten: false },
  { id: "pinoli", nome: "pinoli", gluten: false },
  { id: "castanhas", nome: "castanhas", gluten: false },
  { id: "latex", nome: "látex natural", gluten: false },
] as const;

export type IdAlergenico = (typeof ALERGENICOS)[number]["id"];
/** contem = o próprio alimento; derivados = ingrediente feito dele; pode_conter = contaminação cruzada. */
export type PresencaAlergenico = "contem" | "derivados" | "pode_conter";
/** null = ainda não revisado; {} = revisado, sem alergênico. */
export type MapaAlergenicos = Partial<Record<IdAlergenico, PresencaAlergenico>>;

export type StatusGluten = "contem" | "nao_contem";
export type StatusLactose = "contem" | "zero" | "baixo" | "nao_se_aplica";

export const TEXTO_GLUTEN: Record<StatusGluten, string> = { contem: "CONTÉM GLÚTEN", nao_contem: "NÃO CONTÉM GLÚTEN" };
export const TEXTO_LACTOSE: Record<StatusLactose, string | null> = {
  contem: "CONTÉM LACTOSE",
  zero: "ZERO LACTOSE",
  baixo: "BAIXO TEOR DE LACTOSE",
  nao_se_aplica: null,
};

function juntar(nomes: string[]): string {
  if (nomes.length <= 1) return nomes.join("");
  return `${nomes.slice(0, -1).join(", ")} E ${nomes[nomes.length - 1]}`;
}

/** "ALÉRGICOS: CONTÉM OVOS E DERIVADOS DE TRIGO E SOJA. PODE CONTER LEITE." (null = nada a declarar). */
export function textoAlergicos(mapa: MapaAlergenicos | null): string | null {
  if (!mapa) return null;
  const de = (p: PresencaAlergenico) => ALERGENICOS.filter((a) => mapa[a.id] === p).map((a) => a.nome.toUpperCase());
  const contem = de("contem");
  const derivados = de("derivados");
  const podeConter = de("pode_conter");
  const partes: string[] = [];
  if (contem.length && derivados.length) partes.push(`CONTÉM ${juntar(contem)} E DERIVADOS DE ${juntar(derivados)}.`);
  else if (contem.length) partes.push(`CONTÉM ${juntar(contem)}.`);
  else if (derivados.length) partes.push(`CONTÉM DERIVADOS DE ${juntar(derivados)}.`);
  if (podeConter.length) partes.push(`PODE CONTER ${juntar(podeConter)}.`);
  return partes.length ? `ALÉRGICOS: ${partes.join(" ")}` : null;
}

/** Glúten sugerido pelos alergênicos (trigo, centeio, cevada, aveia). */
export function glutenPelosAlergenicos(mapa: MapaAlergenicos | null): StatusGluten | null {
  if (!mapa) return null;
  return ALERGENICOS.some((a) => a.gluten && (mapa[a.id] === "contem" || mapa[a.id] === "derivados")) ? "contem" : "nao_contem";
}

// ---------------------------------------------------------------------------
// Lista de ingredientes (ordem decrescente de quantidade)

export interface IngredienteRotulo {
  nome: string;
  /** Gramas na receita (null = não deu pra converter; vai pro fim da lista). */
  gramas: number | null;
  /** Ingrediente composto (preparo da casa): os dele, também em ordem. */
  componentes?: IngredienteRotulo[];
}

function gramasDeUnidade(valor: number, unidade: string): number | null {
  const u = unidade.trim().toLowerCase();
  if (u === "kg" || u === "l") return valor * 1000;
  if (u === "g" || u === "ml") return valor;
  return null;
}

function gramasDaLinha(linha: LinhaFicha, insumo: Insumo | undefined, sub: Receita | undefined): number | null {
  if (insumo) {
    try {
      return pesoBrutoEmGramas(insumo, converterParaUnidadeDoInsumo(linha.pesoLiquido, linha.unidade, { unidadeMedida: insumo.unidadeMedida, pesoPorUnidade: insumo.pesoPorUnidade ?? undefined }));
    } catch {
      return gramasDeUnidade(linha.pesoLiquido, linha.unidade);
    }
  }
  if (sub) {
    const g = gramasDeUnidade(linha.pesoLiquido, linha.unidade);
    if (g !== null) return g;
    return sub.pesoPorcaoG ? linha.pesoLiquido * sub.pesoPorcaoG : null;
  }
  return null;
}

export function ingredientesDaReceita(
  receita: Receita,
  insumoPorId: Map<string, Insumo>,
  receitaPorId: Map<string, Receita>,
  visitado: Set<string> = new Set(),
): IngredienteRotulo[] {
  if (visitado.has(receita.id)) return [];
  const proximo = new Set(visitado).add(receita.id);
  const porNome = new Map<string, IngredienteRotulo>();
  for (const linha of receita.ficha) {
    const insumo = linha.insumoId ? insumoPorId.get(linha.insumoId) : undefined;
    const sub = linha.subReceitaId ? receitaPorId.get(linha.subReceitaId) : undefined;
    if (!insumo && !sub) continue;
    const nome = (insumo?.nome ?? sub!.nomePrato).trim();
    const gramas = gramasDaLinha(linha, insumo, sub);
    const chave = nome.toLowerCase();
    const existente = porNome.get(chave);
    if (existente) {
      existente.gramas = existente.gramas !== null && gramas !== null ? existente.gramas + gramas : existente.gramas ?? gramas;
      continue;
    }
    porNome.set(chave, { nome, gramas, ...(sub ? { componentes: ingredientesDaReceita(sub, insumoPorId, receitaPorId, proximo) } : {}) });
  }
  return [...porNome.values()].sort((a, b) => (b.gramas ?? -1) - (a.gramas ?? -1));
}

/** Nome comum em minúsculas ("Tomate Italiano" → "tomate italiano"). */
function nomeNoRotulo(nome: string): string {
  // Parênteses do nome saem: "Molho branco (bechamel)" viraria "molho branco (bechamel) (leite…)".
  return nome.replace(/[()]/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
}

function formatarItens(itens: IngredienteRotulo[]): string {
  return itens
    .map((i) => (i.componentes && i.componentes.length ? `${nomeNoRotulo(i.nome)} (${formatarItens(i.componentes)})` : nomeNoRotulo(i.nome)))
    .join(", ");
}

/** "INGREDIENTES: farinha de trigo, água, molho de tomate (tomate, cebola), sal." */
export function textoIngredientes(itens: IngredienteRotulo[]): string | null {
  if (itens.length === 0) return null;
  const corpo = formatarItens(itens);
  return `INGREDIENTES: ${corpo.charAt(0).toUpperCase()}${corpo.slice(1)}.`;
}

// ---------------------------------------------------------------------------
// Valores declarados (IN 75/2020, Anexo IV — arredondamento e "zero")

/** Até quanto (por porção) o valor é declarado como zero. */
const ZERO_ATE: Record<CampoNutricional, number> = {
  caloriasKcal: 4,
  carboidratosG: 0.5,
  acucaresTotaisG: 0.5,
  acucaresAdicionadosG: 0.5,
  proteinasG: 0.5,
  gordurasTotaisG: 0.5,
  gordurasSaturadasG: 0.1,
  gordurasTransG: 0.1,
  fibraAlimentarG: 0.5,
  sodioMg: 5,
};

/** Número arredondado pro rótulo: energia e sódio inteiros; gramas com 1 casa abaixo de 10. */
export function valorDeclarado(campo: CampoNutricional, valor: number, zeroPelaPorcao?: number): number {
  const base = zeroPelaPorcao ?? valor;
  if (!Number.isFinite(valor) || base <= ZERO_ATE[campo]) return 0;
  if (campo === "caloriasKcal" || campo === "sodioMg") return Math.round(valor);
  return valor >= 10 ? Math.round(valor) : Math.round(valor * 10) / 10;
}

export function formatarDeclarado(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

export const kcalParaKj = (kcal: number) => Math.round(kcal * 4.184);

/** Linhas da tabela no modelo da IN 75/2020 (Anexo VIII): 100 g | porção | %VD. */
export interface LinhaTabelaVarejo {
  rotulo: string;
  /** 0 = nutriente; 1 = "dos quais" (recuado). */
  nivel: 0 | 1;
  por100: string;
  porPorcao: string;
  vd: string;
}

const LINHAS_IN75: { rotulo: string; campo: CampoNutricional; un: string; nivel: 0 | 1 }[] = [
  { rotulo: "Valor energético (kcal)", campo: "caloriasKcal", un: "", nivel: 0 },
  { rotulo: "Carboidratos (g)", campo: "carboidratosG", un: "", nivel: 0 },
  { rotulo: "Açúcares totais (g)", campo: "acucaresTotaisG", un: "", nivel: 1 },
  { rotulo: "Açúcares adicionados (g)", campo: "acucaresAdicionadosG", un: "", nivel: 1 },
  { rotulo: "Proteínas (g)", campo: "proteinasG", un: "", nivel: 0 },
  { rotulo: "Gorduras totais (g)", campo: "gordurasTotaisG", un: "", nivel: 0 },
  { rotulo: "Gorduras saturadas (g)", campo: "gordurasSaturadasG", un: "", nivel: 1 },
  { rotulo: "Gorduras trans (g)", campo: "gordurasTransG", un: "", nivel: 1 },
  { rotulo: "Fibras alimentares (g)", campo: "fibraAlimentarG", un: "", nivel: 0 },
  { rotulo: "Sódio (mg)", campo: "sodioMg", un: "", nivel: 0 },
];

export function linhasTabelaVarejo(porPorcao: ValoresNutricionais, por100: ValoresNutricionais | null): LinhaTabelaVarejo[] {
  return LINHAS_IN75.map(({ rotulo, campo, nivel }) => {
    const porcao = valorDeclarado(campo, porPorcao[campo]);
    const cem = por100 ? valorDeclarado(campo, por100[campo], porPorcao[campo]) : null;
    const vdr = VDR[campo];
    const energia = campo === "caloriasKcal";
    return {
      rotulo: energia ? "Valor energético (kcal / kJ)" : rotulo,
      nivel,
      por100: cem === null ? "—" : energia ? `${formatarDeclarado(cem)} / ${formatarDeclarado(kcalParaKj(cem))}` : formatarDeclarado(cem),
      porPorcao: energia ? `${formatarDeclarado(porcao)} / ${formatarDeclarado(kcalParaKj(porcao))}` : formatarDeclarado(porcao),
      vd: vdr ? String(Math.round((porcao / vdr) * 100)) : "",
    };
  });
}

// ---------------------------------------------------------------------------
// Peso líquido e porções por embalagem

/** "500 g" → 500; "1,2 kg" → 1200; "900ml" → 900; "1 L" → 1000. null se não entender. */
export function gramasDoPesoLiquido(texto: string | null): number | null {
  if (!texto) return null;
  const m = texto.trim().toLowerCase().replace(",", ".").match(/^(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/);
  if (!m) return null;
  const n = Number(m[1]);
  return m[2] === "kg" || m[2] === "l" ? n * 1000 : n;
}

export function porcoesPorEmbalagem(pesoLiquidoG: number | null, porcaoG: number | null): number | null {
  if (!pesoLiquidoG || !porcaoG) return null;
  const n = pesoLiquidoG / porcaoG;
  return n >= 2 ? Math.round(n) : Math.round(n * 10) / 10;
}

// ---------------------------------------------------------------------------
// Revisão antes da gráfica

export interface DadosRotuloVarejo {
  alergenicos: MapaAlergenicos | null;
  glutenStatus: StatusGluten | null;
  lactoseStatus: StatusLactose | null;
  ingredientes: string | null;
  medidaCaseira: string | null;
  pesoLiquido: string | null;
  conservacao: string | null;
  modoPreparo: string | null;
  fabricante: string | null;
  endereco: string | null;
}

export type NivelPendencia = "bloqueia" | "atencao";
export interface Pendencia {
  id: string;
  nivel: NivelPendencia;
  titulo: string;
  detalhe: string;
}

const vazio = (s: string | null | undefined) => !s || !s.trim();

export function pendenciasRotulo(
  d: DadosRotuloVarejo,
  ctx: { nutricaoCompleta: boolean; temLaudo: boolean; pesoPorcaoG: number | null; ingredientesGerados: string | null },
): Pendencia[] {
  const p: Pendencia[] = [];
  if (!ctx.nutricaoCompleta && !ctx.temLaudo)
    p.push({ id: "nutricao", nivel: "bloqueia", titulo: "Tabela nutricional incompleta", detalhe: "Algum insumo está sem valores nutricionais. Cadastre os valores ou informe o laudo." });
  if (!ctx.pesoPorcaoG) p.push({ id: "porcao", nivel: "bloqueia", titulo: "Peso da porção", detalhe: "Sem o peso da porção não dá pra calcular por porção nem por 100 g. Edite em Receitas e fichas." });
  if (vazio(d.medidaCaseira)) p.push({ id: "medida", nivel: "bloqueia", titulo: "Medida caseira da porção", detalhe: 'Ex.: "1 fatia", "2 colheres de sopa", "1 unidade".' });
  if (gramasDoPesoLiquido(d.pesoLiquido) === null)
    p.push({ id: "peso", nivel: "bloqueia", titulo: "Peso líquido da embalagem", detalhe: 'Em gramas ou mL, ex.: "500 g", "1 kg", "900 mL".' });
  if (vazio(d.ingredientes) && !ctx.ingredientesGerados)
    p.push({ id: "ingredientes", nivel: "bloqueia", titulo: "Lista de ingredientes", detalhe: "A ficha não tem ingredientes pra gerar a lista." });
  if (d.alergenicos === null)
    p.push({ id: "alergenicos", nivel: "bloqueia", titulo: "Alergênicos não revisados", detalhe: 'Marque o que contém, os derivados e o que "pode conter" — ou confirme que não tem nenhum.' });
  if (!d.glutenStatus) p.push({ id: "gluten", nivel: "bloqueia", titulo: "Glúten", detalhe: '"Contém glúten" ou "Não contém glúten" é obrigatório em todo alimento.' });
  else {
    const sugerido = glutenPelosAlergenicos(d.alergenicos);
    if (sugerido === "contem" && d.glutenStatus === "nao_contem")
      p.push({ id: "gluten-conflito", nivel: "bloqueia", titulo: "Glúten não bate com os alergênicos", detalhe: 'Tem trigo, centeio, cevada ou aveia: o rótulo precisa dizer "CONTÉM GLÚTEN".' });
  }
  const temLeite = !!d.alergenicos && (d.alergenicos.leite === "contem" || d.alergenicos.leite === "derivados");
  if (temLeite && (!d.lactoseStatus || d.lactoseStatus === "nao_se_aplica"))
    p.push({ id: "lactose", nivel: "bloqueia", titulo: "Lactose", detalhe: 'Tem leite: informe "Contém lactose", "Zero lactose" ou "Baixo teor de lactose".' });
  if (vazio(d.conservacao)) p.push({ id: "conservacao", nivel: "bloqueia", titulo: "Instruções de conservação", detalhe: 'Ex.: "Manter congelado a -18 °C ou mais frio".' });
  if (vazio(d.fabricante) || vazio(d.endereco))
    p.push({ id: "fabricante", nivel: "bloqueia", titulo: "Identificação do fabricante", detalhe: "Razão social, CNPJ e endereço." });
  if (vazio(d.modoPreparo))
    p.push({ id: "preparo", nivel: "atencao", titulo: "Modo de preparo", detalhe: "Obrigatório quando o produto precisa ser preparado ou aquecido pelo consumidor." });
  if (!ctx.temLaudo)
    p.push({ id: "laudo", nivel: "atencao", titulo: "Valores calculados, sem laudo", detalhe: "A fiscalização tolera 20% de diferença. Com laudo, informe os valores em Editar valores." });
  return p;
}
