import { describe, expect, it } from "vitest";
import type { Insumo } from "@/lib/dominio/insumo";
import type { NotaDeCompra } from "../documentoFiscal";
import {
  calcularConferencia,
  calcularLinha,
  chaveLigacao,
  comprasNoPeriodo,
  custoDoItem,
  montarConferencia,
  montarRegistro,
  podeConfirmar,
  precoEmbalagemParaUnitario,
  precoMudou,
  type DecisaoItem,
  type Lembranca,
} from "../conferenciaNota";

const insumo = (id: string, nome: string, unidadeMedida: Insumo["unidadeMedida"], precoUnitario: number, pesoPorUnidade: number | null = null) =>
  ({ id, nome, categoria: "outro", unidadeMedida, tamanhoEmbalagem: 1, precoEmbalagem: precoUnitario, precoUnitario, fatorCorrecao: 1, pesoPorUnidade, localArmazenamentoId: null, estoque: null }) as Insumo;

const cadastro = [insumo("tom", "Tomate Italiano", "kg", 6), insumo("ceb", "Cebola Branca", "kg", 4), insumo("oleo", "Óleo de Soja", "l", 8), insumo("ovo", "Ovo", "un", 0.8)];

const nota: NotaDeCompra = {
  chave: "35260912345678000190550010000012341000012345",
  numero: "1234",
  serie: "1",
  fornecedor: "Verde Horta",
  cnpjFornecedor: "12345678000190",
  emitidaEm: "2026-09-25",
  valorTotal: 300,
  itens: [
    { codigo: "10", descricao: "TOMATE ITALIANO KG", quantidade: 12.5, unidade: "KG", valorUnitario: 6.9, valor: 86.25, custosExtras: 3.75 },
    { codigo: "31", descricao: "OLEO DE SOJA CX 20X900ML", quantidade: 2, unidade: "CX", valorUnitario: 90, valor: 180, custosExtras: 0 },
    { codigo: "90", descricao: "DETERGENTE NEUTRO", quantidade: 2, unidade: "UN", valorUnitario: 3, valor: 6, custosExtras: 0 },
  ],
};

describe("conferência: sugestão de insumo", () => {
  it("usa a ligação lembrada do fornecedor antes do nome parecido", () => {
    const lembradas = new Map<string, Lembranca>([[chaveLigacao("12.345.678/0001-90", " 31 "), { insumoId: "oleo", fator: 18 }]]);
    const linhas = montarConferencia(nota, cadastro, lembradas);
    expect(linhas[0]).toMatchObject({ ordem: 1, insumoSugeridoId: "tom", origemSugestao: "nome", custosExtras: 3.75 });
    expect(linhas[1]).toMatchObject({ insumoSugeridoId: "oleo", origemSugestao: "lembrado", fatorSugerido: 18 });
    expect(linhas[2]).toMatchObject({ insumoSugeridoId: null, origemSugestao: null });
  });

  it("ignora a ligação lembrada de insumo que não existe mais", () => {
    const lembradas = new Map<string, Lembranca>([[chaveLigacao("12345678000190", "90"), { insumoId: "apagado", fator: null }]]);
    expect(montarConferencia(nota, cadastro, lembradas)[2].insumoSugeridoId).toBeNull();
  });

  it("a chave da ligação usa só os dígitos do CNPJ e o código em maiúsculas", () => {
    expect(chaveLigacao("12.345.678/0001-90", " ab1 ")).toBe("12345678000190|AB1");
  });
});

describe("conferência: conta de cada item", () => {
  it("converte a unidade da nota e calcula o preço novo e a variação", () => {
    const r = calcularLinha(nota.itens[0], 1, { ordem: 1, insumoId: "tom", ignorar: false, fator: null }, cadastro[0], false);
    expect(r).toMatchObject({ status: "pronto", quantidadeInsumo: 12.5, precoUnitarioNovo: 6.9, precoUnitarioAtual: 6, variacao: 0.15, suspeito: false });
  });

  it("frete, IPI e ST entram no custo quando pedido", () => {
    expect(custoDoItem(nota.itens[0], true)).toBe(90);
    expect(custoDoItem(nota.itens[0], false)).toBe(86.25);
    const r = calcularLinha(nota.itens[0], 1, { ordem: 1, insumoId: "tom", ignorar: false, fator: null }, cadastro[0], true);
    expect(r.precoUnitarioNovo).toBe(7.2);
  });

  it("unidade que não converte (caixa) pede o fator; com o fator, entra", () => {
    const sem = calcularLinha(nota.itens[1], 2, { ordem: 2, insumoId: "oleo", ignorar: false, fator: null }, cadastro[2], false);
    expect(sem.status).toBe("precisa_fator");
    const com = calcularLinha(nota.itens[1], 2, { ordem: 2, insumoId: "oleo", ignorar: false, fator: 18 }, cadastro[2], false);
    expect(com).toMatchObject({ status: "pronto", quantidadeInsumo: 36, precoUnitarioNovo: 5 });
    const zero = calcularLinha(nota.itens[1], 2, { ordem: 2, insumoId: "oleo", ignorar: false, fator: 0 }, cadastro[2], false);
    expect(zero.status).toBe("precisa_fator");
  });

  it("preço que muda demais é marcado como suspeito (provável erro de unidade)", () => {
    // 12,5 kg lidos como 12,5 g: o preço por kg explode.
    const r = calcularLinha({ ...nota.itens[0], unidade: "G" }, 1, { ordem: 1, insumoId: "tom", ignorar: false, fator: null }, cadastro[0], false);
    expect(r.status).toBe("pronto");
    expect(r.suspeito).toBe(true);
  });

  it("sem decisão, ignorado ou insumo apagado", () => {
    expect(calcularLinha(nota.itens[2], 3, undefined, undefined, false).status).toBe("sem_insumo");
    expect(calcularLinha(nota.itens[2], 3, { ordem: 3, insumoId: null, ignorar: true, fator: null }, undefined, false).status).toBe("ignorado");
    expect(calcularLinha(nota.itens[2], 3, { ordem: 3, insumoId: "x", ignorar: false, fator: null }, undefined, false).status).toBe("invalido");
  });

  it("nota sem valor não inventa preço", () => {
    const r = calcularLinha({ ...nota.itens[0], valor: 0, custosExtras: 0 }, 1, { ordem: 1, insumoId: "tom", ignorar: false, fator: null }, cadastro[0], true);
    expect(r).toMatchObject({ status: "pronto", precoUnitarioNovo: null, variacao: null, suspeito: false });
  });
});

