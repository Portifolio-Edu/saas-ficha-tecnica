import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ cliente: vi.fn(), config: vi.fn(), iniciar: vi.fn(), atualizar: vi.fn(), ler: vi.fn(), oferta: vi.fn() }));
vi.mock("@/lib/dados/cliente", () => ({ getClienteAtual: mocks.cliente }));
vi.mock("@/lib/assinatura/asaas", () => ({ configAsaas: mocks.config }));
vi.mock("@/lib/assinatura/servico", () => ({ exigirCobranca: mocks.config, iniciarAssinatura: mocks.iniciar, atualizarAssinatura: mocks.atualizar, lerAssinatura: mocks.ler, consultarOferta: mocks.oferta }));
import { GET, POST } from "./route";
const req = (corpo: object, origin = "https://ficha.test") => new NextRequest("https://ficha.test/api/assinatura", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(corpo) });

beforeEach(() => { vi.resetAllMocks(); mocks.cliente.mockResolvedValue({ id: "tenant-da-sessao", papel: "dono" }); mocks.config.mockReturnValue({ ambiente: "sandbox", valorCentavos: 9900 }); mocks.ler.mockResolvedValue(null); mocks.oferta.mockResolvedValue({ valor_centavos: 19700 }); });
describe("acesso à assinatura", () => {
  it("bloqueia sem login e todos os papéis da equipe", async () => {
    mocks.cliente.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await POST(req({ acao: "assinar" }))).status).toBe(401);
    for (const papel of ["gestor", "estoquista", "cozinha"]) {
      mocks.cliente.mockResolvedValue({ id: "a", papel });
      expect((await GET()).status).toBe(403);
      expect((await POST(req({ acao: "assinar" }))).status).toBe(403);
    }
    expect(mocks.iniciar).not.toHaveBeenCalled();
  });
  it("bloqueia outra origem e cancelamento sem confirmação", async () => {
    expect((await POST(req({ acao: "assinar" }, "https://outro.test"))).status).toBe(403);
    expect((await POST(req({ acao: "cancelar" }))).status).toBe(400);
    expect(mocks.atualizar).not.toHaveBeenCalled();
  });
  it("usa o restaurante da sessão mesmo se o cliente enviar outro e outro preço", async () => {
    expect((await POST(req({ acao: "cancelar", confirmar: true, clienteId: "outro", valor: 1 }))).status).toBe(200);
    expect(mocks.atualizar).toHaveBeenCalledWith("tenant-da-sessao", mocks.config(), true);
  });
  it("não consulta tabela nova com cobrança desligada", async () => {
    mocks.config.mockReturnValue(null);
    expect(await (await GET()).json()).toEqual({ disponivel: false });
    expect(mocks.ler).not.toHaveBeenCalled();
  });
  it("não cria cobrança com preço inválido; preço aceito vai à reserva atômica", async () => {
    expect((await POST(req({ acao: "assinar", valorAceitoCentavos: "19700" }))).status).toBe(409);
    expect(mocks.iniciar).not.toHaveBeenCalled();
    expect((await POST(req({ acao: "assinar", valorAceitoCentavos: 9900 }))).status).toBe(200);
    expect(mocks.iniciar).toHaveBeenCalledWith({ id: "tenant-da-sessao", papel: "dono" }, mocks.config(), 9900);
  });
});
