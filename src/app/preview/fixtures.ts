// Dados fictícios para o modo demo (/preview). Restaurante inventado:
// "Cantina Bella Notte", uma pizzeria/cantina italiana. Todos os IDs,
// referências cruzadas (receita -> insumo/sub-receita, produção -> receita,
// processamento -> insumo proteico, fechamento -> receita) são consistentes
// entre si para que os cálculos derivados (CMV, margem, capacidade, alertas)
// produzam resultados coerentes e não degenerados.
//
// Este arquivo é puramente de dados (sem "use client") e é consumido pelas
// páginas server component em src/app/preview/<dominio>/page.tsx, que
// passam essas listas como props para os *Client.tsx reais de produção.

import type { Categoria, Insumo } from "@/lib/dominio/insumo";
import type { LinhaFicha, Receita } from "@/lib/dominio/receita";
import type { Processamento } from "@/lib/dominio/processamento";
import type { Producao, Turno } from "@/lib/dominio/producao";
import type { Checklist, ChecklistItem } from "@/lib/dominio/checklist";
import type { EstoqueLinha, Movimentacao } from "@/lib/dominio/estoque";
import type { Fornecedor } from "@/lib/dominio/fornecedor";
import type { NutricionalOverride, Rotulagem, ValoresNutricionaisInsumo } from "@/lib/dominio/nutricional";
import type { LocalArmazenamento, RegistroTemperatura } from "@/lib/dominio/temperatura";
import type { FechamentoCmv } from "@/lib/dominio/fechamentoCmv";
import type { ValoresNutricionais } from "@/lib/calculo/nutricional";

export const NOME_RESTAURANTE = "Cantina Bella Notte";

// =========================================================================
// Insumos — cobre todas as categorias do domínio.
// =========================================================================

export const insumos: Insumo[] = [
  { id: "i-frango", nome: "Peito de Frango", categoria: "proteina" as Categoria, unidadeMedida: "kg", tamanhoEmbalagem: 5, precoEmbalagem: 89.5, precoUnitario: 17.9, fatorCorrecao: 1.12, pesoPorUnidade: null, localArmazenamentoId: "local-camara-carnes", estoque: { saldoAtual: 18, estoqueMinimo: 10 } },
  { id: "i-patinho", nome: "Carne Bovina Patinho", categoria: "proteina", unidadeMedida: "kg", tamanhoEmbalagem: 10, precoEmbalagem: 349, precoUnitario: 34.9, fatorCorrecao: 1.18, pesoPorUnidade: null, localArmazenamentoId: "local-camara-carnes", estoque: { saldoAtual: 22, estoqueMinimo: 15 } },
  { id: "i-calabresa", nome: "Linguiça Calabresa", categoria: "proteina", unidadeMedida: "kg", tamanhoEmbalagem: 5, precoEmbalagem: 74.5, precoUnitario: 14.9, fatorCorrecao: 1.05, pesoPorUnidade: null, localArmazenamentoId: "local-camara-carnes", estoque: { saldoAtual: 9, estoqueMinimo: 12 } },
  { id: "i-camarao", nome: "Camarão Médio Limpo", categoria: "proteina", unidadeMedida: "kg", tamanhoEmbalagem: 2, precoEmbalagem: 159.8, precoUnitario: 79.9, fatorCorrecao: 1.08, pesoPorUnidade: null, localArmazenamentoId: "local-camara-carnes", estoque: { saldoAtual: 4, estoqueMinimo: 5 } },
  { id: "i-mussarela", nome: "Mussarela", categoria: "laticinio", unidadeMedida: "kg", tamanhoEmbalagem: 5, precoEmbalagem: 149.5, precoUnitario: 29.9, fatorCorrecao: 1.0, pesoPorUnidade: null, localArmazenamentoId: "local-geladeira-laticinios", estoque: { saldoAtual: 30, estoqueMinimo: 15 } },
  { id: "i-parmesao", nome: "Parmesão Ralado", categoria: "laticinio", unidadeMedida: "kg", tamanhoEmbalagem: 1, precoEmbalagem: 68.9, precoUnitario: 68.9, fatorCorrecao: 1.0, pesoPorUnidade: null, localArmazenamentoId: "local-geladeira-laticinios", estoque: { saldoAtual: 6, estoqueMinimo: 4 } },
  { id: "i-manteiga", nome: "Manteiga sem Sal", categoria: "laticinio", unidadeMedida: "kg", tamanhoEmbalagem: 5, precoEmbalagem: 94.5, precoUnitario: 18.9, fatorCorrecao: 1.0, pesoPorUnidade: null, localArmazenamentoId: "local-geladeira-laticinios", estoque: { saldoAtual: 8, estoqueMinimo: 5 } },
  { id: "i-leite", nome: "Leite Integral", categoria: "laticinio", unidadeMedida: "l", tamanhoEmbalagem: 12, precoEmbalagem: 71.88, precoUnitario: 5.99, fatorCorrecao: 1.0, pesoPorUnidade: null, localArmazenamentoId: "local-geladeira-laticinios", estoque: { saldoAtual: 24, estoqueMinimo: 12 } },
  { id: "i-tomate", nome: "Tomate Italiano", categoria: "hortalica", unidadeMedida: "kg", tamanhoEmbalagem: 20, precoEmbalagem: 139.8, precoUnitario: 6.99, fatorCorrecao: 1.15, pesoPorUnidade: null, localArmazenamentoId: "local-geladeira-hortifruti", estoque: { saldoAtual: 40, estoqueMinimo: 20 } },
  { id: "i-cebola", nome: "Cebola Branca", categoria: "hortalica", unidadeMedida: "kg", tamanhoEmbalagem: 20, precoEmbalagem: 79.8, precoUnitario: 3.99, fatorCorrecao: 1.1, pesoPorUnidade: null, localArmazenamentoId: "local-geladeira-hortifruti", estoque: { saldoAtual: 25, estoqueMinimo: 15 } },
  { id: "i-alho", nome: "Alho Descascado", categoria: "tempero", unidadeMedida: "kg", tamanhoEmbalagem: 1, precoEmbalagem: 32.9, precoUnitario: 32.9, fatorCorrecao: 1.0, pesoPorUnidade: null, localArmazenamentoId: "local-estoque-seco", estoque: { saldoAtual: 3, estoqueMinimo: 2 } },
  { id: "i-manjericao", nome: "Manjericão Fresco", categoria: "tempero", unidadeMedida: "kg", tamanhoEmbalagem: 0.5, precoEmbalagem: 24.9, precoUnitario: 49.8, fatorCorrecao: 1.0, pesoPorUnidade: null, localArmazenamentoId: "local-geladeira-hortifruti", estoque: { saldoAtual: 1.2, estoqueMinimo: 1 } },
  { id: "i-sal", nome: "Sal Refinado", categoria: "tempero", unidadeMedida: "kg", tamanhoEmbalagem: 25, precoEmbalagem: 37.5, precoUnitario: 1.5, fatorCorrecao: 1.0, pesoPorUnidade: null, localArmazenamentoId: "local-estoque-seco", estoque: { saldoAtual: 50, estoqueMinimo: 10 } },
  { id: "i-azeite", nome: "Azeite de Oliva Extra Virgem", categoria: "outro", unidadeMedida: "l", tamanhoEmbalagem: 5, precoEmbalagem: 189.5, precoUnitario: 37.9, fatorCorrecao: 1.0, pesoPorUnidade: null, localArmazenamentoId: "local-estoque-seco", estoque: { saldoAtual: 14, estoqueMinimo: 6 } },
  { id: "i-farinha", nome: "Farinha de Trigo Tipo 1", categoria: "outro", unidadeMedida: "kg", tamanhoEmbalagem: 25, precoEmbalagem: 112.5, precoUnitario: 4.5, fatorCorrecao: 1.0, pesoPorUnidade: null, localArmazenamentoId: "local-estoque-seco", estoque: { saldoAtual: 60, estoqueMinimo: 25 } },
  { id: "i-fermento", nome: "Fermento Biológico Seco", categoria: "outro", unidadeMedida: "kg", tamanhoEmbalagem: 0.5, precoEmbalagem: 22.9, precoUnitario: 45.8, fatorCorrecao: 1.0, pesoPorUnidade: null, localArmazenamentoId: "local-estoque-seco", estoque: { saldoAtual: 2.5, estoqueMinimo: 1 } },
  { id: "i-limao", nome: "Limão Siciliano", categoria: "fruta", unidadeMedida: "kg", tamanhoEmbalagem: 10, precoEmbalagem: 69.9, precoUnitario: 6.99, fatorCorrecao: 1.2, pesoPorUnidade: null, localArmazenamentoId: "local-geladeira-hortifruti", estoque: { saldoAtual: 8, estoqueMinimo: 4 } },
  { id: "i-caixa-pizza", nome: "Caixa de Pizza 35cm", categoria: "embalagem", unidadeMedida: "un", tamanhoEmbalagem: 100, precoEmbalagem: 145, precoUnitario: 1.45, fatorCorrecao: 1.0, pesoPorUnidade: 0.08, localArmazenamentoId: "local-estoque-seco", estoque: { saldoAtual: 320, estoqueMinimo: 150 } },
  { id: "i-marmita", nome: "Embalagem Marmita 500ml", categoria: "embalagem", unidadeMedida: "un", tamanhoEmbalagem: 100, precoEmbalagem: 89, precoUnitario: 0.89, fatorCorrecao: 1.0, pesoPorUnidade: 0.03, localArmazenamentoId: "local-estoque-seco", estoque: { saldoAtual: 180, estoqueMinimo: 100 } },
];

