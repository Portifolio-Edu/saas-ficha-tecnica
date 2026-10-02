// AVISOS NO WHATSAPP (2026-10-02): o caminho que o n8n (workflow "FT —
// Avisos") faz: pede os pendentes com a chave, manda, conta o resultado.
// Confere: só dono/gestor com WhatsApp verificado recebe; outra casa não
// recebe nada; o mesmo aviso não sai duas vezes; falha volta pra fila.
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
/** "HH:MM" de agora - 1 min, no horário de Brasília (cai dentro da janela do aviso). */
function umMinutoAtras(): string {
  return new Date(Date.now() - 60_000).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
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

    // A: câmara fria fora da faixa, abertura pela metade, resumo e checklist "na hora".
    const { data: camara } = await admin().from("locais_armazenamento").insert({ cliente_id: clienteA, nome: "Câmara fria", temperatura_min_c: 0, temperatura_max_c: 5 }).select("id").single();
    await admin().from("registros_temperatura").insert([
      { local_armazenamento_id: camara!.id, temperatura_c: 9, responsavel: "Ana" },
      { local_armazenamento_id: camara!.id, temperatura_c: 3, responsavel: "Ana" },
    ]);
    const { data: lista } = await admin().from("checklists").insert({ cliente_id: clienteA, nome: "Abertura cozinha", momento: "abertura" }).select("id").single();
    const { data: itens } = await admin().from("checklist_itens").insert([{ checklist_id: lista!.id, texto: "Ligar coifa", ordem: 1 }, { checklist_id: lista!.id, texto: "Conferir gás", ordem: 2 }]).select("id");
    await admin().from("checklist_execucoes").insert({ checklist_item_id: itens![0].id, responsavel: "Ana" });
    const hora = umMinutoAtras();
    expect((await admin().from("avisos_config").insert({ cliente_id: clienteA, checklist_abertura_ate: hora, resumo_hora: hora })).error).toBeNull();
    // B: também fora da faixa, mas ninguém com WhatsApp verificado.
    const { data: camaraB } = await admin().from("locais_armazenamento").insert({ cliente_id: clienteB, nome: "Freezer", temperatura_max_c: -18 }).select("id").single();
    await admin().from("registros_temperatura").insert({ local_armazenamento_id: camaraB!.id, temperatura_c: -5, responsavel: "Beto" });
  });

  test("sem a chave do n8n não entra", async () => {
    expect((await pendentes("chave-errada-com-mais-de-32-caracteres-xxxx")).status).toBe(401);
    expect((await fetch(`${APP}/api/automacoes/resultado`, { method: "POST", body: "{}" })).status).toBe(401);
  });

  test("monta os avisos da casa A só pro dono; a casa B não recebe nada", async () => {
    test.skip(umMinutoAtras() === "23:59", "virada do dia: a janela do aviso cai no dia anterior");
    const { status, corpo } = await pendentes();
    expect(status).toBe(200);
    const meus = corpo.avisos.filter((a) => [dono.telefone, estoquista.telefone, donoB.telefone].includes(a.telefone));
    expect(meus.every((a) => a.telefone === dono.telefone), "só o dono (gestão com WhatsApp verificado)").toBe(true);
    expect(meus.map((a) => a.tipo).sort()).toEqual(["checklist_abertura", "resumo_diario", "temperatura"]);
    const temp = meus.find((a) => a.tipo === "temperatura")!;
    expect(temp.texto).toContain("Câmara fria: *9 °C* (o certo é 0 a 5 °C)");
    expect(meus.find((a) => a.tipo === "checklist_abertura")!.texto).toContain("Abertura cozinha: 1 de 2 itens");
    expect(meus.find((a) => a.tipo === "resumo_diario")!.texto).toContain(`Avisos A ${RODADA}: como foi ontem`);

    // n8n mandou dois e falhou um.
    const [ok1, ok2, falha] = meus;
    expect(await resultado([{ id: ok1.id, ok: true }, { id: ok2.id, ok: true }, { id: falha.id, ok: false, erro: "Evolution fora do ar" }])).toBe(200);
    const { data } = await admin().from("avisos").select("id, status, erro").eq("cliente_id", clienteA);
    expect(data!.find((a) => a.id === ok1.id)!.status).toBe("enviado");
    expect(data!.find((a) => a.id === falha.id)).toMatchObject({ status: "pendente", erro: "Evolution fora do ar" });
    expect((await admin().from("avisos").select("id").eq("cliente_id", clienteB)).data).toHaveLength(0);

    // Próxima rodada: não gera de novo o que já existe; a falha volta (2ª tentativa).
    const segunda = await pendentes();
    const deNovo = segunda.corpo.avisos.filter((a) => a.telefone === dono.telefone);
    expect(deNovo.map((a) => a.id)).toEqual([falha.id]);
    expect((await admin().from("avisos").select("id").eq("cliente_id", clienteA)).data).toHaveLength(3);
  });

  test("desligado na config, não avisa", async () => {
    await admin().from("avisos_config").update({ temperatura: false }).eq("cliente_id", clienteA);
    const { data: local } = await admin().from("locais_armazenamento").select("id").eq("cliente_id", clienteA).single();
    await admin().from("registros_temperatura").insert({ local_armazenamento_id: local!.id, temperatura_c: 12, responsavel: "Ana" });
    const { corpo } = await pendentes();
    expect(corpo.avisos.filter((a) => a.telefone === dono.telefone && a.tipo === "temperatura")).toHaveLength(0);
  });

  test("tela: gestão vê quem recebe e o histórico, e desliga o resumo", async ({ page }) => {
    await entrar(page, `avisos-dono.${RODADA}@exemplo.com`, "avisos-senha-123");
    await page.goto("/configuracoes?secao=avisos");
    await expect(page.getByRole("heading", { name: "Quem recebe" })).toBeVisible();
    await expect(page.getByText(`(11) ${dono.telefone.slice(4, 9)}-${dono.telefone.slice(9)}`)).toBeVisible();
    await expect(page.getByText("Temperatura fora da faixa").last()).toBeVisible();
    await expect(page.getByText("Enviado").first()).toBeVisible();

    const resumo = page.getByRole("switch", { name: "Resumo de ontem" });
    await expect(resumo).toBeChecked();
    await resumo.uncheck();
    await page.getByRole("switch", { name: "Horário de silêncio" }).check();
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByText("Avisos salvos.")).toBeVisible();
    const { data } = await admin().from("avisos_config").select("resumo_diario, silencio_inicio, silencio_fim, temperatura").eq("cliente_id", clienteA).single();
    expect(data).toEqual({ resumo_diario: false, silencio_inicio: "23:00:00", silencio_fim: "06:00:00", temperatura: false });
  });
});
