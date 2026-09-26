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
import type { EtapaReceita, LinhaFicha, Receita } from "@/lib/dominio/receita";
import type { Processamento } from "@/lib/dominio/processamento";
import type { Producao, Turno } from "@/lib/dominio/producao";
import type { Checklist, ChecklistItem } from "@/lib/dominio/checklist";
import type { EstoqueLinha, Movimentacao } from "@/lib/dominio/estoque";
import type { Fornecedor } from "@/lib/dominio/fornecedor";
import type { Requisicao } from "@/lib/dominio/requisicao";
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
  // PROTEÍNAS (2026-09-25): mais cortes na demo, pra seleção do tablet mostrar
  // que lista qualquer proteína cadastrada (não só as das fichas).
  { id: "i-picanha", nome: "Picanha Bovina", categoria: "proteina", unidadeMedida: "kg", tamanhoEmbalagem: 1.2, precoEmbalagem: 107.88, precoUnitario: 89.9, fatorCorrecao: 1.15, pesoPorUnidade: null, localArmazenamentoId: "local-camara-carnes", estoque: { saldoAtual: 12, estoqueMinimo: 6 } },
  { id: "i-file-mignon", nome: "Filé Mignon", categoria: "proteina", unidadeMedida: "kg", tamanhoEmbalagem: 2, precoEmbalagem: 179.8, precoUnitario: 89.9, fatorCorrecao: 1.25, pesoPorUnidade: null, localArmazenamentoId: "local-camara-carnes", estoque: { saldoAtual: 8, estoqueMinimo: 4 } },
  { id: "i-costela", nome: "Costela Bovina", categoria: "proteina", unidadeMedida: "kg", tamanhoEmbalagem: 10, precoEmbalagem: 299, precoUnitario: 29.9, fatorCorrecao: 1.4, pesoPorUnidade: null, localArmazenamentoId: "local-camara-carnes", estoque: { saldoAtual: 15, estoqueMinimo: 8 } },
  { id: "i-salmao", nome: "Salmão Inteiro", categoria: "proteina", unidadeMedida: "kg", tamanhoEmbalagem: 5, precoEmbalagem: 349.5, precoUnitario: 69.9, fatorCorrecao: 1.6, pesoPorUnidade: null, localArmazenamentoId: "local-camara-carnes", estoque: { saldoAtual: 10, estoqueMinimo: 5 } },
  { id: "i-tilapia", nome: "Filé de Tilápia", categoria: "proteina", unidadeMedida: "kg", tamanhoEmbalagem: 5, precoEmbalagem: 199.5, precoUnitario: 39.9, fatorCorrecao: 1.05, pesoPorUnidade: null, localArmazenamentoId: "local-camara-carnes", estoque: { saldoAtual: 7, estoqueMinimo: 4 } },
  { id: "i-lombo", nome: "Lombo Suíno", categoria: "proteina", unidadeMedida: "kg", tamanhoEmbalagem: 5, precoEmbalagem: 124.5, precoUnitario: 24.9, fatorCorrecao: 1.1, pesoPorUnidade: null, localArmazenamentoId: "local-camara-carnes", estoque: { saldoAtual: 9, estoqueMinimo: 5 } },
  { id: "i-coxa", nome: "Coxa e Sobrecoxa de Frango", categoria: "proteina", unidadeMedida: "kg", tamanhoEmbalagem: 10, precoEmbalagem: 139, precoUnitario: 13.9, fatorCorrecao: 1.3, pesoPorUnidade: null, localArmazenamentoId: "local-camara-carnes", estoque: { saldoAtual: 20, estoqueMinimo: 10 } },
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

function etapa(id: string, ordem: number, titulo: string, texto: string): EtapaReceita {
  return { id, ordem, titulo, texto, fotoUrl: null };
}

