import { describe, expect, it, vi } from "vitest";
import { ClienteAsaas, configAsaas, diaDaCobranca, resumoAssinatura, tokenWebhookValido, urlFaturaSegura, type AssinaturaAsaas, type PagamentoAsaas } from "./asaas";

const env = { ASAAS_COBRANCA_HABILITADA: "true", ASAAS_AMBIENTE: "sandbox", ASAAS_API_KEY: "$aact_hmlg_teste", ASAAS_WEBHOOK_TOKEN: "t".repeat(40), ASAAS_PLANO_MENSAL_CENTAVOS: "9900" };
const assinatura: AssinaturaAsaas = { id: "sub_1", customer: "cus_1", externalReference: "referencia", value: 99, cycle: "MONTHLY", status: "ACTIVE" };
const pagamento: PagamentoAsaas = { id: "pay_1", subscription: "sub_1", customer: "cus_1", value: 99, dueDate: "2026-10-01", status: "RECEIVED" };

describe("configuração da cobrança", () => {
  it("fica desligada por padrão e exige valor, segredo e ambiente compatíveis", () => {
    expect(configAsaas({})).toBeNull();
    expect(configAsaas(env)?.valorCentavos).toBe(9900);
    for (const valor of ["", "0", "99.90", "-10", "999999999999999999999"]) expect(() => configAsaas({ ...env, ASAAS_PLANO_MENSAL_CENTAVOS: valor })).toThrow();
    expect(() => configAsaas({ ...env, ASAAS_AMBIENTE: "producao" })).toThrow();
    expect(() => configAsaas({ ...env, ASAAS_WEBHOOK_TOKEN: env.ASAAS_API_KEY })).toThrow();
    expect(() => configAsaas({ ...env, ASAAS_AMBIENTE: "producao", ASAAS_API_KEY: "$aact_prod_teste", VERCEL_ENV: "preview" })).toThrow();
  });
  it("autentica webhook e rejeita links externos ou credenciais na URL", () => {
    expect(tokenWebhookValido("t".repeat(40), env.ASAAS_WEBHOOK_TOKEN)).toBe(true);
    expect(tokenWebhookValido(null, env.ASAAS_WEBHOOK_TOKEN)).toBe(false);
    expect(tokenWebhookValido("x".repeat(40), env.ASAAS_WEBHOOK_TOKEN)).toBe(false);
    expect(urlFaturaSegura("https://www.asaas.com/i/123")).toBeTruthy();
    for (const url of ["http://asaas.com/i/1", "https://asaas.com.evil.test/i/1", "https://evilasaas.com/i/1", "javascript:alert(1)", "https://user:pass@asaas.com/i/1"]) expect(urlFaturaSegura(url)).toBeNull();
  });
});

describe("conciliação financeira", () => {
  it("criar assinatura, autorizar cartão ou receber callback não confirma pagamento", () => {
    expect(resumoAssinatura(assinatura, [], "2026-10-07").estado).toBe("pendente");
    expect(resumoAssinatura(assinatura, [{ ...pagamento, status: "AUTHORIZED" }], "2026-10-07").estado).toBe("pendente");
  });
  it("usa o ciclo atual e ignora cobranças de outro restaurante", () => {
    const atrasado = { ...pagamento, id: "pay_2", dueDate: "2026-11-01", status: "OVERDUE" };
    expect(resumoAssinatura(assinatura, [pagamento, atrasado], "2026-11-07").estado).toBe("atrasada");
    expect(resumoAssinatura(assinatura, [atrasado, pagamento], "2026-11-07").estado).toBe("atrasada");
    expect(resumoAssinatura(assinatura, [{ ...pagamento, customer: "cus_outro" }], "2026-10-07").estado).toBe("pendente");
  });
  it("fatura futura não rebaixa ciclo pago; estorno e cancelamento não continuam ativos", () => {
    const futura = { ...pagamento, id: "pay_2", dueDate: "2026-11-01", status: "PENDING", invoiceUrl: "https://asaas.com/i/2" };
    expect(resumoAssinatura(assinatura, [pagamento, futura], "2026-10-07")).toEqual({ estado: "ativa", faturaUrl: "https://asaas.com/i/2" });
    expect(resumoAssinatura(assinatura, [{ ...pagamento, status: "REFUNDED" }], "2026-10-07").estado).toBe("pendente");
    expect(resumoAssinatura({ ...assinatura, deleted: true }, [pagamento], "2026-10-07")).toEqual({ estado: "cancelada", faturaUrl: null });
  });
  it("usa o dia do Brasil perto da virada UTC", () => {
    expect(diaDaCobranca(new Date("2026-10-08T01:00:00Z"))).toBe("2026-10-07");
  });
});

describe("adaptador Asaas", () => {
  it("manda valor do servidor e referência, sem dados de cartão", async () => {
    const transporte = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(assinatura)));
    await new ClienteAsaas(configAsaas(env)!, transporte).criarAssinatura("cus_1", "referencia");
    const [url, opcoes] = transporte.mock.calls[0];
    expect(url).toBe("https://api-sandbox.asaas.com/v3/subscriptions");
    expect(opcoes?.headers).toHaveProperty("access_token", env.ASAAS_API_KEY);
    expect(JSON.parse(String(opcoes?.body))).toMatchObject({ value: 99, cycle: "MONTHLY", billingType: "UNDEFINED", customer: "cus_1", externalReference: "referencia" });
    expect(String(opcoes?.body)).not.toContain("creditCard");
  });
  it("não repete POST após resposta incerta nem expõe erro bruto do provedor", async () => {
    const transporte = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ errors: [{ description: "DADO SENSIVEL" }] }), { status: 500 }));
    await expect(new ClienteAsaas(configAsaas(env)!, transporte).criarAssinatura("cus_1", "ref")).rejects.toThrow("Não foi possível confirmar");
    expect(transporte).toHaveBeenCalledTimes(1);
  });
  it("percorre as páginas sem perder pagamentos mais antigos", async () => {
    const transporte = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [], hasMore: true })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [pagamento], hasMore: false })));
    expect(await new ClienteAsaas(configAsaas(env)!, transporte).listarPagamentos("sub_1")).toEqual([pagamento]);
    expect(String(transporte.mock.calls[1][0])).toContain("offset=100");
  });
});