function linha(id: string, parcial: Partial<LinhaFicha> & { pesoLiquido: number; unidade: LinhaFicha["unidade"] }): LinhaFicha {
  return { id, insumoId: null, subReceitaId: null, ...parcial };
}

// =========================================================================
// Receitas — 3 preparos (sub-receitas) + 6 pratos finais que as referenciam.
// =========================================================================

export const receitasPreparos: Receita[] = [
  {
    id: "pr-massa-pizza",
    nomePrato: "Massa de Pizza",
    tipo: "preparo_base",
    categoria: "Massas",
    precoVenda: null,
    vendasMes: null,
    rendimento: 10,
    unidadeRendimento: "discos",
    pesoPorcaoG: 220,
    formaFisica: "solido",
    destinoVenda: "proprio",
    margemAlvo: null,
    modoPreparo: "Misturar farinha, fermento, azeite e sal; sovar, deixar crescer 2h e dividir em 10 discos de 220g.",
    ficha: [
      linha("pr-massa-l1", { insumoId: "i-farinha", pesoLiquido: 2.2, unidade: "kg" }),
      linha("pr-massa-l2", { insumoId: "i-fermento", pesoLiquido: 0.05, unidade: "kg" }),
      linha("pr-massa-l3", { insumoId: "i-azeite", pesoLiquido: 0.15, unidade: "l" }),
      linha("pr-massa-l4", { insumoId: "i-sal", pesoLiquido: 0.04, unidade: "kg" }),
    ],
  },
  {
    id: "pr-molho-tomate",
    nomePrato: "Molho de Tomate Caseiro",
    tipo: "preparo_base",
    categoria: "Molhos",
    precoVenda: null,
    vendasMes: null,
    rendimento: 4,
    unidadeRendimento: "litros",
    pesoPorcaoG: 1000,
    formaFisica: "liquido",
    destinoVenda: "proprio",
    margemAlvo: null,
    modoPreparo: "Refogar cebola e alho no azeite, adicionar tomate, sal e manjericão; cozinhar em fogo baixo por 40min.",
    ficha: [
      linha("pr-molho-l1", { insumoId: "i-tomate", pesoLiquido: 5, unidade: "kg" }),
      linha("pr-molho-l2", { insumoId: "i-cebola", pesoLiquido: 0.6, unidade: "kg" }),
      linha("pr-molho-l3", { insumoId: "i-alho", pesoLiquido: 0.1, unidade: "kg" }),
      linha("pr-molho-l4", { insumoId: "i-azeite", pesoLiquido: 0.2, unidade: "l" }),
      linha("pr-molho-l5", { insumoId: "i-sal", pesoLiquido: 0.05, unidade: "kg" }),
      linha("pr-molho-l6", { insumoId: "i-manjericao", pesoLiquido: 0.03, unidade: "kg" }),
    ],
  },
  {
    id: "pr-molho-branco",
    nomePrato: "Molho Branco (Bechamel)",
    tipo: "preparo_base",
    categoria: "Molhos",
    precoVenda: null,
    vendasMes: null,
    rendimento: 2,
    unidadeRendimento: "litros",
    pesoPorcaoG: 1000,
    formaFisica: "liquido",
    destinoVenda: "proprio",
    margemAlvo: null,
    modoPreparo: "Derreter manteiga, adicionar farinha formando roux, incorporar leite aos poucos e temperar com sal.",
    ficha: [
      linha("pr-branco-l1", { insumoId: "i-manteiga", pesoLiquido: 0.2, unidade: "kg" }),
      linha("pr-branco-l2", { insumoId: "i-farinha", pesoLiquido: 0.2, unidade: "kg" }),
      linha("pr-branco-l3", { insumoId: "i-leite", pesoLiquido: 2, unidade: "l" }),
      linha("pr-branco-l4", { insumoId: "i-sal", pesoLiquido: 0.02, unidade: "kg" }),
    ],
  },
];

