import { describe, expect, it } from "vitest";
import { agoraNoRestaurante, categoriaDoInsumo, frasePrazo, pedidosDaCategoria, proximoPedido, validarRequisicao, type AgendaFornecedor } from "../requisicao";

// 2026-09-28 é segunda-feira.
const ceasa: AgendaFornecedor = { empresa: "Ceasa do Zé", categorias: ["hortifruti"], diasEntrega: [1, 3, 5], pedidoAte: "18:00", antecedencia: 1 };

describe("prazo do pedido", () => {
  it("segunda de manhã: entrega de quarta, pedindo até terça 18h", () => {
    const p = proximoPedido(ceasa, { data: "2026-09-28", minutos: 9 * 60 })!;
    expect(p).toMatchObject({ entrega: "2026-09-30", prazoData: "2026-09-29", prazoHora: "18:00" });
    expect(frasePrazo(p, { data: "2026-09-28", minutos: 9 * 60 })).toBe("Peça até amanhã às 18h pra chegar quarta (30/09).");
  });

  it("terça 17h ainda dá pra quarta; terça 18h01 já vai pra sexta", () => {
    expect(proximoPedido(ceasa, { data: "2026-09-29", minutos: 17 * 60 })!.entrega).toBe("2026-09-30");
    const tarde = proximoPedido(ceasa, { data: "2026-09-29", minutos: 18 * 60 + 1 })!;
    expect(tarde).toMatchObject({ entrega: "2026-10-02", prazoData: "2026-10-01" });
  });

  it("pedido no próprio dia (antecedência 0) e sem horário limite", () => {
    const padaria: AgendaFornecedor = { empresa: "Padaria", categorias: ["secos"], diasEntrega: [2], pedidoAte: "07:30", antecedencia: 0 };
    expect(proximoPedido(padaria, { data: "2026-09-29", minutos: 7 * 60 })).toMatchObject({ entrega: "2026-09-29", prazoData: "2026-09-29", prazoHora: "07:30" });
    expect(frasePrazo(proximoPedido(padaria, { data: "2026-09-29", minutos: 7 * 60 })!, { data: "2026-09-29", minutos: 7 * 60 })).toBe("Peça até hoje às 7h30 pra chegar hoje.");
    expect(proximoPedido(padaria, { data: "2026-09-29", minutos: 8 * 60 })!.entrega).toBe("2026-10-06");
    const livre = { ...padaria, pedidoAte: null };
    const p = proximoPedido(livre, { data: "2026-09-29", minutos: 23 * 60 })!;
    expect(p.entrega).toBe("2026-09-29");
    expect(frasePrazo(p, { data: "2026-09-29", minutos: 23 * 60 })).toBe("Peça até hoje pra chegar hoje.");
  });

  it("fornecedor sem dia de entrega não entra; categoria ordena pelo prazo mais perto", () => {
    expect(proximoPedido({ ...ceasa, diasEntrega: [] }, { data: "2026-09-28", minutos: 0 })).toBeNull();
    const feira: AgendaFornecedor = { empresa: "Feira", categorias: ["hortifruti"], diasEntrega: [2], pedidoAte: "10:00", antecedencia: 0 };
    const lista = pedidosDaCategoria([ceasa, feira, { ...ceasa, empresa: "Frigo", categorias: ["proteinas"] }], "hortifruti", { data: "2026-09-28", minutos: 9 * 60 });
    expect(lista.map((p) => p.empresa)).toEqual(["Feira", "Ceasa do Zé"]);
  });

  it("relógio do restaurante é o de São Paulo, não o do servidor", () => {
    expect(agoraNoRestaurante(new Date("2026-09-29T02:30:00Z"))).toEqual({ data: "2026-09-28", minutos: 23 * 60 + 30 });
  });
});

describe("pedido", () => {
  it("categoria vem do insumo", () => {
    expect(categoriaDoInsumo("hortalica")).toBe("hortifruti");
    expect(categoriaDoInsumo("fruta")).toBe("hortifruti");
    expect(categoriaDoInsumo("proteina")).toBe("proteinas");
    expect(categoriaDoInsumo("embalagem")).toBe("outros");
  });
  it("valida o essencial", () => {
    const base = { categoria: "hortifruti" as const, insumoId: null, descricao: "Coentro", quantidade: 3, unidade: "maço" as const, observacao: null };
    expect(validarRequisicao(base)).toBeNull();
    expect(validarRequisicao({ ...base, descricao: "  " })).toMatch(/Diga o que precisa/);
    expect(validarRequisicao({ ...base, unidade: null })).toMatch(/unidade/);
    expect(validarRequisicao({ ...base, quantidade: null, unidade: null })).toBeNull();
    expect(validarRequisicao({ ...base, quantidade: -1 })).toMatch(/Quantidade/);
  });
});
