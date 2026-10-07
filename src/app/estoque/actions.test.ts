import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ cliente: vi.fn(), resolver: vi.fn(), criar: vi.fn(), revalidar: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidar }));
vi.mock("@/lib/dados/cliente", () => ({ getClienteAtual: mocks.cliente }));
vi.mock("@/lib/dados/requisicoes", () => ({ resolverRequisicoes: mocks.resolver, criarRequisicao: mocks.criar }));
import { acaoResolverRequisicoes, acaoSolicitarCompra } from "./actions";
const id = "aa111111-0000-0000-0000-000000000001";
const pedido = { descricao: "Arroz", categoria: "secos" as const, insumoId: null, quantidade: 2.5, unidade: "kg" as const, observacao: null };
beforeEach(() => { vi.resetAllMocks(); mocks.cliente.mockResolvedValue({ id: "restaurante-da-sessao", userId: "user", nomeMembro: "Estoque", papel: "estoquista" }); mocks.resolver.mockResolvedValue(1); });
describe("requisição e aprovação de compras", () => {
  it("sem sessão não cria nem resolve compras", async () => {
    mocks.cliente.mockResolvedValue(null);
    expect((await acaoSolicitarCompra(pedido)).ok).toBe(false);
    expect((await acaoResolverRequisicoes([id], "aprovado")).ok).toBe(false);
    expect(mocks.criar).not.toHaveBeenCalled(); expect(mocks.resolver).not.toHaveBeenCalled();
  });
  it("estoquista não aprova nem rejeita, mesmo chamando a ação diretamente", async () => {
    for (const status of ["aprovado", "cancelado"] as const) expect((await acaoResolverRequisicoes([id], status)).ok).toBe(false);
    expect(mocks.resolver).not.toHaveBeenCalled();
  });
  it("gestor e dono podem enviar aprovação para o banco", async () => {
    for (const papel of ["gestor", "dono"]) {
      mocks.cliente.mockResolvedValue({ id: "a", papel });
      expect(await acaoResolverRequisicoes([id], "aprovado")).toEqual({ ok: true });
    }
    expect(mocks.resolver).toHaveBeenCalledWith([id], "aprovado");
    expect(mocks.revalidar).toHaveBeenCalledWith("/estoque/compras");
  });
  it("erro do banco ao comprar sem aprovação não vira sucesso na interface", async () => {
    mocks.resolver.mockRejectedValue(new Error("A compra precisa ser aprovada."));
    expect(await acaoResolverRequisicoes([id], "comprado")).toEqual({ ok: false, erro: "A compra precisa ser aprovada." });
    expect(mocks.revalidar).not.toHaveBeenCalled();
  });
  it("requisição usa restaurante e responsável da sessão", async () => {
    expect(await acaoSolicitarCompra({ ...pedido, ...{ clienteId: "outro", responsavel: "Dono falso" } })).toEqual({ ok: true });
    expect(mocks.criar).toHaveBeenCalledWith("restaurante-da-sessao", expect.objectContaining({ descricao: "Arroz", quantidade: 2.5 }), "Estoque");
  });
  it("cozinha solicita no tablet e não acessa as ações do setor de Compras", async () => {
    mocks.cliente.mockResolvedValue({ id: "a", papel: "cozinha" });
    expect((await acaoSolicitarCompra(pedido)).ok).toBe(false);
    expect((await acaoResolverRequisicoes([id], "comprado")).ok).toBe(false);
    expect(mocks.criar).not.toHaveBeenCalled(); expect(mocks.resolver).not.toHaveBeenCalled();
  });
  it("dados inválidos não chegam ao banco", async () => {
    expect((await acaoSolicitarCompra({ ...pedido, quantidade: -2 })).ok).toBe(false);
    expect((await acaoResolverRequisicoes([id], "pendente")).ok).toBe(false);
    expect((await acaoResolverRequisicoes(["outro-id"], "comprado")).ok).toBe(false);
    expect(mocks.criar).not.toHaveBeenCalled(); expect(mocks.resolver).not.toHaveBeenCalled();
  });
});