export const receitasPratos: Receita[] = [
  {
    id: "pt-margherita",
    nomePrato: "Pizza Margherita",
    tipo: "prato_final",
    categoria: "Pizzas",
    precoVenda: 52.9,
    vendasMes: 310,
    rendimento: 1,
    unidadeRendimento: "pizza",
    pesoPorcaoG: 400,
    formaFisica: "solido",
    destinoVenda: "proprio",
    margemAlvo: 0.68,
    modoPreparo: "Abrir o disco de massa, cobrir com molho de tomate, mussarela e manjericão fresco; assar a 380°C por 3min.",
    ficha: [
      linha("pt-marg-l1", { subReceitaId: "pr-massa-pizza", pesoLiquido: 1, unidade: "un" }),
      linha("pt-marg-l2", { subReceitaId: "pr-molho-tomate", pesoLiquido: 0.15, unidade: "l" }),
      linha("pt-marg-l3", { insumoId: "i-mussarela", pesoLiquido: 0.15, unidade: "kg" }),
      linha("pt-marg-l4", { insumoId: "i-manjericao", pesoLiquido: 0.01, unidade: "kg" }),
      linha("pt-marg-l5", { insumoId: "i-azeite", pesoLiquido: 0.02, unidade: "l" }),
    ],
  },
  {
    id: "pt-calabresa",
    nomePrato: "Pizza Calabresa",
    tipo: "prato_final",
    categoria: "Pizzas",
    precoVenda: 54.9,
    vendasMes: 260,
    rendimento: 1,
    unidadeRendimento: "pizza",
    pesoPorcaoG: 420,
    formaFisica: "solido",
    destinoVenda: "proprio",
    margemAlvo: 0.65,
    modoPreparo: "Abrir o disco de massa, cobrir com molho de tomate, mussarela, calabresa fatiada e cebola; assar a 380°C por 3min.",
    ficha: [
      linha("pt-cal-l1", { subReceitaId: "pr-massa-pizza", pesoLiquido: 1, unidade: "un" }),
      linha("pt-cal-l2", { subReceitaId: "pr-molho-tomate", pesoLiquido: 0.15, unidade: "l" }),
      linha("pt-cal-l3", { insumoId: "i-mussarela", pesoLiquido: 0.15, unidade: "kg" }),
      linha("pt-cal-l4", { insumoId: "i-calabresa", pesoLiquido: 0.12, unidade: "kg" }),
      linha("pt-cal-l5", { insumoId: "i-cebola", pesoLiquido: 0.05, unidade: "kg" }),
    ],
  },
  {
    id: "pt-parmegiana",
    nomePrato: "Frango à Parmegiana",
    tipo: "prato_final",
    categoria: "Pratos Quentes",
    precoVenda: 48.9,
    vendasMes: 190,
    rendimento: 1,
    unidadeRendimento: "porção",
    pesoPorcaoG: 380,
    formaFisica: "solido",
    destinoVenda: "proprio",
    margemAlvo: 0.65,
    modoPreparo: "Empanar o filé de frango na farinha, fritar, cobrir com molho de tomate, mussarela e parmesão; gratinar.",
    ficha: [
      linha("pt-parm-l1", { insumoId: "i-frango", pesoLiquido: 0.2, unidade: "kg" }),
      linha("pt-parm-l2", { subReceitaId: "pr-molho-tomate", pesoLiquido: 0.12, unidade: "l" }),
      linha("pt-parm-l3", { insumoId: "i-mussarela", pesoLiquido: 0.08, unidade: "kg" }),
      linha("pt-parm-l4", { insumoId: "i-parmesao", pesoLiquido: 0.02, unidade: "kg" }),
      linha("pt-parm-l5", { insumoId: "i-farinha", pesoLiquido: 0.03, unidade: "kg" }),
      linha("pt-parm-l6", { insumoId: "i-azeite", pesoLiquido: 0.02, unidade: "l" }),
    ],
  },
  {
    id: "pt-risoto-camarao",
    nomePrato: "Risoto de Camarão",
    tipo: "prato_final",
    categoria: "Pratos Quentes",
    precoVenda: 68.9,
    vendasMes: 95,
    rendimento: 1,
    unidadeRendimento: "porção",
    pesoPorcaoG: 350,
    formaFisica: "solido",
    destinoVenda: "proprio",
    // Margem alvo agressiva vs. insumo caro (camarão): gera CMV acima do alvo
    // de propósito, para exercitar o estado de alerta nas telas de CMV/relatórios.
    margemAlvo: 0.72,
    modoPreparo: "Refogar camarão com alho e manteiga, finalizar o arroz com azeite, cebola e parmesão.",
    ficha: [
      linha("pt-risoto-l1", { insumoId: "i-camarao", pesoLiquido: 0.18, unidade: "kg" }),
      linha("pt-risoto-l2", { insumoId: "i-azeite", pesoLiquido: 0.02, unidade: "l" }),
      linha("pt-risoto-l3", { insumoId: "i-alho", pesoLiquido: 0.01, unidade: "kg" }),
      linha("pt-risoto-l4", { insumoId: "i-parmesao", pesoLiquido: 0.03, unidade: "kg" }),
      linha("pt-risoto-l5", { insumoId: "i-manteiga", pesoLiquido: 0.02, unidade: "kg" }),
      linha("pt-risoto-l6", { insumoId: "i-cebola", pesoLiquido: 0.03, unidade: "kg" }),
    ],
  },
  {
    id: "pt-lasanha",
    nomePrato: "Lasanha Bolonhesa",
    tipo: "prato_final",
    categoria: "Massas",
    precoVenda: 46.9,
    vendasMes: 150,
    rendimento: 1,
    unidadeRendimento: "porção",
    pesoPorcaoG: 400,
    formaFisica: "solido",
    destinoVenda: "proprio",
    margemAlvo: 0.65,
    modoPreparo: "Montar camadas de carne refogada, molho de tomate, molho branco e mussarela; gratinar no forno.",
    ficha: [
      linha("pt-las-l1", { insumoId: "i-patinho", pesoLiquido: 0.15, unidade: "kg" }),
      linha("pt-las-l2", { subReceitaId: "pr-molho-tomate", pesoLiquido: 0.2, unidade: "l" }),
      linha("pt-las-l3", { subReceitaId: "pr-molho-branco", pesoLiquido: 0.15, unidade: "l" }),
      linha("pt-las-l4", { insumoId: "i-mussarela", pesoLiquido: 0.1, unidade: "kg" }),
      linha("pt-las-l5", { insumoId: "i-parmesao", pesoLiquido: 0.02, unidade: "kg" }),
    ],
  },
  {
    id: "pt-caprese",
    nomePrato: "Salada Caprese",
    tipo: "prato_final",
    categoria: "Entradas",
    precoVenda: 32.9,
    vendasMes: 120,
    rendimento: 1,
    unidadeRendimento: "porção",
    pesoPorcaoG: 260,
    formaFisica: "solido",
    destinoVenda: "proprio",
    margemAlvo: 0.7,
    modoPreparo: "Fatiar tomate e mussarela, intercalar, finalizar com manjericão, azeite e flor de sal.",
    ficha: [
      linha("pt-cap-l1", { insumoId: "i-tomate", pesoLiquido: 0.18, unidade: "kg" }),
      linha("pt-cap-l2", { insumoId: "i-mussarela", pesoLiquido: 0.12, unidade: "kg" }),
      linha("pt-cap-l3", { insumoId: "i-manjericao", pesoLiquido: 0.01, unidade: "kg" }),
      linha("pt-cap-l4", { insumoId: "i-azeite", pesoLiquido: 0.015, unidade: "l" }),
      linha("pt-cap-l5", { insumoId: "i-sal", pesoLiquido: 0.005, unidade: "kg" }),
    ],
  },
];

