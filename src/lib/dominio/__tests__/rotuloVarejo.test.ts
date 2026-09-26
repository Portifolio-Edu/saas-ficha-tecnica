import { describe, expect, it } from "vitest";
import {
  glutenPelosAlergenicos, gramasDoPesoLiquido, ingredientesDaReceita, pendenciasRotulo, porcoesPorEmbalagem,
  textoAlergicos, textoIngredientes, valorDeclarado, type DadosRotuloVarejo,
} from "../rotuloVarejo";
import type { Insumo } from "../insumo";
import type { Receita } from "../receita";

describe("alergênicos (RDC 26/2015)", () => {
  it("texto do briefing", () => {
    expect(textoAlergicos({ trigo: "derivados", soja: "derivados", leite: "pode_conter" })).toBe("ALÉRGICOS: CONTÉM DERIVADOS DE TRIGO E SOJA. PODE CONTER LEITE.");
  });
  it("contém e derivados juntos, 3 itens", () => {
    expect(textoAlergicos({ ovos: "contem", trigo: "derivados", leite: "derivados", soja: "derivados" })).toBe("ALÉRGICOS: CONTÉM OVOS E DERIVADOS DE TRIGO, LEITE E SOJA.");
  });
  it("só pode conter; revisado sem nada; não revisado", () => {
    expect(textoAlergicos({ amendoim: "pode_conter" })).toBe("ALÉRGICOS: PODE CONTER AMENDOIM.");
    expect(textoAlergicos({})).toBeNull();
    expect(textoAlergicos(null)).toBeNull();
  });
  it("glúten sugerido pelos cereais", () => {
    expect(glutenPelosAlergenicos({ trigo: "derivados" })).toBe("contem");
    expect(glutenPelosAlergenicos({ trigo: "pode_conter", leite: "contem" })).toBe("nao_contem");
    expect(glutenPelosAlergenicos(null)).toBeNull();
  });
});

const insumo = (id: string, nome: string, unidadeMedida: Insumo["unidadeMedida"], pesoPorUnidade: number | null = null): Insumo =>
  ({ id, nome, categoria: null, unidadeMedida, tamanhoEmbalagem: 1, precoEmbalagem: 1, precoUnitario: 1, fatorCorrecao: 1, pesoPorUnidade, localArmazenamentoId: null, estoque: null }) as unknown as Insumo;
const receita = (id: string, nome: string, ficha: Receita["ficha"], extra: Partial<Receita> = {}): Receita =>
  ({ id, nomePrato: nome, tipo: "prato_final", categoria: null, precoVenda: null, vendasMes: null, rendimento: 1, unidadeRendimento: "kg", pesoPorcaoG: 100, formaFisica: "solido", destinoVenda: "varejo_terceiro", margemAlvo: null, modoPreparo: null, fotoUrl: null, ficha, etapas: [], ...extra }) as Receita;
const linha = (id: string, x: Partial<Receita["ficha"][number]>) => ({ id, insumoId: null, subReceitaId: null, pesoLiquido: 0, unidade: "g" as const, ...x });

describe("lista de ingredientes (ordem decrescente)", () => {
  const insumos = new Map([
    ["far", insumo("far", "Farinha de trigo", "kg")],
    ["agua", insumo("agua", "Água", "l")],
    ["sal", insumo("sal", "Sal", "kg")],
    ["tom", insumo("tom", "Tomate", "kg")],
    ["ovo", insumo("ovo", "Ovo", "un", 0.05)],
  ]);
  const molho = receita("molho", "Molho (de tomate)", [linha("m1", { insumoId: "tom", pesoLiquido: 1, unidade: "kg" }), linha("m2", { insumoId: "sal", pesoLiquido: 10, unidade: "g" })], { tipo: "preparo_base" });
  const massa = receita("massa", "Lasanha", [
    linha("1", { insumoId: "sal", pesoLiquido: 15, unidade: "g" }),
    linha("2", { insumoId: "far", pesoLiquido: 0.5, unidade: "kg" }),
    linha("3", { insumoId: "agua", pesoLiquido: 300, unidade: "ml" }),
    linha("4", { subReceitaId: "molho", pesoLiquido: 0.4, unidade: "kg" }),
    linha("5", { insumoId: "ovo", pesoLiquido: 2, unidade: "un" }),
  ]);
  const receitas = new Map([["molho", molho], ["massa", massa]]);

  it("ordena por peso, com o composto e os dele entre parênteses", () => {
    const itens = ingredientesDaReceita(massa, insumos, receitas);
    expect(itens.map((i) => [i.nome, i.gramas])).toEqual([["Farinha de trigo", 500], ["Molho (de tomate)", 400], ["Água", 300], ["Ovo", 100], ["Sal", 15]]);
    expect(textoIngredientes(itens)).toBe("INGREDIENTES: Farinha de trigo, molho de tomate (tomate, sal), água, ovo, sal.");
  });
  it("sem ficha: sem lista", () => {
    expect(textoIngredientes(ingredientesDaReceita(receita("x", "X", []), insumos, receitas))).toBeNull();
  });
});

