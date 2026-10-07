import { timingSafeEqual } from "node:crypto";
import { formatadorData } from "@/lib/formato";

export type AmbienteAsaas = "sandbox" | "producao";
export interface ConfigAsaas { ambiente: AmbienteAsaas; chave: string; token: string; valorCentavos: number }

export function configAsaas(env: Readonly<Record<string, string | undefined>> = process.env): ConfigAsaas | null {
  if (env.ASAAS_COBRANCA_HABILITADA !== "true") return null;
  const ambiente = env.ASAAS_AMBIENTE;
  const chave = env.ASAAS_API_KEY ?? "";
  const token = env.ASAAS_WEBHOOK_TOKEN ?? "";
  const valor = env.ASAAS_PLANO_MENSAL_CENTAVOS ?? "";
  if ((ambiente !== "sandbox" && ambiente !== "producao") || !/^\d+$/.test(valor) || !Number.isSafeInteger(Number(valor)) || Number(valor) <= 0 || token.length < 32 || token.length > 255 || /\s/.test(token) || token === chave) {
    throw new Error("Configuração da assinatura incompleta. Fale com o suporte.");
  }
  if (!chave.startsWith(ambiente === "sandbox" ? "$aact_hmlg_" : "$aact_prod_")) throw new Error("Chave de cobrança incompatível com o ambiente.");
  if (ambiente === "producao" && env.VERCEL_ENV && env.VERCEL_ENV !== "production") throw new Error("Cobrança real não pode ser habilitada em prévias.");
  return { ambiente, chave, token, valorCentavos: Number(valor) };
}

export function tokenWebhookValido(recebido: string | null, esperado: string): boolean {
  const a = Buffer.from(recebido ?? "");
  const b = Buffer.from(esperado);
  return b.length >= 32 && a.length === b.length && timingSafeEqual(a, b);
}

export function urlFaturaSegura(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  try {
    const u = new URL(valor);
    return u.protocol === "https:" && !u.username && !u.password && (u.hostname === "asaas.com" || u.hostname.endsWith(".asaas.com")) ? u.href : null;
  } catch { return null; }
}

export interface AssinaturaAsaas { id: string; customer: string; externalReference: string; status: string; deleted?: boolean; value: number; cycle: string }
export interface PagamentoAsaas { id: string; subscription: string; customer: string; status: string; dueDate: string; invoiceUrl?: string; value: number; deleted?: boolean }
export type EstadoAssinatura = "pendente" | "ativa" | "atrasada" | "cancelada";

export function diaDaCobranca(data = new Date()): string {
  return formatadorData({ timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }, "en-CA").format(data);
}

/** Estado atual, sem confiar na ordem nem no conteúdo financeiro dos webhooks. */
export function resumoAssinatura(assinatura: AssinaturaAsaas, pagamentos: PagamentoAsaas[], hoje = diaDaCobranca()): { estado: EstadoAssinatura; faturaUrl: string | null } {
  if (assinatura.deleted || assinatura.status !== "ACTIVE") return { estado: "cancelada", faturaUrl: null };
  const validos = pagamentos.filter(p => !p.deleted && p.subscription === assinatura.id && p.customer === assinatura.customer);
  const vencidos = validos.filter(p => p.dueDate <= hoje).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  const ultimo = vencidos[0];
  const pago = (p: PagamentoAsaas) => ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(p.status);
  // Uma nova fatura pendente não apaga um pagamento confirmado do mesmo ciclo.
  const estado: EstadoAssinatura = ultimo && vencidos.some(p => p.dueDate === ultimo.dueDate && pago(p)) ? "ativa"
    : ultimo?.status === "OVERDUE" ? "atrasada" : "pendente";
  const pendente = validos.filter(p => ["PENDING", "OVERDUE"].includes(p.status)).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  return { estado, faturaUrl: urlFaturaSegura(pendente?.invoiceUrl) };
}

export class ClienteAsaas {
  constructor(private config: ConfigAsaas, private transporte: typeof fetch = fetch) {}
  async chamar<T>(caminho: string, metodo = "GET", corpo?: unknown): Promise<T> {
    if (typeof window !== "undefined") throw new Error("Cobrança disponível apenas no servidor.");
    const origem = this.config.ambiente === "sandbox" ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3";
    try {
      const resposta = await this.transporte(`${origem}${caminho}`, {
        method: metodo, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20_000),
        headers: { "access_token": this.config.chave, "User-Agent": "FichaTecnica/1.0", "Content-Type": "application/json" },
        ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
      });
      if (!resposta.ok) throw new Error("Não foi possível confirmar a operação de cobrança. Atualize a situação ou fale com o suporte.");
      return await resposta.json() as T;
    } catch { throw new Error("Não foi possível confirmar a operação de cobrança. Atualize a situação ou fale com o suporte."); }
  }
  criarCliente(dados: { name: string; cpfCnpj: string; email: string; externalReference: string }) {
    return this.chamar<{ id: string }>("/customers", "POST", dados);
  }
  criarAssinatura(customer: string, referencia: string) {
    return this.chamar<AssinaturaAsaas>("/subscriptions", "POST", {
      customer, externalReference: referencia, billingType: "UNDEFINED", cycle: "MONTHLY",
      value: this.config.valorCentavos / 100, nextDueDate: diaDaCobranca(), description: "Ficha Técnica — plano mensal do restaurante",
    });
  }
  recuperarAssinatura(id: string) { return this.chamar<AssinaturaAsaas>(`/subscriptions/${encodeURIComponent(id)}`); }
  async listarPagamentos(id: string): Promise<PagamentoAsaas[]> {
    const pagamentos: PagamentoAsaas[] = [];
    for (let offset = 0; offset < 10_000; offset += 100) {
      const pagina = await this.chamar<{ data: PagamentoAsaas[]; hasMore: boolean }>(`/subscriptions/${encodeURIComponent(id)}/payments?limit=100&offset=${offset}`);
      if (!Array.isArray(pagina.data)) throw new Error("Resposta de cobrança inválida.");
      pagamentos.push(...pagina.data);
      if (!pagina.hasMore) return pagamentos;
    }
    throw new Error("É necessário conciliar esta assinatura pelo suporte.");
  }
  cancelarAssinatura(id: string) { return this.chamar<{ deleted: boolean }>(`/subscriptions/${encodeURIComponent(id)}`, "DELETE"); }
}