export const todasReceitas: Receita[] = [...receitasPreparos, ...receitasPratos];
// Aliases usados pelos props de cada tela (nomes variam por domínio real).
export const preparos = receitasPreparos;
export const pratos = receitasPratos;
export const receitas = receitasPratos;

// =========================================================================
// Processamentos — sempre de insumos proteicos, usados por Insumos, Cmv,
// Producoes, Proteinas e Relatorios.
// =========================================================================

export const processamentos: Processamento[] = [
  { id: "proc-1", insumoId: "i-frango", responsavel: "Marcos Silva", pesoBrutoRecebido: 5, valorPagoKg: 17.9, pesoLiquidoResultante: 4.3, pesoAparasReaproveitaveis: 0.4, pesoDescartePuro: 0.3, fcObservado: 1.16, fornecedor: "Avícola Bom Frango", observacao: null, processadoEm: "2026-09-10T09:15:00.000Z" },
  { id: "proc-2", insumoId: "i-patinho", responsavel: "Marcos Silva", pesoBrutoRecebido: 10, valorPagoKg: 34.9, pesoLiquidoResultante: 8.2, pesoAparasReaproveitaveis: 1.0, pesoDescartePuro: 0.8, fcObservado: 1.22, fornecedor: "Frigorífico Santa Fé", observacao: null, processadoEm: "2026-09-11T09:00:00.000Z" },
  { id: "proc-3", insumoId: "i-calabresa", responsavel: "Juliana Costa", pesoBrutoRecebido: 5, valorPagoKg: 14.9, pesoLiquidoResultante: 4.7, pesoAparasReaproveitaveis: 0.2, pesoDescartePuro: 0.1, fcObservado: 1.06, fornecedor: "Frigorífico Santa Fé", observacao: null, processadoEm: "2026-09-12T10:30:00.000Z" },
  { id: "proc-4", insumoId: "i-camarao", responsavel: "Juliana Costa", pesoBrutoRecebido: 2, valorPagoKg: 79.9, pesoLiquidoResultante: 1.75, pesoAparasReaproveitaveis: 0.1, pesoDescartePuro: 0.15, fcObservado: 1.14, fornecedor: "Peixaria do Porto", observacao: null, processadoEm: "2026-09-13T08:45:00.000Z" },
  // Lote com FC acima do padrão da casa — caso de alerta em Proteínas/Relatórios.
  { id: "proc-5", insumoId: "i-frango", responsavel: "Pedro Alves", pesoBrutoRecebido: 5, valorPagoKg: 18.2, pesoLiquidoResultante: 4.1, pesoAparasReaproveitaveis: 0.5, pesoDescartePuro: 0.4, fcObservado: 1.22, fornecedor: "Avícola Bom Frango", observacao: "Lote com mais gordura que o normal — FC acima da média.", processadoEm: "2026-09-15T09:05:00.000Z" },
  { id: "proc-6", insumoId: "i-patinho", responsavel: "Marcos Silva", pesoBrutoRecebido: 10, valorPagoKg: 35.5, pesoLiquidoResultante: 8.5, pesoAparasReaproveitaveis: 0.9, pesoDescartePuro: 0.6, fcObservado: 1.18, fornecedor: "Frigorífico Santa Fé", observacao: null, processadoEm: "2026-09-16T09:20:00.000Z" },
];

export const proteinas: Insumo[] = insumos.filter((i) => i.categoria === "proteina");

// =========================================================================
// Turnos + Produções + Checklists.
// =========================================================================

export const turnos: Turno[] = [
  { id: "turno-manha", nome: "Preparo Manhã", horario: "07:00-11:00" },
  { id: "turno-almoco", nome: "Almoço", horario: "11:00-15:00" },
  { id: "turno-jantar", nome: "Jantar", horario: "18:00-23:00" },
];

