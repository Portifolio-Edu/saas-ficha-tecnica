// AVISOS NO WHATSAPP (2026-10-02): o caminho que o n8n (workflow "FT —
// Avisos") faz: pede os pendentes com a chave, manda, conta o resultado.
// Confere: só dono/gestor com WhatsApp verificado recebe; outra casa não
// recebe nada; o mesmo aviso não sai duas vezes; falha volta pra fila.
// AVISOS PRA GESTÃO (2026-10-02): cenários do gestor (insumo, fornecedor,
// equipe, desperdício, vendas); item já avisado não volta, item novo vem só.
import { test, expect } from "@playwright/test";
import { RODADA, admin, entrar } from "./apoio";

const CHAVE = process.env.AGENTE_CHAVE_N8N ?? "";
const APP = "http://127.0.0.1:3000";

interface Pessoa { userId: string; telefone: string }
let clienteA = "";
let clienteB = "";
let dono: Pessoa;
let estoquista: Pessoa;
let donoB: Pessoa;

const telefone = (n: number) => `55119${String(Date.now() + n).slice(-8)}`;

async function pendentes(chave = CHAVE) {
  const r = await fetch(`${APP}/api/automacoes/pendentes`, { method: "POST", headers: { "x-ft-chave": chave } });
  return { status: r.status, corpo: (await r.json()) as { novos: number; avisos: { id: string; telefone: string; texto: string; tipo: string }[] } };
}
async function resultado(resultados: { id: string; ok: boolean; erro?: string }[]) {
  const r = await fetch(`${APP}/api/automacoes/resultado`, {
    method: "POST",
    headers: { "x-ft-chave": CHAVE, "content-type": "application/json" },
    body: JSON.stringify({ resultados }),
  });
  return r.status;
}
/** "HH:MM" no horário de Brasília, deslocado em minutos. */
function horaBrasilia(minutos: number): string {
  return new Date(Date.now() + minutos * 60_000).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}