// =========================================================================
// Receitas — 3 preparos (sub-receitas) + 6 pratos finais que as referenciam.
// =========================================================================
// FICHAS (2026-09-25): passo a passo completo (quantidades, tempos, ponto
// certo, validade) em todos os preparos e pratos, e fotos ilustrativas do
// empratamento (Unsplash) em 4 pratos, pra demo do tablet. Parmegiana e
// Caprese ficam sem foto de propósito: mostram o aviso de foto faltando.
// No sistema de verdade a foto é a do prato da casa, que o gestor sobe.

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
    fotoUrl: null,
    ficha: [
      linha("pr-massa-l1", { insumoId: "i-farinha", pesoLiquido: 2.2, unidade: "kg" }),
      linha("pr-massa-l2", { insumoId: "i-fermento", pesoLiquido: 0.05, unidade: "kg" }),
      linha("pr-massa-l3", { insumoId: "i-azeite", pesoLiquido: 0.15, unidade: "l" }),
      linha("pr-massa-l4", { insumoId: "i-sal", pesoLiquido: 0.04, unidade: "kg" }),
    ],
    etapas: [
      etapa("pr-massa-e1", 1, "Hidratar o fermento", "Misturar os 50 g de fermento em 1,3 l de água morna (35 °C). Esperar 10 min até formar espuma."),
      etapa("pr-massa-e2", 2, "Misturar a massa", "Na masseira, colocar os 2,2 kg de farinha e os 40 g de sal. Juntar o fermento hidratado e os 150 ml de azeite. Bater em velocidade 1 por 4 min."),
      etapa("pr-massa-e3", 3, "Sovar", "Bater em velocidade 2 por 8 min, até a massa soltar da cuba e ficar lisa. Ponto certo: esticar um pedaço fino sem rasgar (ponto de véu)."),
      etapa("pr-massa-e4", 4, "Descanso", "Cobrir com filme e deixar crescer 2 h em temperatura ambiente, até dobrar de volume."),
      etapa("pr-massa-e5", 5, "Porcionar", "Dividir em 10 discos de 220 g na balança. Bolear, colocar na caixa com tampa e etiquetar com data e lote. Validade: 3 dias na geladeira."),
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
    fotoUrl: null,
    ficha: [
      linha("pr-molho-l1", { insumoId: "i-tomate", pesoLiquido: 5, unidade: "kg" }),
      linha("pr-molho-l2", { insumoId: "i-cebola", pesoLiquido: 0.6, unidade: "kg" }),
      linha("pr-molho-l3", { insumoId: "i-alho", pesoLiquido: 0.1, unidade: "kg" }),
      linha("pr-molho-l4", { insumoId: "i-azeite", pesoLiquido: 0.2, unidade: "l" }),
      linha("pr-molho-l5", { insumoId: "i-sal", pesoLiquido: 0.05, unidade: "kg" }),
      linha("pr-molho-l6", { insumoId: "i-manjericao", pesoLiquido: 0.03, unidade: "kg" }),
    ],
    etapas: [
      etapa("pr-molho-e1", 1, "Pré-preparo", "Lavar os 5 kg de tomate (pesar bruto ~5,75 kg), tirar o olho e cortar em 4. Picar os 600 g de cebola em cubos pequenos e amassar os 100 g de alho."),
      etapa("pr-molho-e2", 2, "Refogar", "Em panela grande, aquecer os 200 ml de azeite em fogo médio. Refogar a cebola por 5 min, até ficar transparente. Juntar o alho e mexer 1 min, sem deixar dourar."),
      etapa("pr-molho-e3", 3, "Cozinhar", "Adicionar o tomate e os 50 g de sal. Tampar e cozinhar em fogo baixo por 40 min, mexendo a cada 10 min pra não pegar no fundo."),
      etapa("pr-molho-e4", 4, "Bater e finalizar", "Bater com mixer até ficar liso. Desligar o fogo e juntar as 30 g de manjericão rasgado. Ponto certo: rende 4 litros, textura de nappe (cobre a colher)."),
      etapa("pr-molho-e5", 5, "Resfriar e guardar", "Resfriar em banho-maria de gelo até 10 °C em no máximo 2 h. Porcionar em potes de 1 l, etiquetar e guardar a 4 °C. Validade: 5 dias."),
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
    fotoUrl: null,
    ficha: [
      linha("pr-branco-l1", { insumoId: "i-manteiga", pesoLiquido: 0.2, unidade: "kg" }),
      linha("pr-branco-l2", { insumoId: "i-farinha", pesoLiquido: 0.2, unidade: "kg" }),
      linha("pr-branco-l3", { insumoId: "i-leite", pesoLiquido: 2, unidade: "l" }),
      linha("pr-branco-l4", { insumoId: "i-sal", pesoLiquido: 0.02, unidade: "kg" }),
    ],
    etapas: [
      etapa("pr-branco-e1", 1, "Roux", "Derreter os 200 g de manteiga em fogo baixo. Juntar os 200 g de farinha de uma vez e mexer com fouet por 3 min, sem dourar (roux branco)."),
      etapa("pr-branco-e2", 2, "Incorporar o leite", "Com o fogo médio, juntar os 2 l de leite frio aos poucos, sempre batendo com o fouet pra não empelotar."),
      etapa("pr-branco-e3", 3, "Cozinhar", "Cozinhar por 8 min depois de ferver, mexendo sem parar. Temperar com os 20 g de sal. Ponto certo: cobre as costas da colher."),
      etapa("pr-branco-e4", 4, "Guardar", "Cobrir com filme encostado no molho (não forma película). Resfriar, etiquetar e guardar a 4 °C. Validade: 3 dias."),
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
    fotoUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1200&q=80",
    ficha: [
      linha("pt-marg-l1", { subReceitaId: "pr-massa-pizza", pesoLiquido: 1, unidade: "un" }),
      linha("pt-marg-l2", { subReceitaId: "pr-molho-tomate", pesoLiquido: 0.15, unidade: "l" }),
      linha("pt-marg-l3", { insumoId: "i-mussarela", pesoLiquido: 0.15, unidade: "kg" }),
      linha("pt-marg-l4", { insumoId: "i-manjericao", pesoLiquido: 0.01, unidade: "kg" }),
      linha("pt-marg-l5", { insumoId: "i-azeite", pesoLiquido: 0.02, unidade: "l" }),
    ],
    etapas: [
      etapa("pt-marg-e1", 1, "Abrir o disco de massa", "Esticar a massa de pizza pré-preparada até 30cm de diâmetro, deixando a borda levemente mais grossa."),
      etapa("pt-marg-e2", 2, "Espalhar o molho", "Cobrir o disco com uma camada fina e uniforme de molho de tomate caseiro, deixando 2cm livres na borda."),
      etapa("pt-marg-e3", 3, "Finalizar a montagem", "Distribuir a mussarela por igual e finalizar com folhas de manjericão fresco e um fio de azeite."),
      etapa("pt-marg-e4", 4, "Assar", "Assar em forno a 380°C por aproximadamente 3 minutos, até a borda dourar e o queijo derreter por completo."),
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
    fotoUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80",
    ficha: [
      linha("pt-cal-l1", { subReceitaId: "pr-massa-pizza", pesoLiquido: 1, unidade: "un" }),
      linha("pt-cal-l2", { subReceitaId: "pr-molho-tomate", pesoLiquido: 0.15, unidade: "l" }),
      linha("pt-cal-l3", { insumoId: "i-mussarela", pesoLiquido: 0.15, unidade: "kg" }),
      linha("pt-cal-l4", { insumoId: "i-calabresa", pesoLiquido: 0.12, unidade: "kg" }),
      linha("pt-cal-l5", { insumoId: "i-cebola", pesoLiquido: 0.05, unidade: "kg" }),
    ],
    etapas: [
      etapa("pt-cal-e1", 1, "Abrir o disco", "Abrir 1 disco de massa até 30 cm, com a borda levemente mais grossa."),
      etapa("pt-cal-e2", 2, "Molho", "Espalhar 150 ml de molho de tomate com a concha, em espiral, deixando 2 cm de borda."),
      etapa("pt-cal-e3", 3, "Cobertura", "Distribuir 150 g de mussarela, depois 120 g de calabresa fatiada fina (0,5 cm) e 50 g de cebola em rodelas por cima."),
      etapa("pt-cal-e4", 4, "Assar", "Forno a 380 °C por 3 min. Ponto certo: borda dourada e calabresa levemente tostada."),
      etapa("pt-cal-e5", 5, "Empratar", "Cortar em 8 pedaços iguais e servir na tábua. Conferir com a foto antes de sair."),
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
    fotoUrl: null,
    ficha: [
      linha("pt-parm-l1", { insumoId: "i-frango", pesoLiquido: 0.2, unidade: "kg" }),
      linha("pt-parm-l2", { subReceitaId: "pr-molho-tomate", pesoLiquido: 0.12, unidade: "l" }),
      linha("pt-parm-l3", { insumoId: "i-mussarela", pesoLiquido: 0.08, unidade: "kg" }),
      linha("pt-parm-l4", { insumoId: "i-parmesao", pesoLiquido: 0.02, unidade: "kg" }),
      linha("pt-parm-l5", { insumoId: "i-farinha", pesoLiquido: 0.03, unidade: "kg" }),
      linha("pt-parm-l6", { insumoId: "i-azeite", pesoLiquido: 0.02, unidade: "l" }),
    ],
    etapas: [
      etapa("pt-parm-e1", 1, "Empanar o frango", "Temperar o filé de frango e empaná-lo na farinha de trigo, cobrindo bem toda a superfície."),
      etapa("pt-parm-e2", 2, "Fritar", "Fritar em azeite quente até dourar por igual dos dois lados, escorrendo o excesso de óleo em papel absorvente."),
      etapa("pt-parm-e3", 3, "Gratinar", "Cobrir o filé frito com molho de tomate, mussarela e parmesão ralado; gratinar no forno até derreter e dourar o queijo."),
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
    fotoUrl: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=1200&q=80",
    ficha: [
      linha("pt-risoto-l1", { insumoId: "i-camarao", pesoLiquido: 0.18, unidade: "kg" }),
      linha("pt-risoto-l2", { insumoId: "i-azeite", pesoLiquido: 0.02, unidade: "l" }),
      linha("pt-risoto-l3", { insumoId: "i-alho", pesoLiquido: 0.01, unidade: "kg" }),
      linha("pt-risoto-l4", { insumoId: "i-parmesao", pesoLiquido: 0.03, unidade: "kg" }),
      linha("pt-risoto-l5", { insumoId: "i-manteiga", pesoLiquido: 0.02, unidade: "kg" }),
      linha("pt-risoto-l6", { insumoId: "i-cebola", pesoLiquido: 0.03, unidade: "kg" }),
    ],
    etapas: [
      etapa("pt-risoto-e1", 1, "Separar", "Pesar 180 g de camarão limpo (bruto ~195 g), 30 g de cebola picada, 10 g de alho, 20 g de manteiga e 30 g de parmesão."),
      etapa("pt-risoto-e2", 2, "Selar o camarão", "Frigideira bem quente com metade do azeite (10 ml). Selar o camarão 1 min de cada lado. Reservar."),
      etapa("pt-risoto-e3", 3, "Finalizar o arroz", "Na mesma panela, refogar a cebola e o alho no restante do azeite. Juntar o arroz pré-cozido e o caldo quente aos poucos até ficar cremoso (al dente)."),
      etapa("pt-risoto-e4", 4, "Mantecar", "Fora do fogo, juntar a manteiga gelada e o parmesão. Mexer vigorosamente até ficar brilhante. Voltar o camarão."),
      etapa("pt-risoto-e5", 5, "Empratar", "Prato fundo aquecido. Risoto no centro, camarões por cima, fio de azeite. Servir na hora (ponto de onda)."),
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
    // RÓTULO PARA VAREJO (2026-09-26): na demo, a lasanha também sai congelada pro supermercado.
    destinoVenda: "varejo_terceiro",
    margemAlvo: 0.65,
    modoPreparo: "Montar camadas de carne refogada, molho de tomate, molho branco e mussarela; gratinar no forno.",
    fotoUrl: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=1200&q=80",
    ficha: [
      linha("pt-las-l1", { insumoId: "i-patinho", pesoLiquido: 0.15, unidade: "kg" }),
      linha("pt-las-l2", { subReceitaId: "pr-molho-tomate", pesoLiquido: 0.2, unidade: "l" }),
      linha("pt-las-l3", { subReceitaId: "pr-molho-branco", pesoLiquido: 0.15, unidade: "l" }),
      linha("pt-las-l4", { insumoId: "i-mussarela", pesoLiquido: 0.1, unidade: "kg" }),
      linha("pt-las-l5", { insumoId: "i-parmesao", pesoLiquido: 0.02, unidade: "kg" }),
    ],
    etapas: [
      etapa("pt-las-e1", 1, "Refogar a carne", "Refogar a carne bovina moída até dourar e misturar com o molho de tomate caseiro."),
      etapa("pt-las-e2", 2, "Montar as camadas", "Intercalar camadas de massa de lasanha, carne com molho de tomate, molho branco e mussarela na travessa."),
      etapa("pt-las-e3", 3, "Finalizar com parmesão", "Cobrir a última camada com parmesão ralado."),
      etapa("pt-las-e4", 4, "Gratinar", "Levar ao forno até gratinar por completo e a superfície dourar."),
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
    fotoUrl: null,
    ficha: [
      linha("pt-cap-l1", { insumoId: "i-tomate", pesoLiquido: 0.18, unidade: "kg" }),
      linha("pt-cap-l2", { insumoId: "i-mussarela", pesoLiquido: 0.12, unidade: "kg" }),
      linha("pt-cap-l3", { insumoId: "i-manjericao", pesoLiquido: 0.01, unidade: "kg" }),
      linha("pt-cap-l4", { insumoId: "i-azeite", pesoLiquido: 0.015, unidade: "l" }),
      linha("pt-cap-l5", { insumoId: "i-sal", pesoLiquido: 0.005, unidade: "kg" }),
    ],
    etapas: [
      etapa("pt-cap-e1", 1, "Fatiar", "Fatiar 180 g de tomate (bruto ~207 g) e 120 g de mussarela de búfala em rodelas de 1 cm."),
      etapa("pt-cap-e2", 2, "Montar", "Intercalar tomate e mussarela em leque no prato raso, em círculo."),
      etapa("pt-cap-e3", 3, "Finalizar", "10 g de manjericão fresco por cima, 15 ml de azeite em fio e 5 g de flor de sal. Servir frio (até 10 °C)."),
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

function itemChecklist(id: string, checklistId: string, texto: string, ordem: number, concluidoHoje: boolean, areaId: string | null = null): ChecklistItem {
  return { id, checklistId, texto, ordem, concluidoHoje, areaId };
}

export const checklists: Checklist[] = [
  {
    id: "cl-abertura",
    fotos: [],
    areas: [],
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
  // POLIMENTO checklists-pracas (2026-09-22) + pracas-areas (2026-09-23): três praças
  // da Cantina, cada uma dividida nas áreas que ela tem (bancada, geladeira de
  // apoio, forno, pista quente/fria), com o que precisa estar em cada área. Fotos
  // começam vazias: a demo não tem foto real da cozinha, e foto inventada seria
  // dado falso (PRODUCT.md). Quem testa adiciona as próprias (ficam na sessão).
  {
    id: "cl-praca",
    nome: "Praça de pizza",
    momento: "praca",
    fotos: [],
    areas: [
      { id: "ar-pizza-bancada", checklistId: "cl-praca", nome: "Bancada de montagem", ordem: 1 },
      { id: "ar-pizza-geladeira", checklistId: "cl-praca", nome: "Geladeira de apoio", ordem: 2 },
      { id: "ar-pizza-forno", checklistId: "cl-praca", nome: "Forno", ordem: 3 },
    ],
    itens: [
      itemChecklist("cl-praca-2", "cl-praca", "Molho de tomate em 2 cubas 1/6", 1, true, "ar-pizza-bancada"),
      itemChecklist("cl-praca-3", "cl-praca", "Mussarela ralada em 2 cubas 1/3", 2, true, "ar-pizza-bancada"),
      itemChecklist("cl-praca-4", "cl-praca", "Calabresa fatiada em 1 cuba 1/6", 3, false, "ar-pizza-bancada"),
      itemChecklist("cl-praca-5", "cl-praca", "Manjericão lavado, seco e coberto com pano úmido", 4, false, "ar-pizza-bancada"),
      itemChecklist("cl-praca-6", "cl-praca", "Azeite, orégano e sal à direita da bancada", 5, true, "ar-pizza-bancada"),
      itemChecklist("cl-praca-1", "cl-praca", "Discos de massa abertos (30 un), em caixas tampadas", 6, true, "ar-pizza-geladeira"),
      itemChecklist("cl-praca-9", "cl-praca", "Reposição de mussarela (1 cuba 1/3) na prateleira de cima", 7, false, "ar-pizza-geladeira"),
      itemChecklist("cl-praca-8", "cl-praca", "Forno a 380 °C conferido no termômetro", 8, false, "ar-pizza-forno"),
      itemChecklist("cl-praca-7", "cl-praca", "Pá, cortador e boleadores limpos no suporte", 9, true, "ar-pizza-forno"),
    ],
  },
  {
    id: "cl-praca-fogao",
    nome: "Praça quente (fogão)",
    momento: "praca",
    fotos: [],
    areas: [
      { id: "ar-fogao-pista", checklistId: "cl-praca-fogao", nome: "Pista quente", ordem: 1 },
      { id: "ar-fogao-geladeira", checklistId: "cl-praca-fogao", nome: "Geladeira de apoio", ordem: 2 },
      { id: "ar-fogao-bancada", checklistId: "cl-praca-fogao", nome: "Bancada de finalização", ordem: 3 },
    ],
    itens: [
      itemChecklist("cl-praca-fogao-1", "cl-praca-fogao", "Caldo de legumes aquecido na boca de trás", 1, true, "ar-fogao-pista"),
      itemChecklist("cl-praca-fogao-4", "cl-praca-fogao", "Molho branco em banho-maria", 2, false, "ar-fogao-pista"),
      itemChecklist("cl-praca-fogao-6", "cl-praca-fogao", "Frigideiras, conchas e pinças nos ganchos", 3, true, "ar-fogao-pista"),
      itemChecklist("cl-praca-fogao-2", "cl-praca-fogao", "Arroz arbóreo pré-cozido porcionado (10 porções)", 4, true, "ar-fogao-geladeira"),
      itemChecklist("cl-praca-fogao-3", "cl-praca-fogao", "Camarão porcionado e etiquetado", 5, false, "ar-fogao-geladeira"),
      itemChecklist("cl-praca-fogao-5", "cl-praca-fogao", "Parmesão ralado em 1 cuba 1/9", 6, true, "ar-fogao-bancada"),
      itemChecklist("cl-praca-fogao-7", "cl-praca-fogao", "Pratos fundos aquecidos na estufa", 7, false, "ar-fogao-bancada"),
    ],
  },
  {
    id: "cl-praca-frios",
    nome: "Garde manger (frios)",
    momento: "praca",
    fotos: [],
    areas: [
      { id: "ar-frios-pista", checklistId: "cl-praca-frios", nome: "Pista fria", ordem: 1 },
      { id: "ar-frios-geladeira", checklistId: "cl-praca-frios", nome: "Geladeira de apoio", ordem: 2 },
    ],
    itens: [
      itemChecklist("cl-praca-frios-1", "cl-praca-frios", "Tomate em rodelas em 1 cuba 1/6", 1, false, "ar-frios-pista"),
      itemChecklist("cl-praca-frios-2", "cl-praca-frios", "Mussarela de búfala porcionada (60 g)", 2, false, "ar-frios-pista"),
      itemChecklist("cl-praca-frios-4", "cl-praca-frios", "Pesto no pote identificado com data", 3, false, "ar-frios-pista"),
      itemChecklist("cl-praca-frios-3", "cl-praca-frios", "Folhas lavadas, secas e em caixa com papel", 4, false, "ar-frios-geladeira"),
      itemChecklist("cl-praca-frios-5", "cl-praca-frios", "Pratos de salada gelados na prateleira de baixo", 5, false, "ar-frios-geladeira"),
    ],
  },
  {
    id: "cl-processo",
    fotos: [],
    areas: [],
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
    fotos: [],
    areas: [],
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
  { id: "mov-11", insumoId: "i-frango", nomeInsumo: "Peito de Frango", unidadeMedida: "kg", tipo: "saida_producao", quantidade: 3.36, origem: "Produção — lote FP-0914-1 (Frango à Parmegiana)", criadoEm: "2026-09-14T11:30:00.000Z" },
  { id: "mov-12", insumoId: "i-tomate", nomeInsumo: "Tomate Italiano", unidadeMedida: "kg", tipo: "saida_producao", quantidade: 1.8, origem: "Produção — lote FP-0914-1 (Frango à Parmegiana)", criadoEm: "2026-09-14T11:30:00.000Z" },
];

export const fornecedores: Fornecedor[] = [
  { id: "forn-1", empresa: "Avícola Bom Frango", contato: "Roberto Lima", telefone: "(11) 98211-3344", email: "vendas@bomfrango.com.br", fornece: "Aves", entregaDias: [1, 3, 5], pedidoAte: "17:00", pedidoAntecedencia: 1, categoriasPedido: ["proteinas"], horarioEntrega: "8h às 10h", prazoUrgencia: "Mesmo dia se pedido até 07:00" },
  { id: "forn-2", empresa: "Frigorífico Santa Fé", contato: "Camila Rocha", telefone: "(11) 97654-2211", email: "comercial@santafecarnes.com.br", fornece: "Carnes bovinas e suínas", entregaDias: [2, 4], pedidoAte: "16:00", pedidoAntecedencia: 1, categoriasPedido: ["proteinas"], horarioEntrega: "7h30 às 9h30", prazoUrgencia: "24h" },
  { id: "forn-3", empresa: "Peixaria do Porto", contato: "Diego Fontes", telefone: "(11) 99087-5521", email: "pedidos@peixariadoporto.com.br", fornece: "Pescados e frutos do mar", entregaDias: [2, 5], pedidoAte: "15:00", pedidoAntecedencia: 1, categoriasPedido: ["proteinas"], horarioEntrega: "6h30 às 8h", prazoUrgencia: "Sob consulta — sujeito a safra" },
  { id: "forn-4", empresa: "Distribuidora Verde Horta", contato: "Sandra Melo", telefone: "(11) 98899-1122", email: "contato@verdehorta.com.br", fornece: "Hortifruti e temperos", entregaDias: [1, 2, 3, 4, 5, 6], pedidoAte: "18:00", pedidoAntecedencia: 1, categoriasPedido: ["hortifruti", "secos"], horarioEntrega: "5h30 às 7h", prazoUrgencia: "Mesmo dia" },
  { id: "forn-5", empresa: "Laticínios Serra Azul", contato: "Fernando Nogueira", telefone: "(11) 96677-8899", email: "vendas@serraazul.com.br", fornece: "Laticínios e derivados", entregaDias: [1, 4], pedidoAte: "12:00", pedidoAntecedencia: 2, categoriasPedido: ["laticinios"], horarioEntrega: "8h às 11h", prazoUrgencia: "48h" },
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

export const rotulagens: Rotulagem[] = receitasPratos.map((r) => {
  const lasanha = r.id === "pt-lasanha";
  return {
    receitaId: r.id,
    ingredientes: lasanha ? null : "Ingredientes conforme ficha técnica: " + r.ficha.length + " itens.",
    alergenos: r.id === "pt-risoto-camarao" ? "Contém crustáceos." : "Contém glúten e lactose.",
    gluten: r.id === "pt-caprese" || r.id === "pt-risoto-camarao" ? "Não contém glúten" : "Contém glúten",
    lactose: "Contém lactose",
    fabricante: NOME_RESTAURANTE + " Ltda. · CNPJ 12.345.678/0001-90",
    endereco: "Rua das Cantinas, 123 — São Paulo/SP · CEP 01000-000",
    pesoLiquido: lasanha ? "1,2 kg" : `${r.pesoPorcaoG ?? 0}g`,
    conservacao: lasanha
      ? "Manter congelado a -18 °C ou mais frio. Depois de descongelado, não congelar novamente."
      : "Consumir imediatamente após o preparo. Manter refrigerado se não consumido em até 2h.",
    // RÓTULO PARA VAREJO (2026-09-26): a lasanha vem com o rótulo de varejo quase pronto
    // (falta só o laudo); os outros pratos, sem os campos novos.
    alergenicos: lasanha ? { trigo: "derivados", leite: "contem", ovos: "derivados", soja: "pode_conter" } : null,
    glutenStatus: lasanha ? "contem" : null,
    lactoseStatus: lasanha ? "contem" : null,
    medidaCaseira: lasanha ? "1 pedaço" : null,
    modoPreparo: lasanha ? "Forno convencional: retire o filme, leve ao forno preaquecido a 200 °C por 45 min. Micro-ondas: 12 min em potência alta, com o filme furado." : null,
  };
});

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

// POLIMENTO relatorios (2026-09-22): a demo passa a entregar os fechamentos na
// mesma ordem do banco (listarFechamentos: periodo_fim decrescente, o mais
// recente primeiro). Antes vinham em ordem crescente e fechamentos[0] (Visão
// Geral, pendências de Relatórios) pegava agosto em vez de setembro.
// Pra voltar: trocar `fechamentosEmOrdemCronologica.slice().reverse()` por
// `fechamentosEmOrdemCronologica`.
const fechamentosEmOrdemCronologica: FechamentoCmv[] = [
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

export const fechamentos: FechamentoCmv[] = fechamentosEmOrdemCronologica.slice().reverse();

export const margemAlvoCliente = 0.65;

// PEDIDOS DA COZINHA (2026-09-26): o que a cozinha já pediu na demo.
export const requisicoesDemo: Requisicao[] = [
  { id: "req-1", categoria: "hortifruti", insumoId: null, descricao: "Coentro", quantidade: 4, unidade: "maço", observacao: "bem verdinho", responsavel: "Ana Souza", status: "pendente", criadoEm: "2026-09-26T10:40:00.000Z", resolvidoEm: null },
  { id: "req-2", categoria: "hortifruti", insumoId: null, descricao: "Tomate italiano", quantidade: 8, unidade: "kg", observacao: null, responsavel: "Marcos Silva", status: "pendente", criadoEm: "2026-09-26T11:05:00.000Z", resolvidoEm: null },
  { id: "req-3", categoria: "laticinios", insumoId: null, descricao: "Creme de leite fresco", quantidade: 6, unidade: "l", observacao: null, responsavel: "Juliana Costa", status: "pendente", criadoEm: "2026-09-26T09:20:00.000Z", resolvidoEm: null },
  { id: "req-4", categoria: "secos", insumoId: null, descricao: "Arroz arbóreo", quantidade: 5, unidade: "kg", observacao: null, responsavel: "Pedro Alves", status: "comprado", criadoEm: "2026-09-25T15:00:00.000Z", resolvidoEm: "2026-09-25T18:30:00.000Z" },
];