export const producoes: Producao[] = [
  { id: "prod-1", lote: "MP-0912-1", tipo: "preparo", receitaId: "pr-massa-pizza", nomeReceita: "Massa de Pizza", unidadeRendimento: "discos", quantidade: 40, responsavel: "Ana Souza", turnoId: "turno-manha", nomeTurno: "Preparo Manhã", chefeTurno: "Ana Souza", validade: "2026-09-13", status: "produzido", motivoPerda: null, criadoEm: "2026-09-12T08:00:00.000Z" },
  { id: "prod-2", lote: "MT-0912-1", tipo: "preparo", receitaId: "pr-molho-tomate", nomeReceita: "Molho de Tomate Caseiro", unidadeRendimento: "litros", quantidade: 12, responsavel: "Ana Souza", turnoId: "turno-manha", nomeTurno: "Preparo Manhã", chefeTurno: "Ana Souza", validade: "2026-09-15", status: "produzido", motivoPerda: null, criadoEm: "2026-09-12T08:30:00.000Z" },
  { id: "prod-3", lote: "MB-0913-1", tipo: "preparo", receitaId: "pr-molho-branco", nomeReceita: "Molho Branco (Bechamel)", unidadeRendimento: "litros", quantidade: 4, responsavel: "Pedro Alves", turnoId: "turno-manha", nomeTurno: "Preparo Manhã", chefeTurno: "Ana Souza", validade: "2026-09-14", status: "produzido", motivoPerda: null, criadoEm: "2026-09-13T08:10:00.000Z" },
  { id: "prod-4", lote: "PM-0913-1", tipo: "prato", receitaId: "pt-margherita", nomeReceita: "Pizza Margherita", unidadeRendimento: "pizza", quantidade: 25, responsavel: "Marcos Silva", turnoId: "turno-jantar", nomeTurno: "Jantar", chefeTurno: "Marcos Silva", validade: "2026-09-13", status: "produzido", motivoPerda: null, criadoEm: "2026-09-13T18:00:00.000Z" },
  { id: "prod-5", lote: "PC-0913-1", tipo: "prato", receitaId: "pt-calabresa", nomeReceita: "Pizza Calabresa", unidadeRendimento: "pizza", quantidade: 20, responsavel: "Marcos Silva", turnoId: "turno-jantar", nomeTurno: "Jantar", chefeTurno: "Marcos Silva", validade: "2026-09-13", status: "produzido", motivoPerda: null, criadoEm: "2026-09-13T18:10:00.000Z" },
  { id: "prod-6", lote: "FP-0914-1", tipo: "prato", receitaId: "pt-parmegiana", nomeReceita: "Frango à Parmegiana", unidadeRendimento: "porção", quantidade: 15, responsavel: "Juliana Costa", turnoId: "turno-almoco", nomeTurno: "Almoço", chefeTurno: "Juliana Costa", validade: "2026-09-14", status: "em_producao", motivoPerda: null, criadoEm: "2026-09-14T11:30:00.000Z" },
  // Lote perdido — caso de alerta em Produções/Relatórios.
  { id: "prod-7", lote: "RC-0914-1", tipo: "prato", receitaId: "pt-risoto-camarao", nomeReceita: "Risoto de Camarão", unidadeRendimento: "porção", quantidade: 10, responsavel: "Juliana Costa", turnoId: "turno-jantar", nomeTurno: "Jantar", chefeTurno: "Marcos Silva", validade: "2026-09-14", status: "perda", motivoPerda: "Camarão com odor alterado — lote descartado integralmente.", criadoEm: "2026-09-14T18:20:00.000Z" },
  { id: "prod-8", lote: "LB-0915-1", tipo: "prato", receitaId: "pt-lasanha", nomeReceita: "Lasanha Bolonhesa", unidadeRendimento: "porção", quantidade: 18, responsavel: "Pedro Alves", turnoId: "turno-almoco", nomeTurno: "Almoço", chefeTurno: "Juliana Costa", validade: "2026-09-16", status: "produzido", motivoPerda: null, criadoEm: "2026-09-15T11:00:00.000Z" },
];

function itemChecklist(id: string, checklistId: string, texto: string, ordem: number, concluidoHoje: boolean): ChecklistItem {
  return { id, checklistId, texto, ordem, concluidoHoje };
}

export const checklists: Checklist[] = [
  {
    id: "cl-abertura",
    nome: "Checklist de Abertura",
    momento: "abertura",
    itens: [
      itemChecklist("cl-abertura-1", "cl-abertura", "Conferir temperatura das câmaras frias", 1, true),
      itemChecklist("cl-abertura-2", "cl-abertura", "Ligar equipamentos de cocção", 2, true),
      itemChecklist("cl-abertura-3", "cl-abertura", "Verificar validade dos insumos abertos no dia anterior", 3, true),
      itemChecklist("cl-abertura-4", "cl-abertura", "Higienizar bancadas e utensílios", 4, false),
      itemChecklist("cl-abertura-5", "cl-abertura", "Conferir estoque mínimo de embalagens", 5, false),
    ],
  },
  {
    id: "cl-praca",
    nome: "Checklist de Praça",
    momento: "praca",
    itens: [
      itemChecklist("cl-praca-1", "cl-praca", "Reposição de mise en place de molhos", 1, true),
      itemChecklist("cl-praca-2", "cl-praca", "Conferir massas pré-abertas para o turno", 2, true),
      itemChecklist("cl-praca-3", "cl-praca", "Verificar temperatura da chapa/forno", 3, true),
      itemChecklist("cl-praca-4", "cl-praca", "Organizar geladeira de proteínas porcionadas", 4, false),
    ],
  },
  {
    id: "cl-processo",
    nome: "Checklist de Processo — Manipulação de Proteínas",
    momento: "processo",
    itens: [
      itemChecklist("cl-processo-1", "cl-processo", "Registrar peso bruto e líquido de todo processamento", 1, true),
      itemChecklist("cl-processo-2", "cl-processo", "Etiquetar e datar aparas reaproveitáveis", 2, true),
      itemChecklist("cl-processo-3", "cl-processo", "Descartar corretamente resíduos não reaproveitáveis", 3, true),
      itemChecklist("cl-processo-4", "cl-processo", "Higienizar facas e tábuas entre proteínas diferentes", 4, true),
    ],
  },
  {
    id: "cl-fechamento",
    nome: "Checklist de Fechamento",
    momento: "fechamento",
    itens: [
      itemChecklist("cl-fechamento-1", "cl-fechamento", "Registrar temperatura final das câmaras", 1, true),
      itemChecklist("cl-fechamento-2", "cl-fechamento", "Guardar preparos abertos identificados e datados", 2, true),
      itemChecklist("cl-fechamento-3", "cl-fechamento", "Conferir fechamento de caixa", 3, true),
      itemChecklist("cl-fechamento-4", "cl-fechamento", "Desligar equipamentos não essenciais", 4, false),
      itemChecklist("cl-fechamento-5", "cl-fechamento", "Retirar lixo e higienizar área externa", 5, false),
    ],
  },
];

