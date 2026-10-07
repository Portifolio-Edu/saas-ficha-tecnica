import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), dados: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ criarClienteAdmin: mocks.admin }));
vi.mock("@/lib/dados/configuracoes", () => ({ getConfiguracoes: mocks.dados }));
import { iniciarAssinatura, processarEventoAssinatura } from "./servico";
import type { ClienteAtual } from "@/lib/dados/cliente";
import type { ConfigAsaas } from "./asaas";

const config: ConfigAsaas = { ambiente: "sandbox", chave: "$aact_hmlg_teste", token: "t".repeat(40), valorCentavos: 9900 };
const registro = { id: "f7a00000-1111-0000-0000-000000000001", cliente_id: "tenant", ambiente: "sandbox", valor_centavos: 9900, customer_id: "cus_1", subscription_id: "sub_1", estado: "pendente", fatura_url: null };
const cliente: ClienteAtual = { id: "tenant", userId: "user", papel: "dono", nome: "Edu", nomeMembro: "Edu", nomeRestaurante: "Casa", margemAlvo: 0.7, logoUrl: null, corDestaque: null };
const assinatura = { id: "sub_1", customer: "cus_1", externalReference: registro.id, value: 99, cycle: "MONTHLY", status: "ACTIVE" };
let respostas: { data: unknown; error: unknown }[];
let rpc: ReturnType<typeof vi.fn>;
let transporte: ReturnType<typeof vi.fn<typeof fetch>>;

beforeEach(() => {
  vi.resetAllMocks(); respostas = []; rpc = vi.fn().mockResolvedValue({ error: null });
  mocks.admin.mockImplementation(() => ({
    rpc,
    from: () => {
      const consulta: Record<string, unknown> = {};
      for (const metodo of ["select", "eq", "order", "limit", "insert", "update", "single", "maybeSingle"]) consulta[metodo] = () => consulta;
      consulta.then = (resolve: (r: unknown) => void) => resolve(respostas.shift() ?? { data: null, error: null });
      return consulta;
    },
  }));
  transporte = vi.fn<typeof fetch>(); vi.stubGlobal("fetch", transporte);
  mocks.dados.mockResolvedValue({ empresa: { cnpj: "11222333000181", razaoSocial: "Casa" }, conta: { email: "dono@exemplo.invalid" } });
});

describe("orquestração da assinatura", () => {
  it("não repete criação com solicitação já reservada", async () => {
    respostas.push({ data: { ...registro, estado: "criando" }, error: null });
    await expect(iniciarAssinatura(cliente, config)).rejects.toThrow("Já existe");
    expect(transporte).not.toHaveBeenCalled();
  });
  it("reserva antes do POST e mantém a reserva quando o provedor falha", async () => {
    respostas.push({ data: null, error: null }, { data: { ...registro, customer_id: null, subscription_id: null }, error: null });
    transporte.mockRejectedValue(new Error("timeout"));
    await expect(iniciarAssinatura(cliente, config)).rejects.toThrow("Não foi possível confirmar");
    expect(respostas).toHaveLength(0);
    expect(transporte).toHaveBeenCalledTimes(1);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("ignora estado financeiro adulterado do webhook e consulta o Asaas", async () => {
    respostas.push({ data: null, error: null }, { data: { id: registro.id }, error: null }, { data: registro, error: null });
    transporte.mockResolvedValueOnce(new Response(JSON.stringify({ data: [assinatura], hasMore: false })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: "pay_1", subscription: "sub_1", customer: "cus_1", status: "PENDING", dueDate: "2000-01-01", value: 99 }], hasMore: false })));
    await processarEventoAssinatura(config, { id: "evt_1", event: "PAYMENT_RECEIVED", payment: { subscription: "sub_1" } });
    expect(rpc).toHaveBeenCalledWith("conciliar_assinatura_saas", expect.objectContaining({ p_estado: "pendente", p_id: registro.id, p_evento: "evt_1" }));
  });
  it("repetição já concluída não gera outra consulta financeira", async () => {
    respostas.push({ data: { evento_id: "evt_1" }, error: null });
    await processarEventoAssinatura(config, { id: "evt_1", event: "PAYMENT_RECEIVED", payment: { subscription: "sub_1" } });
    expect(transporte).not.toHaveBeenCalled(); expect(rpc).not.toHaveBeenCalled();
  });
});
