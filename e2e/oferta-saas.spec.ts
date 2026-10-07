// PostgREST e transações REAIS no Supabase local; nenhum POST ao Asaas.
import { test, expect } from "@playwright/test";
import { admin, RODADA } from "./apoio";
const contas: { id: string; userId: string }[] = [];
const registro = (data: unknown) => (Array.isArray(data) ? data[0] : data) as { id: string; valor_centavos: number; primeiro_vencimento: string };

test.describe.serial("oferta comercial no banco local", () => {
  test.beforeAll(async () => {
    for (let n = 0; n < 12; n++) {
      const { data, error } = await admin().auth.admin.createUser({ email: `oferta.${RODADA}.${n}@exemplo.com`, password: "oferta-senha-123", email_confirm: true });
      expect(error).toBeNull();
      const { data: c, error: erro } = await admin().from("clientes").insert({ user_id: data.user!.id, nome: "Oferta", nome_restaurante: "Oferta local", telefone: `55119${String(Date.now() + n).slice(-8)}` }).select("id").single();
      expect(erro).toBeNull(); contas.push({ id: c!.id, userId: data.user!.id });
    }
  });
  test.afterAll(async () => {
    for (const c of contas) {
      const { data } = await admin().from("assinaturas_saas").select("id").eq("cliente_id", c.id);
      if (data?.length) {
        // Apenas registros sintéticos do teste, sem vínculo financeiro externo.
        expect((await admin().from("vagas_fundadores_saas").delete().in("assinatura_id", data.map(a => a.id))).error).toBeNull();
        expect((await admin().from("assinaturas_saas").update({ estado: "cancelada" }).eq("cliente_id", c.id)).error).toBeNull();
      }
      expect((await admin().from("clientes").delete().eq("id", c.id)).error).toBeNull();
      expect((await admin().auth.admin.deleteUser(c.userId)).error).toBeNull();
    }
  });
  test("cadastro inicia sete dias e quote informa vencimento depois do teste", async () => {
    const { data, error } = await admin().from("testes_saas").select("inicia_em,termina_em").eq("cliente_id", contas[0].id).single();
    expect(error).toBeNull();
    expect(Date.parse(data!.termina_em) - Date.parse(data!.inicia_em)).toBe(7 * 86400000);
    const oferta = await admin().rpc("consultar_oferta_saas", { p_cliente: contas[0].id, p_ambiente: "sandbox" });
    expect(oferta.error).toBeNull(); expect(oferta.data).toHaveLength(1);
    expect(oferta.data[0].valor_centavos).toBe(19700);
    expect(Date.parse(`${oferta.data[0].primeiro_vencimento}T00:00:00-03:00`)).toBeGreaterThan(Date.parse(data!.termina_em));
  });
  test("doze solicitações simultâneas reservam apenas dez ofertas de fundador", async () => {
    const respostas = await Promise.all(contas.map(c => admin().rpc("reservar_assinatura_saas", { p_cliente: c.id, p_ambiente: "sandbox", p_valor_aceito: 19700 })));
    expect(respostas.filter(r => !r.error)).toHaveLength(10);
    expect(respostas.filter(r => r.error)).toHaveLength(2);
    for (let n = 0; n < respostas.length; n++) {
      if (!respostas[n].error) { expect(Number(registro(respostas[n].data).valor_centavos)).toBe(19700); continue; }
      const { data, error } = await admin().rpc("reservar_assinatura_saas", { p_cliente: contas[n].id, p_ambiente: "sandbox", p_valor_aceito: 29700 });
      expect(error).toBeNull(); expect(Number(registro(data).valor_centavos)).toBe(29700);
    }
    const { count } = await admin().from("vagas_fundadores_saas").select("numero", { count: "exact", head: true }).eq("ambiente", "sandbox");
    expect(count).toBe(10);
    const outra = await admin().rpc("consultar_oferta_saas", { p_cliente: contas[0].id, p_ambiente: "producao" });
    expect(outra.error).toBeNull(); expect(outra.data[0].vagas_disponiveis).toBe(10);
  });
  test("somente pagamento confirma fundador; sandbox mantém restaurante em teste", async () => {
    const { data, error } = await admin().from("assinaturas_saas").select("id,cliente_id,fundador_confirmado").eq("ambiente", "sandbox").eq("valor_centavos", 19700).in("cliente_id", contas.map(c => c.id)).limit(1).single();
    expect(error).toBeNull(); expect(data!.fundador_confirmado).toBe(false);
    const resposta = await admin().rpc("conciliar_oferta_saas", { p_id: data!.id, p_subscription: "sub_oferta_local", p_customer: "cus_oferta_local", p_estado: "pendente", p_fatura_url: null, p_inicio: new Date().toISOString(), p_evento: `evt_oferta_${RODADA}`, p_pagamento_confirmado: true });
    expect(resposta.error).toBeNull();
    const atual = await admin().from("assinaturas_saas").select("fundador_confirmado,estado").eq("id", data!.id).single();
    expect(atual.data).toMatchObject({ fundador_confirmado: true, estado: "pendente" });
    const cliente = await admin().from("clientes").select("status_assinatura").eq("id", data!.cliente_id).single();
    expect(cliente.data!.status_assinatura).toBe("trial");
  });
});