// =========================================================================
// Estoque + Movimentações + Fornecedores.
// =========================================================================

export const estoque: EstoqueLinha[] = insumos.map((i) => ({
  insumoId: i.id,
  nome: i.nome,
  categoria: i.categoria,
  unidadeMedida: i.unidadeMedida,
  precoUnitario: i.precoUnitario,
  saldoAtual: i.estoque?.saldoAtual ?? 0,
  estoqueMinimo: i.estoque?.estoqueMinimo ?? 0,
}));

export const movimentacoes: Movimentacao[] = [
  { id: "mov-1", insumoId: "i-frango", nomeInsumo: "Peito de Frango", unidadeMedida: "kg", tipo: "entrada", quantidade: 5, origem: "Compra — Avícola Bom Frango", criadoEm: "2026-09-10T09:00:00.000Z" },
  { id: "mov-2", insumoId: "i-patinho", nomeInsumo: "Carne Bovina Patinho", unidadeMedida: "kg", tipo: "entrada", quantidade: 10, origem: "Compra — Frigorífico Santa Fé", criadoEm: "2026-09-11T08:50:00.000Z" },
  { id: "mov-3", insumoId: "i-mussarela", nomeInsumo: "Mussarela", unidadeMedida: "kg", tipo: "saida_venda", quantidade: 6.5, origem: "Vendas do turno — Jantar 13/09", criadoEm: "2026-09-13T23:30:00.000Z" },
  { id: "mov-4", insumoId: "i-tomate", nomeInsumo: "Tomate Italiano", unidadeMedida: "kg", tipo: "saida_venda", quantidade: 8.2, origem: "Vendas do turno — Jantar 13/09", criadoEm: "2026-09-13T23:30:00.000Z" },
  { id: "mov-5", insumoId: "i-calabresa", nomeInsumo: "Linguiça Calabresa", unidadeMedida: "kg", tipo: "saida_venda", quantidade: 2.4, origem: "Vendas do turno — Jantar 13/09", criadoEm: "2026-09-13T23:30:00.000Z" },
  { id: "mov-6", insumoId: "i-camarao", nomeInsumo: "Camarão Médio Limpo", unidadeMedida: "kg", tipo: "ajuste", quantidade: -1.75, origem: "Perda — lote RC-0914-1 descartado", criadoEm: "2026-09-14T18:25:00.000Z" },
  { id: "mov-7", insumoId: "i-farinha", nomeInsumo: "Farinha de Trigo Tipo 1", unidadeMedida: "kg", tipo: "entrada", quantidade: 25, origem: "Compra — Distribuidora Verde Horta", criadoEm: "2026-09-14T10:00:00.000Z" },
  { id: "mov-8", insumoId: "i-caixa-pizza", nomeInsumo: "Caixa de Pizza 35cm", unidadeMedida: "un", tipo: "saida_venda", quantidade: 45, origem: "Vendas do turno — Jantar 13/09", criadoEm: "2026-09-13T23:30:00.000Z" },
  { id: "mov-9", insumoId: "i-alho", nomeInsumo: "Alho Descascado", unidadeMedida: "kg", tipo: "entrada", quantidade: 1, origem: "Compra — Distribuidora Verde Horta", criadoEm: "2026-09-15T09:30:00.000Z" },
  { id: "mov-10", insumoId: "i-patinho", nomeInsumo: "Carne Bovina Patinho", unidadeMedida: "kg", tipo: "saida_venda", quantidade: 2.7, origem: "Vendas do turno — Almoço 15/09", criadoEm: "2026-09-15T15:30:00.000Z" },
];

export const fornecedores: Fornecedor[] = [
  { id: "forn-1", empresa: "Avícola Bom Frango", contato: "Roberto Lima", telefone: "(11) 98211-3344", email: "vendas@bomfrango.com.br", fornece: "Aves", diasEntrega: "Segunda, Quarta, Sexta", horarioEntrega: "08:00-10:00", prazoUrgencia: "Mesmo dia se pedido até 07:00" },
  { id: "forn-2", empresa: "Frigorífico Santa Fé", contato: "Camila Rocha", telefone: "(11) 97654-2211", email: "comercial@santafecarnes.com.br", fornece: "Carnes bovinas e suínas", diasEntrega: "Terça, Quinta", horarioEntrega: "07:30-09:30", prazoUrgencia: "24h" },
  { id: "forn-3", empresa: "Peixaria do Porto", contato: "Diego Fontes", telefone: "(11) 99087-5521", email: "pedidos@peixariadoporto.com.br", fornece: "Pescados e frutos do mar", diasEntrega: "Terça, Sexta", horarioEntrega: "06:30-08:00", prazoUrgencia: "Sob consulta — sujeito a safra" },
  { id: "forn-4", empresa: "Distribuidora Verde Horta", contato: "Sandra Melo", telefone: "(11) 98899-1122", email: "contato@verdehorta.com.br", fornece: "Hortifruti e temperos", diasEntrega: "Diário", horarioEntrega: "05:30-07:00", prazoUrgencia: "Mesmo dia" },
  { id: "forn-5", empresa: "Laticínios Serra Azul", contato: "Fernando Nogueira", telefone: "(11) 96677-8899", email: "vendas@serraazul.com.br", fornece: "Laticínios e derivados", diasEntrega: "Segunda, Quinta", horarioEntrega: "08:00-11:00", prazoUrgencia: "48h" },
];

// =========================================================================
// Nutricional.
// =========================================================================

function valoresParciais(v: Partial<ValoresNutricionais>): Partial<ValoresNutricionais> {
  return v;
}