describe("conferência: confirmar e gravar", () => {
  const decisoes: DecisaoItem[] = [
    { ordem: 1, insumoId: "tom", ignorar: false, fator: null },
    { ordem: 2, insumoId: "oleo", ignorar: false, fator: 18 },
    { ordem: 3, insumoId: null, ignorar: true, fator: null },
  ];

  it("só confirma com tudo decidido e pelo menos um item entrando", () => {
    expect(podeConfirmar(calcularConferencia(nota, decisoes, cadastro, true)).ok).toBe(true);
    expect(podeConfirmar(calcularConferencia(nota, decisoes.slice(0, 2), cadastro, true))).toMatchObject({ ok: false });
    const semFator = decisoes.map((d) => (d.ordem === 2 ? { ...d, fator: null } : d));
    expect(podeConfirmar(calcularConferencia(nota, semFator, cadastro, true)).motivo).toMatch(/conversão/);
    const tudoIgnorado = decisoes.map((d) => ({ ...d, insumoId: null, ignorar: true }));
    expect(podeConfirmar(calcularConferencia(nota, tudoIgnorado, cadastro, true)).motivo).toMatch(/Nenhum item/);
  });

  it("monta o registro do banco a partir da conta do servidor", () => {
    const resultado = calcularConferencia(nota, decisoes, cadastro, true);
    const reg = montarRegistro(nota, decisoes, resultado, { atualizarPrecos: true, incluirExtras: true });
    expect(reg).toMatchObject({ chave: nota.chave, numero: "1234", serie: "1", cnpj: "12345678000190", emitida_em: "2026-09-25", valor_total: 300, atualizar_precos: true, incluiu_extras: true });
    expect(reg.itens[0]).toMatchObject({ ordem: 1, insumo_id: "tom", ignorado: false, quantidade_insumo: 12.5, preco_unitario_novo: 7.2, custo: 90, fator: null });
    expect(reg.itens[1]).toMatchObject({ insumo_id: "oleo", quantidade_insumo: 36, preco_unitario_novo: 5, custo: 180, fator: 18 });
    expect(reg.itens[2]).toMatchObject({ insumo_id: null, ignorado: true, quantidade_insumo: null, custo: 0 });
  });

  it("sem os extras, o custo é só o valor dos produtos", () => {
    const resultado = calcularConferencia(nota, decisoes, cadastro, false);
    const reg = montarRegistro(nota, decisoes, resultado, { atualizarPrecos: false, incluirExtras: false });
    expect(reg.itens[0]).toMatchObject({ custo: 86.25, preco_unitario_novo: 6.9 });
  });

  it("data de emissão inválida e total zerado vão como nulos", () => {
    const reg = montarRegistro({ ...nota, emitidaEm: "", valorTotal: 0 }, decisoes, calcularConferencia(nota, decisoes, cadastro, true), { atualizarPrecos: true, incluirExtras: true });
    expect(reg.emitida_em).toBeNull();
    expect(reg.valor_total).toBeNull();
  });
});

describe("preço e compras do período", () => {
  it("preço da embalagem pro unitário novo e mudança mínima", () => {
    expect(precoEmbalagemParaUnitario(7.2, 0.9)).toBe(6.48);
    expect(precoMudou(6, 6.02)).toBe(false);
    expect(precoMudou(6, 6.9)).toBe(true);
    expect(precoMudou(6, null)).toBe(false);
  });

  it("soma só as notas emitidas dentro do período", () => {
    const compras = [
      { data: "2026-08-31", custo: 100, notas: 1 },
      { data: "2026-09-01", custo: 200.1, notas: 2 },
      { data: "2026-09-30", custo: 50.2, notas: 1 },
      { data: "2026-10-01", custo: 999, notas: 1 },
    ];
    expect(comprasNoPeriodo(compras, "2026-09-01", "2026-09-30")).toEqual({ custo: 250.3, notas: 3 });
    expect(comprasNoPeriodo([], "2026-09-01", "2026-09-30")).toEqual({ custo: 0, notas: 0 });
  });
});
