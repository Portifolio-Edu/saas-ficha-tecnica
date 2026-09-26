// PLANO 9,5 (2026-09-26): ponta a ponta com login real. Um restaurante novo
// por rodada, do cadastro até o tablet da cozinha, passando por cada papel.
// Cada teste confere na tela E no banco (Supabase local).
import { readFile } from "node:fs/promises";
import { test, expect, type Browser, type Page } from "@playwright/test";
import { RODADA, admin, clienteDoDono, entrar, ultimoLink } from "./apoio";

// WhatsApp único por rodada (o cadastro não aceita número repetido).
const celular = `9${String(Date.now()).slice(-8)}`;
const dono = {
  nome: "Dona Teste",
  email: `dono.${RODADA}@exemplo.com`,
  senha: "senha-forte-123",
  restaurante: `Bistrô ${RODADA}`,
  telefone: `(11) ${celular.slice(0, 5)}-${celular.slice(5)}`,
};
const novaSenhaDono = "outra-senha-456";
const gestor = { nome: "Gil Gestor", usuario: `gestor.${RODADA}`, senha: "gestor-senha-1" };
const estoquista = { nome: "Ester Estoque", usuario: `estoque.${RODADA}`, senha: "estoque-senha-1" };
const cozinheiro = "Ana Cozinha";

let clienteId = "";
let insumoId = "";
let codigoTablet = "";

