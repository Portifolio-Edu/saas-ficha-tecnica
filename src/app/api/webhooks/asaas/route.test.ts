import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ config: vi.fn(), evento: vi.fn() }));
vi.mock("@/lib/assinatura/asaas", async importar => ({ ...await importar<object>(), configAsaas: mocks.config }));
vi.mock("@/lib/assinatura/servico", () => ({ processarEventoAssinatura: mocks.evento }));
import { POST } from "./route";
const token = "t".repeat(40);
const req = (corpo: string, segredo = token) => new NextRequest("https://ficha.test/api/webhooks/asaas", { method: "POST", headers: { "asaas-access-token": segredo }, body: corpo });
beforeEach(() => { vi.resetAllMocks(); mocks.config.mockReturnValue({ token, ambiente: "sandbox" }); });
describe("webhook de cobrança", () => {
  it("valida segredo antes de ler ou processar evento", async () => {
    expect((await POST(req("{}", "errado"))).status).toBe(401);
    expect(mocks.evento).not.toHaveBeenCalled();
  });
  it("rejeita JSON inválido e corpo grande", async () => {
    expect((await POST(req("x"))).status).toBe(400);
    expect((await POST(req("x".repeat(100_001)))).status).toBe(413);
    expect(mocks.evento).not.toHaveBeenCalled();
  });
  it("falha transitória solicita reentrega sem expor payload", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.evento.mockRejectedValue(new Error("DADO SENSIVEL"));
    const resposta = await POST(req(JSON.stringify({ id: "evt_1", event: "PAYMENT_RECEIVED" })));
    expect(resposta.status).toBe(503);
    expect(JSON.stringify(await resposta.json())).not.toContain("DADO SENSIVEL");
    log.mockRestore();
  });
});