describe("valores declarados (IN 75, Anexo IV)", () => {
  it("zeros, inteiros e 1 casa", () => {
    expect(valorDeclarado("caloriasKcal", 3.6)).toBe(0);
    expect(valorDeclarado("caloriasKcal", 243.4)).toBe(243);
    expect(valorDeclarado("gordurasTransG", 0.08)).toBe(0);
    expect(valorDeclarado("proteinasG", 4.36)).toBe(4.4);
    expect(valorDeclarado("carboidratosG", 31.6)).toBe(32);
    expect(valorDeclarado("sodioMg", 4)).toBe(0);
    expect(valorDeclarado("sodioMg", 412.6)).toBe(413);
  });
  it("por 100 g segue o zero da porção", () => {
    expect(valorDeclarado("gordurasTransG", 0.3, 0.05)).toBe(0);
  });
});

describe("peso e porções", () => {
  it("entende o peso líquido", () => {
    expect(gramasDoPesoLiquido("500 g")).toBe(500);
    expect(gramasDoPesoLiquido("1,2 kg")).toBe(1200);
    expect(gramasDoPesoLiquido("900mL")).toBe(900);
    expect(gramasDoPesoLiquido("uma bandeja")).toBeNull();
    expect(porcoesPorEmbalagem(500, 80)).toBe(6);
    expect(porcoesPorEmbalagem(120, 80)).toBe(1.5);
  });
});

describe("revisão antes da gráfica", () => {
  const completo: DadosRotuloVarejo = {
    alergenicos: { trigo: "derivados", leite: "contem" }, glutenStatus: "contem", lactoseStatus: "contem",
    ingredientes: null, medidaCaseira: "1 fatia", pesoLiquido: "500 g", conservacao: "Manter congelado a -18 °C.",
    modoPreparo: "Aquecer 20 min a 200 °C.", fabricante: "Cantina Ltda. CNPJ 00.000.000/0001-00", endereco: "Rua A, 1",
  };
  const ctx = { nutricaoCompleta: true, temLaudo: true, pesoPorcaoG: 100, ingredientesGerados: "INGREDIENTES: x." };

  it("tudo certo: nada bloqueia", () => {
    expect(pendenciasRotulo(completo, ctx).filter((p) => p.nivel === "bloqueia")).toEqual([]);
  });
  it("aponta o que falta e as contradições", () => {
    const ids = pendenciasRotulo({ ...completo, alergenicos: null, glutenStatus: null, medidaCaseira: " ", pesoLiquido: "bandeja", conservacao: null }, { ...ctx, temLaudo: false, nutricaoCompleta: false }).map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(["nutricao", "medida", "peso", "alergenicos", "gluten", "conservacao", "laudo"]));
    expect(pendenciasRotulo({ ...completo, glutenStatus: "nao_contem" }, ctx).map((p) => p.id)).toContain("gluten-conflito");
    expect(pendenciasRotulo({ ...completo, lactoseStatus: "nao_se_aplica" }, ctx).map((p) => p.id)).toContain("lactose");
  });
});

describe("tabela no modelo da IN 75", () => {
  it("100 g, porção e %VD, com kJ e açúcares totais sem %VD", async () => {
    const { linhasTabelaVarejo } = await import("../rotuloVarejo");
    const porcao = { caloriasKcal: 480.4, carboidratosG: 40.2, acucaresTotaisG: 6.3, acucaresAdicionadosG: 0.2, proteinasG: 25.5, gordurasTotaisG: 22.1, gordurasSaturadasG: 10.4, gordurasTransG: 0.05, fibraAlimentarG: 2.4, sodioMg: 880 };
    const cem = Object.fromEntries(Object.entries(porcao).map(([k, v]) => [k, v / 4])) as typeof porcao;
    const l = linhasTabelaVarejo(porcao, cem);
    expect(l[0]).toEqual({ rotulo: "Valor energético (kcal / kJ)", nivel: 0, por100: "120 / 502", porPorcao: "480 / 2.008", vd: "24" });
    expect(l[2]).toMatchObject({ rotulo: "Açúcares totais (g)", nivel: 1, vd: "" });
    expect(l[3]).toMatchObject({ porPorcao: "0", por100: "0" });
    expect(l[7]).toMatchObject({ rotulo: "Gorduras trans (g)", porPorcao: "0", por100: "0" });
    expect(l[9]).toMatchObject({ rotulo: "Sódio (mg)", porPorcao: "880", por100: "220", vd: "44" });
  });
});
