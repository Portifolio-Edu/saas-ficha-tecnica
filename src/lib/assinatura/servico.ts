import type { ClienteAtual } from "@/lib/dados/cliente";
import { getConfiguracoes } from "@/lib/dados/configuracoes";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { cnpjValido } from "@/lib/empresa/empresa";
import { ClienteAsaas, configAsaas, resumoAssinatura, type ConfigAsaas, type AssinaturaAsaas } from "./asaas";
import { OFERTA_SAAS, type OfertaSaas } from "./oferta";

interface Registro { id: string; cliente_id: string; ambiente: string; valor_centavos: number; customer_id: string | null; subscription_id: string | null; estado: string; fatura_url: string | null; primeiro_vencimento: string; fundador_confirmado?: boolean }
const COLUNAS = "id, cliente_id, ambiente, valor_centavos, customer_id, subscription_id, estado, fatura_url, primeiro_vencimento, fundador_confirmado";
const erroBanco = () => new Error("Não foi possível consultar a assinatura. Fale com o suporte.");

export async function lerAssinatura(clienteId: string, config: ConfigAsaas): Promise<Registro | null> {
  const { data, error } = await criarClienteAdmin().from("assinaturas_saas").select(COLUNAS).eq("cliente_id", clienteId).eq("ambiente", config.ambiente).order("criado_em", { ascending: false }).limit(1).maybeSingle();
  if (error) throw erroBanco();
  return data as Registro | null;
}

export async function consultarOferta(clienteId: string, config: ConfigAsaas): Promise<OfertaSaas> {
  const { data, error } = await criarClienteAdmin().rpc("consultar_oferta_saas", { p_cliente: clienteId, p_ambiente: config.ambiente });
  if (error || !Array.isArray(data) || !data[0]) throw erroBanco();
  return data[0] as OfertaSaas;
}

async function conciliar(config: ConfigAsaas, registro: Registro, assinatura: AssinaturaAsaas, inicio: string, evento: string | null = null) {
  if (assinatura.externalReference !== registro.id || (registro.customer_id && assinatura.customer !== registro.customer_id) || assinatura.cycle !== "MONTHLY" || Math.round(assinatura.value * 100) !== Number(registro.valor_centavos)) {
    throw new Error("A cobrança precisa ser conferida pelo suporte.");
  }
  const api = new ClienteAsaas(config);
  const pagamentos = assinatura.deleted && Number(registro.valor_centavos) !== OFERTA_SAAS.fundadorCentavos ? [] : await api.listarPagamentos(assinatura.id);
  const resumo = resumoAssinatura(assinatura, pagamentos);
  const { error } = await criarClienteAdmin().rpc("conciliar_oferta_saas", {
    p_id: registro.id, p_subscription: assinatura.id, p_customer: assinatura.customer,
    p_estado: resumo.estado, p_fatura_url: resumo.faturaUrl, p_inicio: inicio, p_evento: evento,
    p_pagamento_confirmado: pagamentos.some(p => !p.deleted && p.subscription === assinatura.id && p.customer === assinatura.customer && Math.round(p.value * 100) === Number(registro.valor_centavos) && ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(p.status)),
  });
  if (error) throw erroBanco();
  return resumo;
}

export async function iniciarAssinatura(cliente: ClienteAtual, config: ConfigAsaas, valorAceitoCentavos: number) {
  const atual = await lerAssinatura(cliente.id, config);
  if (atual && atual.estado !== "cancelada") throw new Error("Já existe uma solicitação. Use Atualizar situação para conferir, sem criar outra cobrança.");
  const dados = await getConfiguracoes(cliente);
  if (!dados.empresa.cnpj || !cnpjValido(dados.empresa.cnpj) || !dados.empresa.razaoSocial || !dados.conta.email) {
    throw new Error("Preencha razão social e CNPJ em Restaurante e confirme o e-mail da sua conta antes de assinar.");
  }
  // A reserva única é gravada ANTES de qualquer POST financeiro. Mesmo um timeout
  // não permite repetir a criação; recuperação usa GET por externalReference.
  const { data, error } = await criarClienteAdmin().rpc("reservar_assinatura_saas", {
    p_cliente: cliente.id, p_ambiente: config.ambiente, p_valor_aceito: valorAceitoCentavos,
  });
  if (error || !data) throw new Error("A oferta mudou ou já existe uma solicitação. Reabra Plano e atualize a situação antes de assinar.");
  const registro = (Array.isArray(data) && data.length === 1 ? data[0] : data) as Registro;
  if (!registro.id || registro.cliente_id !== cliente.id || registro.ambiente !== config.ambiente || Number(registro.valor_centavos) !== valorAceitoCentavos || !/^\d{4}-\d{2}-\d{2}$/.test(registro.primeiro_vencimento ?? "")) throw erroBanco();
  const api = new ClienteAsaas(config);
  const pagador = await api.criarCliente({ name: dados.empresa.razaoSocial, cpfCnpj: dados.empresa.cnpj, email: dados.conta.email, externalReference: registro.id });
  if (!pagador.id?.startsWith("cus_")) throw new Error("Resposta de cobrança inválida.");
  const gravacao = await criarClienteAdmin().from("assinaturas_saas").update({ customer_id: pagador.id }).eq("id", registro.id);
  if (gravacao.error) throw erroBanco();
  registro.customer_id = pagador.id;
  const inicio = new Date().toISOString();
  const assinatura = await api.criarAssinatura(pagador.id, registro.id, Number(registro.valor_centavos), registro.primeiro_vencimento);
  return conciliar(config, registro, assinatura, inicio);
}