async function novaAba(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({ baseURL: "http://127.0.0.1:3000", locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  return ctx.newPage();
}

test.describe.serial("com login real", () => {
  test("dono se cadastra e cai no sistema com o restaurante criado", async ({ page }) => {
    await page.goto("/cadastro");
    await page.fill("#nome", dono.nome);
    await page.fill("#nome_restaurante", dono.restaurante);
    await page.fill("#telefone", dono.telefone);
    await page.fill("#email", dono.email);
    await page.fill("#senha", dono.senha);
    await page.check("input[name=aceite_termos]");
    await page.getByRole("button", { name: /Criar|Cadastr/ }).click();
    await expect(page).toHaveURL(/\/insumos$/);
    await expect(page.getByText(dono.restaurante).first()).toBeVisible();

    clienteId = await clienteDoDono(dono.email);
    const { data: user } = await admin().auth.admin.listUsers({ perPage: 1000 });
    const meta = user.users.find((u) => u.email === dono.email)!.user_metadata;
    expect(meta.versao_termos, "aceite dos termos registrado (LGPD)").toBeTruthy();
    const { data: c } = await admin().from("clientes").select("telefone").eq("id", clienteId).single();
    expect(c!.telefone, "telefone gravado num formato só").toBe(`5511${celular}`);
  });

  test("WhatsApp de outro restaurante é recusado sem criar login pela metade", async ({ browser }) => {
    const outra = await novaAba(browser);
    const email = `copia.${RODADA}@exemplo.com`;
    await outra.goto("/cadastro");
    await outra.fill("#nome", "Outra Pessoa");
    await outra.fill("#nome_restaurante", "Outro Bistrô");
    await outra.fill("#telefone", `+55 11 ${celular}`);
    await outra.fill("#email", email);
    await outra.fill("#senha", "senha-forte-123");
    await outra.check("input[name=aceite_termos]");
    await outra.getByRole("button", { name: /Criar|Cadastr/ }).click();
    await expect(outra.getByText("Esse WhatsApp já está cadastrado em outro restaurante. Entre com a conta dele ou use outro número.")).toBeVisible();
    await expect(outra).toHaveURL(/\/cadastro$/);
    const { data } = await admin().auth.admin.listUsers({ perPage: 1000 });
    expect(data.users.some((u) => u.email === email), "nenhum login criado").toBe(false);
    await outra.context().close();
  });

  test("senha errada é recusada; a certa entra", async ({ page }) => {
    await entrar(page, dono.email, "senha-errada-000", { esperaEntrar: false });
    await expect(page.getByText("Usuário, e-mail ou senha incorretos.")).toBeVisible();
    await entrar(page, dono.email, dono.senha);
    await expect(page).toHaveURL(/\/visao-geral$/);
  });

  test("recupera a senha pelo link do e-mail", async ({ page }) => {
    await page.goto("/recuperar-senha");
    await page.fill("#email", dono.email);
    await page.getByRole("button").filter({ hasText: /Enviar|link/i }).first().click();
    await expect(page.getByText(/enviamos um link/)).toBeVisible();

    await page.goto(await ultimoLink(dono.email));
    await expect(page).toHaveURL(/\/nova-senha$/);
    await page.fill("#senha", novaSenhaDono);
    await page.fill("#confirmacao", novaSenhaDono);
    await page.getByRole("button").filter({ hasText: /Salvar|senha/i }).first().click();
    await expect(page).toHaveURL(/\/visao-geral$/);

    const outra = await novaAba(page.context().browser()!);
    await entrar(outra, dono.email, dono.senha, { esperaEntrar: false });
    await expect(outra.getByText("Usuário, e-mail ou senha incorretos.")).toBeVisible();
    await entrar(outra, dono.email, novaSenhaDono);
    await expect(outra).toHaveURL(/\/visao-geral$/);
    await outra.context().close();
  });

  test("dono cria gestor e estoquista, nomes da cozinha e o código do tablet", async ({ page }) => {
    await entrar(page, dono.email, novaSenhaDono);
    await page.goto("/equipe");
    for (const [pessoa, papel] of [[gestor, "gestor"], [estoquista, "estoquista"]] as const) {
      await page.getByRole("button", { name: "Novo acesso" }).click();
      await page.getByPlaceholder("Maria Souza").fill(pessoa.nome);
      await page.getByRole("combobox").first().selectOption(papel);
      await page.getByPlaceholder("maria.estoque").fill(pessoa.usuario);
      await page.getByLabel(/Senha \(mínimo 8/).fill(pessoa.senha);
      await page.getByRole("button", { name: "Criar acesso" }).click();
      await expect(page.getByText(`usuário: ${pessoa.usuario}`)).toBeVisible();
    }
    await page.getByPlaceholder("Nome", { exact: true }).fill(cozinheiro);
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(page.getByRole("button", { name: `Remover ${cozinheiro}` })).toBeVisible();

    await page.getByRole("button", { name: "Conectar aparelho" }).click();
    const codigo = page.getByText(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    await expect(codigo).toBeVisible();
    codigoTablet = (await codigo.innerText()).trim();

    const { data: membros } = await admin().from("membros").select("papel, nome, ativo").eq("cliente_id", clienteId).order("papel");
    expect(membros).toEqual([
      { papel: "dono", nome: dono.nome, ativo: true },
      { papel: "estoquista", nome: estoquista.nome, ativo: true },
      { papel: "gestor", nome: gestor.nome, ativo: true },
    ]);
  });

  test("estoquista entra pelo usuário e fica só em compras e estoque", async ({ page }) => {
    await entrar(page, estoquista.usuario, estoquista.senha);
    await expect(page).toHaveURL(/\/estoque$/);
    const menu = page.getByRole("navigation").first();
    await expect(menu.getByRole("link", { name: "Estoque" })).toBeVisible();
    for (const proibido of ["Visão geral", "Escalas", "Equipe e acessos", "Relatórios"]) {
      await expect(menu.getByRole("link", { name: proibido })).toHaveCount(0);
    }
    for (const rota of ["/visao-geral", "/escalas", "/equipe", "/relatorios"]) {
      await page.goto(rota);
      await expect(page, `${rota} manda de volta pro estoque`).toHaveURL(/\/estoque$/);
    }
  });

  test("tablet pareado registra produção e o estoque baixa pelo servidor", async ({ browser }) => {
    // Catálogo mínimo (o cadastro de insumo e receita pela tela tem teste próprio de unidade):
    // farinha com 10 kg em estoque e uma massa que usa 1 kg por lote de 2 kg.
    const { data: insumo } = await admin()
      .from("insumos")
      .insert({ cliente_id: clienteId, nome: `Farinha ${RODADA}`, categoria: "outro", unidade_medida: "kg", tamanho_embalagem: 1, preco_embalagem: 5 })
      .select("id")
      .single();
    insumoId = insumo!.id;
    await admin().from("estoque").upsert({ insumo_id: insumoId, saldo_atual: 10 }, { onConflict: "insumo_id" });
    const { data: receita } = await admin()
      .from("receitas")
      .insert({ cliente_id: clienteId, nome_prato: `Massa ${RODADA}`, tipo: "preparo_base", rendimento: 2, unidade_rendimento: "kg" })
      .select("id")
      .single();
    await admin().from("receita_insumos").insert({ receita_id: receita!.id, insumo_id: insumoId, peso_liquido: 1, unidade: "kg" });

    const tablet = await novaAba(browser);
    await tablet.goto("/cozinha");
    await tablet.getByPlaceholder("K7M4-9QPX").fill(codigoTablet);
    await tablet.getByRole("button", { name: "Conectar" }).click();
    await tablet.getByRole("button", { name: cozinheiro }).click();
    await tablet.getByRole("button", { name: "Produção" }).click();
    await tablet.getByRole("button", { name: `Começar Massa ${RODADA}` }).click();
    await tablet.getByRole("button", { name: /Começar produção · / }).click();
    await expect(tablet.getByText(`Massa ${RODADA}`).first()).toBeVisible();

    await expect
      .poll(async () => (await admin().from("estoque").select("saldo_atual").eq("insumo_id", insumoId).single()).data?.saldo_atual, {
        message: "1 lote de 2 kg usa 1 kg de farinha: 10 → 9",
      })
      .toBe(9);
    const { data: producoes } = await admin().from("producoes").select("responsavel, status").eq("cliente_id", clienteId);
    expect(producoes).toEqual([{ responsavel: cozinheiro, status: "em_producao" }]);

    // O tablet não abre o painel do gestor.
    await tablet.goto("/visao-geral");
    await expect(tablet).toHaveURL(/\/cozinha$/);
    await tablet.context().close();
  });

  test("gestor entra pelo usuário e vê a produção do tablet no painel", async ({ page }) => {
    await entrar(page, gestor.usuario, gestor.senha);
    await expect(page).toHaveURL(/\/visao-geral$/);
    await page.goto("/producoes");
    await expect(page.getByText(`Massa ${RODADA}`).first()).toBeVisible();
    await expect(page.getByText(cozinheiro).first()).toBeVisible();
  });

  test("escala: gestor monta a escala e lança um afastamento", async ({ page }) => {
    await entrar(page, gestor.usuario, gestor.senha);
    await page.goto("/escalas");
    await page.getByRole("tab", { name: /^Equipe/ }).click();
    await page.getByRole("button", { name: "Adicionar pessoa" }).click();
    const form = page.getByRole("dialog", { name: "Nova pessoa" });
    await form.getByLabel("Nome").fill("Bruno Chapa");
    await form.getByLabel(/^Cargo/).fill("Cozinheiro");
    await form.getByRole("button", { name: "Adicionar pessoa" }).click();
    await expect(form).toHaveCount(0);

    const { data: func } = await admin().from("funcionarios").select("id, setor, cargo").eq("cliente_id", clienteId).eq("nome", "Bruno Chapa").single();
    expect(func).toMatchObject({ setor: "cozinha", cargo: "Cozinheiro" });
    const { data: config } = await admin().from("escalas_config").select("tipo").eq("funcionario_id", func!.id).single();
    expect(config!.tipo).toBe("6x1");

    await page.getByRole("tab", { name: /Ocorr/ }).click();
    await page.getByRole("combobox", { name: "Pessoa", exact: true }).selectOption(func!.id);
    await page.getByRole("radio", { name: "Afastamento" }).click();
    await page.getByPlaceholder("Ex.: avisou por telefone às 9h").fill("Laudo do INSS");
    await page.getByRole("button", { name: "Registrar ocorrência" }).click();
    await expect(page.getByText("Laudo do INSS")).toBeVisible();
  });

  test("código de tablet vale uma vez só; tablet novo vê a escala sem motivo e sem alterar", async ({ page, browser }) => {
    const tablet = await novaAba(browser);
    await tablet.goto("/cozinha");
    await tablet.getByPlaceholder("K7M4-9QPX").fill(codigoTablet);
    await tablet.getByRole("button", { name: "Conectar" }).click();
    await expect(tablet.getByText("Código inválido, já usado ou vencido. Peça um novo ao gestor.")).toBeVisible();

    await entrar(page, dono.email, novaSenhaDono);
    await page.goto("/equipe");
    await page.getByRole("button", { name: "Conectar aparelho" }).click();
    const codigo = (await page.getByText(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/).innerText()).trim();

    await tablet.getByPlaceholder("K7M4-9QPX").fill(codigo);
    await tablet.getByRole("button", { name: "Conectar" }).click();
    await tablet.getByRole("button", { name: cozinheiro }).click();
    await tablet.getByRole("button", { name: "Escala", exact: true }).click();
    const main = tablet.getByRole("main");
    await expect(main.getByText("Só o gestor altera a escala.")).toBeVisible();
    await expect(main.getByText("Bruno Chapa").first()).toBeVisible();
    await expect(main.getByText("Ausente").first()).toBeVisible();
    const texto = await main.innerText();
    expect(texto).not.toMatch(/Afastamento|Afastado|INSS|Laudo/);
    const botoes = await main.getByRole("button").allInnerTexts();
    expect(botoes.every((b) => /^(Todos|Cozinha|Salão|Bar|Apoio|)$/.test(b.trim()))).toBe(true);
    await tablet.context().close();
  });

  // PEDIDOS DA COZINHA (2026-09-26): fornecedor com agenda → tablet pede → quem compra resolve (no celular).
  test("estoquista cadastra a agenda do fornecedor; tablet pede hortifrúti com o prazo; estoquista marca comprado no celular", async ({ browser }) => {
    const celular = await (await browser.newContext({ baseURL: "http://127.0.0.1:3000", locale: "pt-BR", timezoneId: "America/Sao_Paulo", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
    await entrar(celular, estoquista.usuario, estoquista.senha);
    await expect(celular).toHaveURL(/\/estoque$/);
    await celular.getByRole("button", { name: "+ Novo fornecedor" }).click();
    await celular.getByLabel("Empresa").fill(`Horta ${RODADA}`);
    await celular.getByLabel("Telefone").fill("(11) 98888-7777");
    await celular.getByRole("button", { name: "Hortifrúti", exact: true }).click();
    for (const dia of ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]) await celular.getByRole("button", { name: dia, exact: true }).click();
    await celular.getByLabel("Recebe pedido até").fill("23:59");
    await celular.getByLabel("Antecedência").selectOption("0");
    await celular.getByRole("button", { name: "Salvar fornecedor" }).click();
    await expect(celular.getByText(`Horta ${RODADA}`, { exact: true })).toBeVisible();
    const { data: forn } = await admin().from("fornecedores").select("entrega_dias, pedido_ate, pedido_antecedencia, categorias_pedido").eq("cliente_id", clienteId).single();
    expect(forn).toEqual({ entrega_dias: [0, 1, 2, 3, 4, 5, 6], pedido_ate: "23:59:00", pedido_antecedencia: 0, categorias_pedido: ["hortifruti"] });

    // Tablet novo (o código anterior já foi usado).
    const dono2 = await novaAba(browser);
    await entrar(dono2, dono.email, novaSenhaDono);
    await dono2.goto("/equipe");
    await dono2.getByRole("button", { name: "Conectar aparelho" }).click();
    const codigo = (await dono2.getByText(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/).innerText()).trim();
    await dono2.context().close();
    const tablet = await novaAba(browser);
    await tablet.goto("/cozinha");
    await tablet.getByPlaceholder("K7M4-9QPX").fill(codigo);
    await tablet.getByRole("button", { name: "Conectar" }).click();
    await tablet.getByRole("button", { name: cozinheiro }).click();
    await tablet.getByRole("button", { name: "Pedidos" }).click();
    await expect(tablet.getByText(/Peça até hoje às 23h59 pra chegar/)).toBeVisible();
    await expect(tablet.getByText(`Horta ${RODADA}`)).toBeVisible();
    await tablet.getByLabel("O que precisa?").fill("Coentro");
    await tablet.getByLabel("Quanto (opcional)").fill("3");
    await tablet.getByLabel("Unidade").selectOption("maço");
    await tablet.getByRole("button", { name: "Pedir em hortifrúti" }).click();
    await expect(tablet.getByRole("region", { name: "Pedido de Hortifrúti pendente" }).getByText("Coentro")).toBeVisible();

    await celular.reload();
    await expect(celular.getByText("Pedidos da cozinha · 1")).toBeVisible();
    await expect(celular.getByText(`Horta ${RODADA}: peça até hoje às 23h59`, { exact: false })).toBeVisible();
    await celular.getByRole("button", { name: "Marcar Coentro como comprado" }).click();
    await expect(celular.getByText("Nenhum pedido pendente.", { exact: false })).toBeVisible();
    const { data: req } = await admin().from("requisicoes").select("descricao, quantidade, unidade, status, responsavel, resolvido_em").eq("cliente_id", clienteId).single();
    expect(req).toMatchObject({ descricao: "Coentro", quantidade: 3, unidade: "maço", status: "comprado", responsavel: cozinheiro });
    expect(req!.resolvido_em).toBeTruthy();
    expect(await celular.evaluate(() => document.documentElement.scrollWidth), "Estoque sem rolagem lateral no celular").toBeLessThanOrEqual(390);

    await tablet.reload();
    await tablet.getByRole("button", { name: "Pedidos" }).click();
    await expect(tablet.getByRole("region", { name: "Comprados nos últimos dias" }).getByText(/Coentro/)).toBeVisible();
    await tablet.context().close();
    await celular.context().close();
  });

  test("prontuário e banco de extras gravam no banco", async ({ page }) => {
    await entrar(page, gestor.usuario, gestor.senha);
    await page.goto("/escalas");
    await page.getByRole("tab", { name: /^Equipe/ }).click();
    await page.getByRole("region", { name: "Perfil da equipe" }).locator("li").filter({ hasText: "Bruno Chapa" }).getByRole("button", { name: "Prontuário" }).click();
    const dlg = page.getByRole("dialog", { name: "Prontuário de Bruno Chapa" });
    await dlg.getByRole("radio", { name: /^Pleno/ }).click();
    await dlg.getByRole("group", { name: "Praças de domínio" }).getByRole("button", { name: "Chapa" }).click();
    await dlg.getByRole("button", { name: "Salvar perfil" }).click();
    await expect(dlg.getByText("Perfil salvo.")).toBeVisible();
    await dlg.getByLabel("Texto da nota").fill("Segurou a chapa no sábado.");
    await dlg.getByRole("button", { name: "Registrar nota" }).click();
    await expect(dlg.getByText("por Gil Gestor")).toBeVisible();
    await dlg.getByRole("button", { name: "Fechar" }).click();

    const { data: func } = await admin().from("funcionarios").select("id").eq("cliente_id", clienteId).eq("nome", "Bruno Chapa").single();
    const { data: perfil } = await admin().from("perfil_funcionario").select("nivel, pracas").eq("funcionario_id", func!.id).single();
    expect(perfil).toEqual({ nivel: "pleno", pracas: ["Chapa"] });

    await page.getByRole("tab", { name: "Extras" }).click();
    await page.getByRole("button", { name: "Adicionar extra" }).click();
    const fe = page.getByRole("dialog", { name: "Novo extra" });
    await fe.getByLabel("Nome").fill("Lia Extra");
    await fe.getByLabel("Telefone com DDD").fill("(11) 98765-4321");
    await fe.getByLabel("Cargos que cobre: adicionar outra").fill("Cozinheiro");
    await fe.getByLabel("Cargos que cobre: adicionar outra").press("Enter");
    await fe.getByRole("radio", { name: "Sênior" }).click();
    await fe.getByRole("group", { name: "Praças do extra" }).getByRole("button", { name: "Chapa" }).click();
    await fe.getByText("A pessoa autorizou receber convites").click();
    await fe.getByRole("button", { name: "Adicionar extra" }).click();
    await expect(page.getByText("WhatsApp autorizado").first()).toBeVisible();

    const { data: extra } = await admin().from("banco_extras").select("telefone, nivel, pracas, aceita_whatsapp, consentimento_em").eq("cliente_id", clienteId).single();
    expect(extra).toMatchObject({ telefone: "5511987654321", nivel: "senior", pracas: ["Chapa"], aceita_whatsapp: true });
    expect(extra!.consentimento_em, "data do consentimento gravada").toBeTruthy();
  });
  // PLANO 9,5, etapa 3 (2026-09-26): LGPD — baixar e excluir os dados.
  test("só o dono baixa todos os dados do restaurante, sem segredo técnico", async ({ page }) => {
    await entrar(page, estoquista.usuario, estoquista.senha);
    expect((await page.request.get("/conta/exportar")).status()).toBe(403);
    await page.context().clearCookies();

    await entrar(page, dono.email, novaSenhaDono);
    await page.goto("/configuracoes");
    const [arquivo] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Baixar todos os dados" }).click()]);
    expect(arquivo.suggestedFilename()).toMatch(/^ficha-tecnica-bistro-.*\.json$/);
    const texto = await readFile((await arquivo.path())!, "utf8");
    const dados = JSON.parse(texto);
    expect(dados.restaurante).toBe(dono.restaurante);
    expect(dados.conta_do_dono.email).toBe(dono.email);
    expect(dados.tabelas.clientes).toHaveLength(1);
    expect(dados.tabelas.insumos.length).toBeGreaterThan(0);
    expect(dados.tabelas.producoes.length).toBeGreaterThan(0);
    expect(dados.tabelas.membros.map((m: { nome: string }) => m.nome)).toEqual(expect.arrayContaining([gestor.nome, estoquista.nome]));
    expect(dados.tabelas.banco_extras[0].nome).toBe("Lia Extra");
    expect(texto).not.toContain("codigo_hash");
    expect(texto).not.toContain("user_id");
  });

  test("dono exclui o restaurante: dados, fotos e acessos da equipe somem", async ({ page }) => {
    const foto = `${clienteId}/teste-exclusao.png`;
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
    const { error: erroFoto } = await admin().storage.from("receitas-fotos").upload(foto, png, { contentType: "image/png" });
    expect(erroFoto).toBeNull();

    await entrar(page, gestor.usuario, gestor.senha);
    await page.goto("/configuracoes");
    await expect(page.getByText("Tema", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Excluir restaurante/ })).toHaveCount(0);
    await page.context().clearCookies();

    await entrar(page, dono.email, novaSenhaDono);
    await page.goto("/configuracoes");
    await page.getByRole("button", { name: /Excluir restaurante/ }).click();
    await page.getByLabel(/digite o nome do restaurante/).fill("outro nome");
    await page.getByRole("button", { name: "Excluir para sempre" }).click();
    await expect(page.getByText(/Digite o nome do restaurante exatamente/)).toBeVisible();
    expect((await admin().from("clientes").select("id").eq("id", clienteId)).data).toHaveLength(1);

    await page.getByLabel(/digite o nome do restaurante/).fill(dono.restaurante);
    await page.getByRole("button", { name: "Excluir para sempre" }).click();
    await expect(page).toHaveURL(/\/login\?aviso=conta-excluida$/);
    await expect(page.getByText("Restaurante excluído.")).toBeVisible();

    for (const tabela of ["clientes", "membros", "insumos", "receitas", "producoes", "funcionarios", "banco_extras"]) {
      const coluna = tabela === "clientes" ? "id" : "cliente_id";
      const { count } = await admin().from(tabela).select("*", { count: "exact", head: true }).eq(coluna, clienteId);
      expect(count, tabela).toBe(0);
    }
    const { data: restantes } = await admin().storage.from("receitas-fotos").list(clienteId);
    expect(restantes ?? []).toHaveLength(0);

    await entrar(page, gestor.usuario, gestor.senha, { esperaEntrar: false });
    await expect(page.getByText("Usuário, e-mail ou senha incorretos.")).toBeVisible();
    await entrar(page, dono.email, novaSenhaDono, { esperaEntrar: false });
    await expect(page.getByText("Usuário, e-mail ou senha incorretos.")).toBeVisible();
  });
});
