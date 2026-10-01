// AGENTE IA (2026-09-26): o caminho inteiro do agente, com o n8n SIMULADO
// por um servidor local (porta 3999) que faz o que o workflow real faz:
// recebe a mensagem com o passe e chama as ferramentas do app com ele.
// Confere: chave do n8n e passe obrigatórios; cada restaurante só enxerga o
// seu; proposta só grava depois de confirmada e uma vez só; WhatsApp só
// identifica número ativado pelo código; chat da tela com foto e confirmação.
import { createServer, type Server } from "node:http";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { assinarPasse } from "../src/lib/agente/passe";
import { RODADA, admin, entrar } from "./apoio";

const CHAVE = process.env.AGENTE_CHAVE_N8N ?? "";
const SEGREDO = process.env.AGENTE_SEGREDO ?? "";
const APP = "http://127.0.0.1:3000";
const senha = "agente-senha-123";

interface Casa { email: string; userId: string; clienteId: string; nome: string }
const casas: Record<"a" | "b", Casa> = {} as never;

// ---------------------------------------------------------------------------
// n8n simulado: o que ele recebeu e como responde
const recebidas: Record<string, unknown>[] = [];
let n8n: Server;

async function ferramenta(passe: string, nome: string, argumentos: object = {}) {
  const r = await fetch(`${APP}/api/agente/ferramentas`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${passe}` },
    body: JSON.stringify({ ferramenta: nome, argumentos }),
  });
  return { status: r.status, corpo: (await r.json()) as { ok: boolean; dados?: Record<string, unknown>; erro?: string } };
}

test.beforeAll(async () => {
  expect(CHAVE.length, "rode `source e2e/ambiente.sh`").toBeGreaterThanOrEqual(32);
  for (const k of ["a", "b"] as const) {
    const email = `agente-${k}.${RODADA}@exemplo.com`;
    const nome = `Casa ${k.toUpperCase()} ${RODADA}`;
    const u = await admin().auth.admin.createUser({ email, password: senha, email_confirm: true });
    expect(u.error).toBeNull();
    const telefone = `55119${String(Date.now() + (k === "a" ? 1 : 2)).slice(-8)}`;
    const { data: c, error } = await admin().from("clientes").insert({ user_id: u.data.user!.id, nome: `Dono ${k}`, nome_restaurante: nome, telefone }).select("id").single();
    expect(error).toBeNull();
    casas[k] = { email, userId: u.data.user!.id, clienteId: c!.id, nome };
  }
  const { error: erroInsumo } = await admin().from("insumos").insert({ cliente_id: casas.a.clienteId, nome: `Tomate italiano ${RODADA}`, categoria: "hortalica", unidade_medida: "kg", tamanho_embalagem: 1, preco_embalagem: 8 });
  expect(erroInsumo).toBeNull();

  n8n = createServer((req, res) => {
    let corpo = "";
    req.on("data", (p) => (corpo += p));
    req.on("end", async () => {
      if (req.headers["x-ft-chave"] !== CHAVE) {
        res.writeHead(401).end();
        return;
      }
      const msg = JSON.parse(corpo) as { passe: string; texto: string; anexos: { tipo: string; url: string }[] };
      recebidas.push(msg);
      // Faz o que o agente faria: lê o estoque e propõe o pedido.
      const busca = await ferramenta(msg.passe, "buscar_insumos", { busca: "tomate" });
      const proposta = await ferramenta(msg.passe, "propor_pedido_compra", { itens: [{ descricao: "Tomate italiano", quantidade: 5, unidade: "kg" }] });
      const foto = msg.anexos?.[0] ? await fetch(msg.anexos[0].url).then((r) => r.status) : null;
      res.writeHead(200, { "content-type": "application/json" }).end(
        JSON.stringify({
          resposta: `Achei **${(busca.corpo.dados as unknown as unknown[] | undefined)?.length ?? 0}** insumo. ${proposta.corpo.ok ? "Preparei o pedido de 5 kg de tomate, confirma?" : proposta.corpo.erro}${foto ? ` (foto: ${foto})` : ""}`,
        }),
      );
    });
  });
  await new Promise<void>((ok) => n8n.listen(3999, "127.0.0.1", ok));
});

test.afterAll(async () => {
  await new Promise((ok) => n8n?.close(ok));
});

function passeDe(k: "a" | "b", extra: Partial<{ c: string; exp: number }> = {}) {
  const casa = casas[k];
  const p = assinarPasse({ u: casa.userId, c: extra.c ?? casa.clienteId, p: "dono", n: `Dono ${k}`, r: casa.nome, canal: "web" }, SEGREDO);
  return p;
}

test.describe.configure({ mode: "serial" });

test("ferramentas: sem passe, com passe falso ou sem a chave do n8n, não entra", async ({ request }) => {
  const semPasse = await request.post("/api/agente/ferramentas", { data: { ferramenta: "resumo_do_dia" } });
  expect(semPasse.status()).toBe(401);
  const falso = assinarPasse({ u: casas.a.userId, c: casas.a.clienteId, p: "dono", n: "x", r: "x", canal: "web" }, "outro-segredo-qualquer-com-mais-de-32-caracteres");
  expect((await request.post("/api/agente/ferramentas", { headers: { authorization: `Bearer ${falso}` }, data: { ferramenta: "resumo_do_dia" } })).status()).toBe(401);
  const vencido = assinarPasse({ u: casas.a.userId, c: casas.a.clienteId, p: "dono", n: "x", r: "x", canal: "web" }, SEGREDO, Date.now() - 3_600_000);
  expect((await request.post("/api/agente/ferramentas", { headers: { authorization: `Bearer ${vencido}` }, data: { ferramenta: "resumo_do_dia" } })).status()).toBe(401);

  // Conferência do passe (o n8n usa antes de gastar IA no chat).
  expect((await request.post("/api/agente/passe", { headers: { authorization: `Bearer ${falso}` } })).status()).toBe(401);
  const valido = await request.post("/api/agente/passe", { headers: { authorization: `Bearer ${passeDe("a")}` } });
  expect(valido.status()).toBe(200);
  expect(await valido.json()).toMatchObject({ ok: true, canal: "web", papel: "dono" });

  expect((await request.get("/api/agente/ferramentas")).status()).toBe(401);
  const catalogo = await request.get("/api/agente/ferramentas", { headers: { "x-ft-chave": CHAVE } });
  expect(catalogo.status()).toBe(200);
  const nomes = ((await catalogo.json()).ferramentas as { nome: string }[]).map((f) => f.nome);
  expect(nomes).toEqual(expect.arrayContaining(["resumo_do_dia", "buscar_insumos", "propor_entrada_estoque", "confirmar_proposta"]));

  for (const rota of ["/api/agente/whatsapp/sessao", "/api/agente/whatsapp/ativar"]) {
    expect((await request.post(rota, { data: { telefone: "5511999999999", codigo: "123456" } })).status(), rota).toBe(401);
  }
});

test("cada restaurante só enxerga o seu, mesmo com passe de outro restaurante", async () => {
  const a = await ferramenta(passeDe("a"), "buscar_insumos", { busca: "tomate" });
  expect(a.corpo.ok).toBe(true);
  expect(JSON.stringify(a.corpo.dados)).toContain(`Tomate italiano ${RODADA}`);

  const b = await ferramenta(passeDe("b"), "buscar_insumos", { busca: "tomate" });
  expect(b.corpo.ok).toBe(true);
  expect(JSON.stringify(b.corpo.dados)).not.toContain(`Tomate italiano ${RODADA}`);

  // Passe da pessoa B apontando pro restaurante A: o app confere no banco.
  const cruzado = await ferramenta(passeDe("b", { c: casas.a.clienteId }), "buscar_insumos", { busca: "tomate" });
  expect(cruzado.corpo.ok).toBe(false);
  expect(cruzado.corpo.erro).toContain("não tem mais acesso");
});

test("proposta só grava depois de confirmada, e uma vez só", async () => {
  const passe = passeDe("a");
  const proposta = await ferramenta(passe, "propor_pedido_compra", { itens: [{ descricao: `Coentro ${RODADA}`, quantidade: 2, unidade: "maço" }] });
  expect(proposta.corpo.ok, proposta.corpo.erro).toBe(true);
  const id = (proposta.corpo.dados!.proposta as { id: string }).id;
  const contar = async () => (await admin().from("requisicoes").select("id").eq("cliente_id", casas.a.clienteId).eq("descricao", `Coentro ${RODADA}`)).data!.length;
  expect(await contar()).toBe(0);

  // Outro restaurante não confirma a proposta de A.
  const alheio = await ferramenta(passeDe("b"), "confirmar_proposta", { proposta_id: id });
  expect(alheio.corpo.ok).toBe(false);
  expect(await contar()).toBe(0);

  const ok = await ferramenta(passe, "confirmar_proposta", { proposta_id: id });
  expect(ok.corpo.ok, ok.corpo.erro).toBe(true);
  expect(await contar()).toBe(1);
  const deNovo = await ferramenta(passe, "confirmar_proposta", { proposta_id: id });
  expect(deNovo.corpo.ok).toBe(false);
  expect(await contar()).toBe(1);

  const { data: linha } = await admin().from("agente_acoes").select("status, resultado, canal").eq("id", id).single();
  expect(linha).toMatchObject({ status: "confirmada", canal: "web" });
  expect(linha!.resultado).toContain("pedidos de compra");
});

test("WhatsApp: só número ativado pelo código vira passe da pessoa", async ({ page, request }) => {
  const telefone = `551198${String(Date.now()).slice(-7)}`;
  const cab = { "x-ft-chave": CHAVE };
  expect((await request.post("/api/agente/whatsapp/sessao", { headers: cab, data: { telefone } })).status()).toBe(404);

  await entrar(page, casas.a.email, senha);
  await page.getByRole("button", { name: "Agente IA" }).click();
  const chat = page.getByRole("dialog", { name: "Agente IA" });
  await chat.getByRole("tab", { name: "WhatsApp" }).click();
  await chat.getByLabel("Seu WhatsApp").fill(`(${telefone.slice(2, 4)}) ${telefone.slice(4, 9)}-${telefone.slice(9)}`);
  await chat.getByRole("button", { name: "Gerar código de ativação" }).click();
  const frase = (await chat.getByText(/^ATIVAR \d{6}$/).textContent())!;
  const codigo = frase.replace("ATIVAR ", "");
  await expect(chat.getByRole("link", { name: "Abrir no WhatsApp" })).toHaveAttribute("href", /wa\.me\/5511900000000/);

  // Ainda não ativado: não identifica.
  expect((await request.post("/api/agente/whatsapp/sessao", { headers: cab, data: { telefone } })).status()).toBe(404);
  // Código errado não ativa.
  const errado = await request.post("/api/agente/whatsapp/ativar", { headers: cab, data: { telefone, codigo: codigo === "000000" ? "111111" : "000000" } });
  expect((await errado.json()).ok).toBe(false);
  // Código certo, com o número sem o 9 (como o WhatsApp às vezes manda).
  const semNove = telefone.slice(0, 4) + telefone.slice(5);
  const certo = await request.post("/api/agente/whatsapp/ativar", { headers: cab, data: { telefone: semNove, codigo } });
  expect(await certo.json()).toMatchObject({ ok: true });
  // O mesmo código não serve duas vezes.
  expect((await (await request.post("/api/agente/whatsapp/ativar", { headers: cab, data: { telefone, codigo } })).json()).ok).toBe(false);

  const sessao = await request.post("/api/agente/whatsapp/sessao", { headers: cab, data: { telefone } });
  expect(sessao.status()).toBe(200);
  const s = await sessao.json();
  expect(s).toMatchObject({ sessao: `ft:${casas.a.clienteId}:${casas.a.userId}:whatsapp`, restaurante: casas.a.nome, pessoa: { papel: "dono" } });
  expect(s.app).toBe(APP);
  expect(s.ferramentas).toContain("- propor_valores_nutricionais: ");
  const pelaSessao = await ferramenta(s.passe, "buscar_insumos", { busca: "tomate" });
  expect(JSON.stringify(pelaSessao.corpo.dados)).toContain(`Tomate italiano ${RODADA}`);

  // Na tela, reabrindo a aba: ativado.
  await chat.getByRole("tab", { name: "Conversa" }).click();
  await chat.getByRole("tab", { name: "WhatsApp" }).click();
  await expect(chat.getByText(/^Ativado:/)).toBeVisible();
});

test("chat da tela: mensagem com foto vai pro n8n com o passe e a proposta é confirmada na tela", async ({ page }) => {
  await entrar(page, casas.a.email, senha);
  await page.getByRole("button", { name: "Agente IA" }).click();
  const chat = page.getByRole("dialog", { name: "Agente IA" });
  const seletor = page.waitForEvent("filechooser");
  await chat.getByRole("button", { name: "Anexar foto, áudio, PDF ou XML" }).click();
  await (await seletor).setFiles({
    name: "nota.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"),
  });
  await chat.getByRole("textbox", { name: "Mensagem para o agente" }).fill("Pede tomate pra amanhã");
  await chat.getByRole("button", { name: "Enviar" }).click();

  await expect(chat.getByText(/Preparei o pedido de 5 kg de tomate, confirma\? \(foto: 200\)/)).toBeVisible({ timeout: 30_000 });
  const ultima = recebidas.at(-1) as { canal: string; sessao: string; restaurante: string; texto: string; anexos: { tipo: string }[] };
  expect(ultima).toMatchObject({ canal: "web", sessao: `ft:${casas.a.clienteId}:${casas.a.userId}:web`, restaurante: casas.a.nome, texto: "Pede tomate pra amanhã" });
  expect(ultima.anexos).toEqual([expect.objectContaining({ tipo: "imagem" })]);
  expect(recebidas.at(-1)).toMatchObject({ app: APP, hoje: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), ferramentas: expect.stringContaining("- propor_pedido_compra: ") });

  const cartao = chat.getByLabel("Proposta esperando confirmação").filter({ hasText: "Tomate italiano 5 kg" });
  await expect(cartao).toBeVisible();
  const r = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const graves = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(graves.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);

  await cartao.getByRole("button", { name: "Confirmar" }).click();
  await expect(chat.getByText(/✅ 1 item entrou nos pedidos de compra\./)).toBeVisible();
  await expect(cartao).toHaveCount(0);
  const { data } = await admin().from("requisicoes").select("quantidade, unidade, categoria").eq("cliente_id", casas.a.clienteId).ilike("descricao", "Tomate italiano");
  expect(data).toEqual([{ quantidade: 5, unidade: "kg", categoria: "hortifruti" }]);

  // Esc fecha.
  await page.keyboard.press("Escape");
  await expect(chat).toHaveCount(0);
});