export async function atualizarAssinatura(clienteId: string, config: ConfigAsaas, cancelar = false) {
  const registro = await lerAssinatura(clienteId, config);
  if (!registro) return null;
  const api = new ClienteAsaas(config);
  const inicio = new Date().toISOString();
  const assinaturaEncontrada = await localizarAssinatura(api, registro.id);
  const assinatura = assinaturaEncontrada;
  // Confere o vínculo antes de DELETE; webhook e resposta canônica usam o mesmo validador.
  if (assinatura.externalReference !== registro.id || (registro.customer_id && assinatura.customer !== registro.customer_id)) throw new Error("Vínculo de cobrança inválido.");
  if (cancelar && !assinatura.deleted) {
    const resultado = await api.cancelarAssinatura(assinatura.id);
    if (!resultado.deleted) throw new Error("Cancelamento ainda não confirmado. Atualize a situação.");
    assinatura.deleted = true;
  }
  await conciliar(config, registro, assinatura, inicio);
  return lerAssinatura(clienteId, config);
}

export async function processarEventoAssinatura(config: ConfigAsaas, evento: { id: string; event: string; subscription?: { id?: string }; payment?: { subscription?: string } }) {
  const id = evento.subscription?.id ?? evento.payment?.subscription;
  if (!id || !id.startsWith("sub_")) return;
  const inicio = new Date().toISOString();
  // O payload sinaliza qual recurso consultar; seu estado/valor nunca é usado
  // para dar plano pago. GET autenticado obtém o estado atual do próprio Asaas.
  const api = new ClienteAsaas(config);
  const admin = criarClienteAdmin();
  const repetido = await admin.from("eventos_assinatura_saas").select("evento_id").eq("ambiente", config.ambiente).eq("evento_id", evento.id).maybeSingle();
  if (repetido.error) throw erroBanco();
  if (repetido.data) return;
  const vinculo = await admin.from("assinaturas_saas").select("id").eq("subscription_id", id).eq("ambiente", config.ambiente).maybeSingle();
  if (vinculo.error) throw erroBanco();
  const assinatura = vinculo.data ? await localizarAssinatura(api, vinculo.data.id) : await api.recuperarAssinatura(id);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assinatura.externalReference ?? "")) return;
  const { data, error } = await criarClienteAdmin().from("assinaturas_saas").select(COLUNAS).eq("id", assinatura.externalReference).eq("ambiente", config.ambiente).maybeSingle();
  if (error) throw erroBanco();
  if (!data) return; // Assinaturas de outros produtos da mesma conta não são nossas.
  await conciliar(config, data as Registro, assinatura, inicio, evento.id);
}

async function localizarAssinatura(api: ClienteAsaas, referencia: string): Promise<AssinaturaAsaas> {
  const resposta = await api.chamar<{ data: AssinaturaAsaas[]; hasMore: boolean }>(`/subscriptions?externalReference=${encodeURIComponent(referencia)}&includeDeleted=true&limit=100`);
  if (!Array.isArray(resposta.data) || resposta.hasMore || resposta.data.length !== 1) throw new Error("Solicitação ainda não confirmada. O suporte deve conciliar a referência antes de tentar novamente.");
  return resposta.data[0];
}

export function exigirCobranca() {
  const config = configAsaas();
  if (!config) throw new Error("A assinatura online ainda não está disponível. Fale com o suporte.");
  return config;
}
