import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ cliente: vi.fn(), client: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), revalidar: vi.fn() }));
vi.mock("@/lib/dados/cliente", () => ({ getClienteAtual: mocks.cliente }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidar }));
import { acaoSalvarPermissaoCompras } from "./actions";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.cliente.mockResolvedValue({ id: "casa-da-sessao", papel: "gestor" });
  mocks.client.mockResolvedValue({ from: () => ({ update: mocks.update }) });
  mocks.update.mockReturnValue({ eq: mocks.eq }); mocks.eq.mockReturnValue({ select: mocks.select });
  mocks.select.mockResolvedValue({ data: [{ id: "casa-da-sessao" }], error: null });
});
it("estoquista, cozinha e sessão expirada não alteram a delegação", async () => {
  for (const cliente of [null, { papel: "estoquista" }, { papel: "cozinha" }]) {
    mocks.cliente.mockResolvedValue(cliente);
    expect((await acaoSalvarPermissaoCompras({}, new FormData())).erro).toBeTruthy();
  }
  expect(mocks.client).not.toHaveBeenCalled();
});
it("gestor e dono concedem apenas para o restaurante da sessão", async () => {
  const form = new FormData(); form.set("estoquePodeAprovar", "on"); form.set("clienteId", "outro");
  for (const papel of ["gestor", "dono"]) {
    mocks.cliente.mockResolvedValue({ id: "casa-da-sessao", papel });
    expect((await acaoSalvarPermissaoCompras({}, form)).ok).toBeTruthy();
  }
  expect(mocks.eq).toHaveBeenCalledWith("id", "casa-da-sessao");
  expect(mocks.update).toHaveBeenCalledWith({ estoque_pode_aprovar_compras: true });
  expect(mocks.revalidar).toHaveBeenCalledWith("/estoque/compras");
});
it("desligar revoga a delegação", async () => {
  expect((await acaoSalvarPermissaoCompras({}, new FormData())).ok).toBeTruthy();
  expect(mocks.update).toHaveBeenCalledWith({ estoque_pode_aprovar_compras: false });
});
it("valor inválido não grava", async () => {
  const form = new FormData(); form.set("estoquePodeAprovar", "permitir-sem-validacao");
  expect((await acaoSalvarPermissaoCompras({}, form)).erro).toBeTruthy(); expect(mocks.client).not.toHaveBeenCalled();
});
it("erro ou atualização sem linha não anuncia sucesso", async () => {
  for (const resultado of [{ data: null, error: { message: "Negado" } }, { data: [], error: null }]) {
    mocks.select.mockResolvedValue(resultado);
    expect((await acaoSalvarPermissaoCompras({}, new FormData())).erro).toBeTruthy();
  }
  expect(mocks.revalidar).not.toHaveBeenCalled();
});