/** Agora - 1 min (cai dentro da janela do aviso). */
const umMinutoAtras = () => horaBrasilia(-1);
const hojeBrasilia = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const somarDias = (data: string, n: number) => new Date(Date.parse(`${data}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
/** Perto da meia-noite o prazo do fornecedor e a janela caem no outro dia. */
const pertoDaMeiaNoite = () => Number(horaBrasilia(0).slice(0, 2)) >= 22;

const TIPOS_DA_GESTAO = ["checklist_abertura", "compras_prazo", "desperdicio", "equipe", "estoque_baixo", "preco_subiu", "rendimento_baixo", "resumo_diario", "vendas"];
let receita = "";
let perdas = 0;
async function perda(nome: string) {
  perdas += 1;
  const r = await admin()
    .from("producoes")
    .insert({ cliente_id: clienteA, lote: `AV-${RODADA}-${perdas}`, receita_id: receita, quantidade: 3, responsavel: "João", status: "perda", motivo_perda: nome })
    .select("id")
    .single();
  expect(r.error).toBeNull();
  return r.data!.id as string;
}

async function pessoa(email: string): Promise<string> {
  const u = await admin().auth.admin.createUser({ email, password: "avisos-senha-123", email_confirm: true });
  expect(u.error).toBeNull();
  return u.data.user!.id;
}

test.describe.serial("avisos no WhatsApp", () => {
  test.beforeAll(async () => {
    expect(CHAVE.length, "rode `source e2e/ambiente.sh`").toBeGreaterThanOrEqual(32);
    const idDono = await pessoa(`avisos-dono.${RODADA}@exemplo.com`);
    const idEstoque = await pessoa(`avisos-estoque.${RODADA}@exemplo.com`);
    const idDonoB = await pessoa(`avisos-outro.${RODADA}@exemplo.com`);
    const { data: a } = await admin().from("clientes").insert({ user_id: idDono, nome: "Dona Avisos", nome_restaurante: `Avisos A ${RODADA}`, telefone: telefone(11) }).select("id").single();
    const { data: b } = await admin().from("clientes").insert({ user_id: idDonoB, nome: "Dono B", nome_restaurante: `Avisos B ${RODADA}`, telefone: telefone(12) }).select("id").single();
    clienteA = a!.id;
    clienteB = b!.id;
    await admin().from("membros").insert({ cliente_id: clienteA, user_id: idEstoque, papel: "estoquista", nome: "Ester", ativo: true });
    dono = { userId: idDono, telefone: telefone(21) };
    estoquista = { userId: idEstoque, telefone: telefone(22) };
    donoB = { userId: idDonoB, telefone: telefone(23) };
    // WhatsApp verificado do dono e do estoquista de A; o dono de B NÃO verificou.
    const agora = new Date().toISOString();
    expect(
      (await admin().from("agente_whatsapp").insert([
        { cliente_id: clienteA, user_id: dono.userId, telefone: dono.telefone },
        { cliente_id: clienteA, user_id: estoquista.userId, telefone: estoquista.telefone },
        { cliente_id: clienteB, user_id: donoB.userId, telefone: donoB.telefone },
      ])).error,
    ).toBeNull();
    await admin().from("agente_whatsapp").update({ verificado_em: agora }).in("user_id", [dono.userId, estoquista.userId]);

    // A: abertura pela metade; resumo, abertura e equipe "na hora".
    const { data: lista } = await admin().from("checklists").insert({ cliente_id: clienteA, nome: "Abertura cozinha", momento: "abertura" }).select("id").single();
    const { data: itens } = await admin().from("checklist_itens").insert([{ checklist_id: lista!.id, texto: "Ligar coifa", ordem: 1 }, { checklist_id: lista!.id, texto: "Conferir gás", ordem: 2 }]).select("id");
    await admin().from("checklist_execucoes").insert({ checklist_item_id: itens![0].id, responsavel: "Ana" });
    const hora = umMinutoAtras();
    expect((await admin().from("avisos_config").insert({ cliente_id: clienteA, checklist_abertura_ate: hora, resumo_hora: hora, equipe_hora: "00:00" })).error).toBeNull();

    // Insumos: arroz abaixo do mínimo, feijão ok mas subiu 20%, picanha rendendo menos.
    const insumo = (nome: string, categoria: string, fc = 1) => ({ cliente_id: clienteA, nome, categoria, unidade_medida: "kg", tamanho_embalagem: 1, preco_embalagem: 10, fator_correcao: fc });
    const ins = await admin().from("insumos").insert([insumo("Arroz", "outro"), insumo("Feijão", "outro"), insumo("Picanha", "proteina", 1.2)]).select("id, nome");
    expect(ins.error).toBeNull();
    const id = (n: string) => ins.data!.find((i) => i.nome === n)!.id as string;
    expect((await admin().from("estoque").insert([
      { insumo_id: id("Arroz"), saldo_atual: 2, estoque_minimo: 10 },
      { insumo_id: id("Feijão"), saldo_atual: 20, estoque_minimo: 5 },
    ])).error).toBeNull();
    expect((await admin().from("historico_preco_insumo").insert([
      { insumo_id: id("Feijão"), preco_anterior: 10, preco_novo: 12 },
      { insumo_id: id("Arroz"), preco_anterior: 5, preco_novo: 5.2 },
    ])).error).toBeNull();
    expect((await admin().from("processamentos_proteina").insert({
      insumo_id: id("Picanha"), responsavel: "Ana", peso_bruto_recebido: 10, valor_pago_kg: 70, peso_liquido_resultante: 7, fornecedor: "Boi Bom",
    })).error).toBeNull();

    // Fornecedor fecha o pedido daqui a 1 h e a cozinha pediu arroz.
    expect((await admin().from("fornecedores").insert({
      cliente_id: clienteA, empresa: "Atacadão Teste", telefone: "11999990000", entrega_dias: [0, 1, 2, 3, 4, 5, 6], pedido_ate: horaBrasilia(60), pedido_antecedencia: 0, categorias_pedido: ["outros"],
    })).error).toBeNull();
    expect((await admin().from("requisicoes").insert({ cliente_id: clienteA, categoria: "outros", descricao: "Arroz 5 kg", responsavel: "Ana" })).error).toBeNull();

    // Equipe: cozinheira em 6x1 faltou hoje e amanhã (um dos dois é dia de trabalho).
    const f = await admin().from("funcionarios").insert({ cliente_id: clienteA, nome: "Bia Souza", setor: "cozinha", cargo: "Cozinheira", admitido_em: "2025-01-06", ativo: true }).select("id").single();
    expect(f.error).toBeNull();
    expect((await admin().from("escalas_config").insert({ cliente_id: clienteA, funcionario_id: f.data!.id, tipo: "6x1", ancora: "2026-01-05" })).error).toBeNull();
    const hoje = hojeBrasilia();
    expect((await admin().from("prontuario_ocorrencias").insert({ cliente_id: clienteA, funcionario_id: f.data!.id, tipo: "falta", inicio: hoje, fim: somarDias(hoje, 1) })).error).toBeNull();

    // Desperdício e fechamento de vendas.
    const r = await admin().from("receitas").insert({ cliente_id: clienteA, nome_prato: "Molho de tomate", unidade_rendimento: "kg", preco_venda: 40 }).select("id").single();
    expect(r.error).toBeNull();
    receita = r.data!.id;
    await perda("queimou");
    const fech = await admin().from("fechamentos_cmv").insert({
      cliente_id: clienteA, periodo_inicio: "2026-09-01", periodo_fim: "2026-09-30", estoque_inicial: 10000, compras: 30000, estoque_final: 8000, faturamento: 100000,
    }).select("id").single();
    expect(fech.error).toBeNull();
    expect((await admin().from("vendas_periodo").insert({ fechamento_id: fech.data!.id, receita_id: receita, quantidade: 120 })).error).toBeNull();

    // B: insumo abaixo do mínimo também, mas ninguém com WhatsApp verificado.
    const { data: insB } = await admin().from("insumos").insert({ ...insumo("Óleo", "outro"), cliente_id: clienteB }).select("id").single();
    await admin().from("estoque").insert({ insumo_id: insB!.id, saldo_atual: 0, estoque_minimo: 5 });
  });

  test("sem a chave do n8n não entra", async () => {
    expect((await pendentes("chave-errada-com-mais-de-32-caracteres-xxxx")).status).toBe(401);
    expect((await fetch(`${APP}/api/automacoes/resultado`, { method: "POST", body: "{}" })).status).toBe(401);
  });

  test("monta os avisos da gestão da casa A só pro dono; a casa B não recebe nada", async () => {
    test.skip(pertoDaMeiaNoite(), "perto da meia-noite o prazo e as janelas caem no outro dia");
    const { status, corpo } = await pendentes();
    expect(status).toBe(200);
    const meus = corpo.avisos.filter((a) => [dono.telefone, estoquista.telefone, donoB.telefone].includes(a.telefone));
    expect(meus.every((a) => a.telefone === dono.telefone), "só o dono (gestão com WhatsApp verificado)").toBe(true);
    expect(meus.map((a) => a.tipo).sort()).toEqual(TIPOS_DA_GESTAO);
    const texto = (tipo: string) => meus.find((a) => a.tipo === tipo)!.texto;
    expect(texto("estoque_baixo")).toContain("• Arroz: 2 kg (mínimo 10 kg). Atacadão Teste: peça até hoje");
    expect(texto("estoque_baixo")).not.toContain("Feijão");
    expect(texto("compras_prazo")).toContain("pedido do Atacadão Teste fecha em");
    expect(texto("compras_prazo")).toContain("1 pedido da cozinha esperando: Arroz 5 kg.");
    expect(texto("preco_subiu")).toContain("• Feijão: R$ 10,00 → R$ 12,00 o kg (+20%)");
    expect(texto("preco_subiu")).not.toContain("Arroz");
    expect(texto("rendimento_baixo")).toContain("• Picanha (Boi Bom): rendeu 70%, o normal é 83%");
    expect(texto("equipe")).toContain("Bia Souza (Cozinheira) faltou");
    expect(texto("desperdicio")).toContain("• Molho de tomate, 3 kg: queimou (João)");
    expect(texto("vendas")).toContain("CMV: 32% (R$ 32.000,00)");
    expect(texto("vendas")).toContain("1. Molho de tomate: 120");
    expect(texto("checklist_abertura")).toContain("Abertura cozinha: 1 de 2 itens");
    expect(texto("resumo_diario")).toContain(`Avisos A ${RODADA}: como foi ontem`);
    expect(texto("resumo_diario")).toContain("Insumos abaixo do mínimo: 1");
    expect(meus.some((a) => /temperatura/i.test(a.texto))).toBe(false);

    // n8n mandou todos menos um, que falhou.
    const [falha, ...ok] = meus;
    expect(await resultado([...ok.map((a) => ({ id: a.id, ok: true })), { id: falha.id, ok: false, erro: "Evolution fora do ar" }])).toBe(200);
    const { data } = await admin().from("avisos").select("id, status, erro").eq("cliente_id", clienteA);
    expect(data!.find((a) => a.id === ok[0].id)!.status).toBe("enviado");
    expect(data!.find((a) => a.id === falha.id)).toMatchObject({ status: "pendente", erro: "Evolution fora do ar" });
    expect((await admin().from("avisos").select("id").eq("cliente_id", clienteB)).data).toHaveLength(0);

    // Próxima rodada: nada repete; só a falha volta (2ª tentativa).
    const segunda = await pendentes();
    expect(segunda.corpo.avisos.filter((a) => a.telefone === dono.telefone).map((a) => a.id)).toEqual([falha.id]);
    expect((await admin().from("avisos").select("id").eq("cliente_id", clienteA)).data).toHaveLength(TIPOS_DA_GESTAO.length);
    await resultado([{ id: falha.id, ok: true }]);
  });

  test("perda nova vem sozinha num aviso novo; a antiga não repete", async () => {
    test.skip(pertoDaMeiaNoite(), "perto da meia-noite as janelas caem no outro dia");
    await perda("caiu no chão");
    const { corpo } = await pendentes();
    const meus = corpo.avisos.filter((a) => a.telefone === dono.telefone);
    expect(meus.map((a) => a.tipo)).toEqual(["desperdicio"]);
    expect(meus[0].texto).toContain("caiu no chão");
    expect(meus[0].texto).not.toContain("queimou");
    await resultado([{ id: meus[0].id, ok: true }]);
  });

  test("desligado na config, não avisa", async () => {
    await admin().from("avisos_config").update({ desperdicio: false }).eq("cliente_id", clienteA);
    await perda("estragou");
    const { corpo } = await pendentes();
    expect(corpo.avisos.filter((a) => a.telefone === dono.telefone && a.tipo === "desperdicio")).toHaveLength(0);
  });

  test("tela: gestão vê quem recebe e o histórico, e desliga o resumo", async ({ page }) => {
    await entrar(page, `avisos-dono.${RODADA}@exemplo.com`, "avisos-senha-123");
    await page.goto("/configuracoes?secao=avisos");
    await expect(page.getByRole("heading", { name: "Quem recebe" })).toBeVisible();
    await expect(page.getByText(`(11) ${dono.telefone.slice(4, 9)}-${dono.telefone.slice(9)}`)).toBeVisible();
    await expect(page.getByText("Produção perdida").first()).toBeVisible();
    await expect(page.getByText("Temperatura e higiene não entram aqui")).toBeVisible();
    await expect(page.getByRole("switch", { name: "Desperdício" })).not.toBeChecked();
    await expect(page.getByText("Enviado").first()).toBeVisible();

    const resumo = page.getByRole("switch", { name: "Resumo de ontem" });
    await expect(resumo).toBeChecked();
    await resumo.uncheck();
    await page.getByRole("switch", { name: "Relatório de vendas" }).uncheck();
    await page.getByRole("switch", { name: "Horário de silêncio" }).check();
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByText("Avisos salvos.")).toBeVisible();
    const { data } = await admin().from("avisos_config").select("resumo_diario, vendas, desperdicio, estoque_baixo, equipe_hora, silencio_inicio, silencio_fim").eq("cliente_id", clienteA).single();
    expect(data).toEqual({ resumo_diario: false, vendas: false, desperdicio: false, estoque_baixo: true, equipe_hora: "00:00:00", silencio_inicio: "23:00:00", silencio_fim: "06:00:00" });
  });
});