export const valoresInsumos: ValoresNutricionaisInsumo[] = [
  { insumoId: "i-frango", baseGramas: 100, valores: valoresParciais({ caloriasKcal: 165, carboidratosG: 0, acucaresTotaisG: 0, acucaresAdicionadosG: 0, proteinasG: 31, gordurasTotaisG: 3.6, gordurasSaturadasG: 1, gordurasTransG: 0, fibraAlimentarG: 0, sodioMg: 74 }) },
  { insumoId: "i-patinho", baseGramas: 100, valores: valoresParciais({ caloriasKcal: 219, carboidratosG: 0, acucaresTotaisG: 0, acucaresAdicionadosG: 0, proteinasG: 27, gordurasTotaisG: 12, gordurasSaturadasG: 4.6, gordurasTransG: 0.5, fibraAlimentarG: 0, sodioMg: 60 }) },
  { insumoId: "i-calabresa", baseGramas: 100, valores: valoresParciais({ caloriasKcal: 337, carboidratosG: 2, acucaresTotaisG: 0.5, acucaresAdicionadosG: 0, proteinasG: 16, gordurasTotaisG: 29, gordurasSaturadasG: 10.5, gordurasTransG: 0.4, fibraAlimentarG: 0, sodioMg: 980 }) },
  { insumoId: "i-camarao", baseGramas: 100, valores: valoresParciais({ caloriasKcal: 99, carboidratosG: 0.2, acucaresTotaisG: 0, acucaresAdicionadosG: 0, proteinasG: 24, gordurasTotaisG: 0.3, gordurasSaturadasG: 0.1, gordurasTransG: 0, fibraAlimentarG: 0, sodioMg: 111 }) },
  { insumoId: "i-mussarela", baseGramas: 100, valores: valoresParciais({ caloriasKcal: 280, carboidratosG: 3.1, acucaresTotaisG: 1, acucaresAdicionadosG: 0, proteinasG: 22, gordurasTotaisG: 21, gordurasSaturadasG: 13, gordurasTransG: 0.5, fibraAlimentarG: 0, sodioMg: 373 }) },
  { insumoId: "i-parmesao", baseGramas: 100, valores: valoresParciais({ caloriasKcal: 392, carboidratosG: 3.2, acucaresTotaisG: 0.9, acucaresAdicionadosG: 0, proteinasG: 35.8, gordurasTotaisG: 26, gordurasSaturadasG: 17, gordurasTransG: 0.8, fibraAlimentarG: 0, sodioMg: 1529 }) },
  { insumoId: "i-manteiga", baseGramas: 100, valores: valoresParciais({ caloriasKcal: 717, carboidratosG: 0.1, acucaresTotaisG: 0.1, acucaresAdicionadosG: 0, proteinasG: 0.9, gordurasTotaisG: 81, gordurasSaturadasG: 51, gordurasTransG: 3.3, fibraAlimentarG: 0, sodioMg: 11 }) },
  { insumoId: "i-leite", baseGramas: 100, valores: valoresParciais({ caloriasKcal: 61, carboidratosG: 4.8, acucaresTotaisG: 5.1, acucaresAdicionadosG: 0, proteinasG: 3.2, gordurasTotaisG: 3.3, gordurasSaturadasG: 2, gordurasTransG: 0.1, fibraAlimentarG: 0, sodioMg: 43 }) },
  { insumoId: "i-tomate", baseGramas: 100, valores: valoresParciais({ caloriasKcal: 18, carboidratosG: 3.9, acucaresTotaisG: 2.6, acucaresAdicionadosG: 0, proteinasG: 0.9, gordurasTotaisG: 0.2, gordurasSaturadasG: 0, gordurasTransG: 0, fibraAlimentarG: 1.2, sodioMg: 5 }) },
  { insumoId: "i-cebola", baseGramas: 100, valores: valoresParciais({ caloriasKcal: 40, carboidratosG: 9.3, acucaresTotaisG: 4.2, acucaresAdicionadosG: 0, proteinasG: 1.1, gordurasTotaisG: 0.1, gordurasSaturadasG: 0, gordurasTransG: 0, fibraAlimentarG: 1.7, sodioMg: 4 }) },
  { insumoId: "i-alho", baseGramas: 100, valores: valoresParciais({ caloriasKcal: 149, carboidratosG: 33, acucaresTotaisG: 1, acucaresAdicionadosG: 0, proteinasG: 6.4, gordurasTotaisG: 0.5, gordurasSaturadasG: 0.1, gordurasTransG: 0, fibraAlimentarG: 2.1, sodioMg: 17 }) },
  { insumoId: "i-azeite", baseGramas: 100, valores: valoresParciais({ caloriasKcal: 884, carboidratosG: 0, acucaresTotaisG: 0, acucaresAdicionadosG: 0, proteinasG: 0, gordurasTotaisG: 100, gordurasSaturadasG: 14, gordurasTransG: 0, fibraAlimentarG: 0, sodioMg: 2 }) },
  { insumoId: "i-farinha", baseGramas: 100, valores: valoresParciais({ caloriasKcal: 364, carboidratosG: 76, acucaresTotaisG: 0.3, acucaresAdicionadosG: 0, proteinasG: 10, gordurasTotaisG: 1, gordurasSaturadasG: 0.2, gordurasTransG: 0, fibraAlimentarG: 2.7, sodioMg: 2 }) },
  { insumoId: "i-sal", baseGramas: 100, valores: valoresParciais({ caloriasKcal: 0, carboidratosG: 0, acucaresTotaisG: 0, acucaresAdicionadosG: 0, proteinasG: 0, gordurasTotaisG: 0, gordurasSaturadasG: 0, gordurasTransG: 0, fibraAlimentarG: 0, sodioMg: 38758 }) },
  { insumoId: "i-manjericao", baseGramas: 100, valores: valoresParciais({ caloriasKcal: 22, carboidratosG: 2.6, acucaresTotaisG: 0.3, acucaresAdicionadosG: 0, proteinasG: 3.2, gordurasTotaisG: 0.6, gordurasSaturadasG: 0, gordurasTransG: 0, fibraAlimentarG: 1.6, sodioMg: 4 }) },
];

const overrideValoresMargherita: ValoresNutricionais = {
  caloriasKcal: 268,
  carboidratosG: 31,
  acucaresTotaisG: 3.5,
  acucaresAdicionadosG: 0,
  proteinasG: 12,
  gordurasTotaisG: 10.5,
  gordurasSaturadasG: 5.2,
  gordurasTransG: 0.1,
  fibraAlimentarG: 2,
  sodioMg: 520,
};

export const overrides: NutricionalOverride[] = [
  {
    receitaId: "pt-margherita",
    origem: "Laudo Laboratorial — Lab Alimentar Sul (2026)",
    valores: overrideValoresMargherita,
    informadoEm: "2026-08-20T00:00:00.000Z",
  },
];

export const rotulagens: Rotulagem[] = receitasPratos.map((r) => ({
  receitaId: r.id,
  ingredientes: "Ingredientes conforme ficha técnica: " + r.ficha.length + " itens.",
  alergenos: r.id === "pt-risoto-camarao" ? "Contém crustáceos." : "Contém glúten e lactose.",
  gluten: r.id === "pt-caprese" || r.id === "pt-risoto-camarao" ? "Não contém glúten" : "Contém glúten",
  lactose: "Contém lactose",
  fabricante: NOME_RESTAURANTE + " Ltda.",
  endereco: "Rua das Cantinas, 123 — São Paulo/SP",
  pesoLiquido: `${r.pesoPorcaoG ?? 0}g`,
  conservacao: "Consumir imediatamente após o preparo. Manter refrigerado se não consumido em até 2h.",
}));

// =========================================================================
// Segurança Alimentar (locais + registros de temperatura).
// =========================================================================

export const locais: LocalArmazenamento[] = [
  { id: "local-camara-carnes", nome: "Câmara Fria — Carnes", temperaturaMinC: -18, temperaturaMaxC: -12 },
  { id: "local-geladeira-laticinios", nome: "Geladeira — Laticínios", temperaturaMinC: 0, temperaturaMaxC: 5 },
  { id: "local-geladeira-hortifruti", nome: "Geladeira — Hortifruti", temperaturaMinC: 1, temperaturaMaxC: 7 },
  { id: "local-estoque-seco", nome: "Estoque Seco", temperaturaMinC: null, temperaturaMaxC: null },
];

export const registrosTemperatura: RegistroTemperatura[] = [
  { id: "temp-1", localArmazenamentoId: "local-camara-carnes", nomeLocal: "Câmara Fria — Carnes", temperaturaC: -14, responsavel: "Marcos Silva", registradoEm: "2026-09-13T08:00:00.000Z", insumoId: null, nomeInsumo: null },
  { id: "temp-2", localArmazenamentoId: "local-geladeira-laticinios", nomeLocal: "Geladeira — Laticínios", temperaturaC: 4, responsavel: "Ana Souza", registradoEm: "2026-09-13T08:05:00.000Z", insumoId: null, nomeInsumo: null },
  { id: "temp-3", localArmazenamentoId: "local-geladeira-hortifruti", nomeLocal: "Geladeira — Hortifruti", temperaturaC: 5.5, responsavel: "Ana Souza", registradoEm: "2026-09-13T08:10:00.000Z", insumoId: null, nomeInsumo: null },
  { id: "temp-4", localArmazenamentoId: "local-camara-carnes", nomeLocal: "Câmara Fria — Carnes", temperaturaC: -13, responsavel: "Pedro Alves", registradoEm: "2026-09-14T08:00:00.000Z", insumoId: null, nomeInsumo: null },
  { id: "temp-4b", localArmazenamentoId: "local-camara-carnes", nomeLocal: "Câmara Fria — Carnes", temperaturaC: -15, responsavel: "Pedro Alves", registradoEm: "2026-09-15T08:00:00.000Z", insumoId: "i-camarao", nomeInsumo: "Camarão Médio Limpo" },
  // Fora da faixa — caso de alerta em Segurança/Relatórios. Checagem motivada
  // pela mussarela (fica nesse local) mostrando temperatura fora da faixa.
  { id: "temp-5", localArmazenamentoId: "local-geladeira-laticinios", nomeLocal: "Geladeira — Laticínios", temperaturaC: 8.5, responsavel: "Pedro Alves", registradoEm: "2026-09-16T08:05:00.000Z", insumoId: "i-mussarela", nomeInsumo: "Mussarela" },
  { id: "temp-6", localArmazenamentoId: "local-geladeira-hortifruti", nomeLocal: "Geladeira — Hortifruti", temperaturaC: 6, responsavel: "Juliana Costa", registradoEm: "2026-09-16T08:10:00.000Z", insumoId: null, nomeInsumo: null },
  { id: "temp-7", localArmazenamentoId: "local-camara-carnes", nomeLocal: "Câmara Fria — Carnes", temperaturaC: -12.5, responsavel: "Marcos Silva", registradoEm: "2026-09-16T08:00:00.000Z", insumoId: null, nomeInsumo: null },
  { id: "temp-8", localArmazenamentoId: "local-geladeira-laticinios", nomeLocal: "Geladeira — Laticínios", temperaturaC: 4.5, responsavel: "Ana Souza", registradoEm: "2026-09-17T08:05:00.000Z", insumoId: null, nomeInsumo: null },
];

// =========================================================================
// Fechamentos de CMV.
// =========================================================================

export const fechamentos: FechamentoCmv[] = [
  {
    id: "fech-1",
    periodoInicio: "2026-08-01",
    periodoFim: "2026-08-31",
    estoqueInicial: 8200,
    compras: 21500,
    estoqueFinal: 7600,
    faturamento: 68900,
    fechadoEm: "2026-09-01T10:00:00.000Z",
    vendas: [
      { receitaId: "pt-margherita", nomePrato: "Pizza Margherita", quantidade: 298 },
      { receitaId: "pt-calabresa", nomePrato: "Pizza Calabresa", quantidade: 251 },
      { receitaId: "pt-parmegiana", nomePrato: "Frango à Parmegiana", quantidade: 182 },
      { receitaId: "pt-risoto-camarao", nomePrato: "Risoto de Camarão", quantidade: 88 },
      { receitaId: "pt-lasanha", nomePrato: "Lasanha Bolonhesa", quantidade: 143 },
      { receitaId: "pt-caprese", nomePrato: "Salada Caprese", quantidade: 112 },
    ],
  },
  {
    id: "fech-2",
    periodoInicio: "2026-09-01",
    periodoFim: "2026-09-15",
    estoqueInicial: 7600,
    compras: 12800,
    estoqueFinal: 8100,
    faturamento: 39200,
    fechadoEm: "2026-09-16T10:00:00.000Z",
    vendas: [
      { receitaId: "pt-margherita", nomePrato: "Pizza Margherita", quantidade: 155 },
      { receitaId: "pt-calabresa", nomePrato: "Pizza Calabresa", quantidade: 130 },
      { receitaId: "pt-parmegiana", nomePrato: "Frango à Parmegiana", quantidade: 95 },
      { receitaId: "pt-risoto-camarao", nomePrato: "Risoto de Camarão", quantidade: 47 },
      { receitaId: "pt-lasanha", nomePrato: "Lasanha Bolonhesa", quantidade: 75 },
      { receitaId: "pt-caprese", nomePrato: "Salada Caprese", quantidade: 60 },
    ],
  },
];

export const margemAlvoCliente = 0.65;
