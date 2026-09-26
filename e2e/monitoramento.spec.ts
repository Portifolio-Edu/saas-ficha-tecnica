// PLANO 9,5, etapa 3 (2026-09-26): erro de servidor em produção vira linha em
// erros_sistema, com o mesmo código que a pessoa vê na tela. Caso real: a
// pessoa confirma o e-mail depois que outro restaurante pegou o WhatsApp dela.
import { test, expect } from "@playwright/test";
import { RODADA, admin, entrar } from "./apoio";

test("erro do servidor aparece com código na tela e fica gravado no banco", async ({ page }) => {
  const inicio = new Date(Date.now() - 1000).toISOString();
  const telefone = `55119${String(Date.now()).slice(-8)}`;
  const senha = "senha-forte-123";
  const primeiro = await admin().auth.admin.createUser({ email: `mon1.${RODADA}@exemplo.com`, password: senha, email_confirm: true });
  const { error: erroCliente } = await admin()
    .from("clientes")
    .insert({ user_id: primeiro.data.user!.id, nome: "Primeiro", nome_restaurante: `Primeiro ${RODADA}`, telefone });
  expect(erroCliente).toBeNull();

  const email = `mon2.${RODADA}@exemplo.com`;
  const segundo = await admin().auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: "Segundo", nome_restaurante: `Segundo ${RODADA}`, telefone },
  });
  expect(segundo.error).toBeNull();

  try {
    await entrar(page, email, senha, { esperaEntrar: false });
    await expect(page.getByRole("heading", { name: "Algo não saiu como esperado" })).toBeVisible();
    const codigo = (await page.locator("p", { hasText: "Código:" }).locator("span").textContent())!.trim();
    expect(codigo).toMatch(/^\d+$/);

    let linha: { origem: string; mensagem: string; rota: string | null } | null = null;
    for (let i = 0; i < 20 && !linha; i++) {
      const { data } = await admin().from("erros_sistema").select("origem, mensagem, rota")
        .eq("digest", codigo)
        .gte("criado_em", inicio)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      linha = data;
      if (!linha) await page.waitForTimeout(250);
    }
    expect(linha, "erro gravado com o mesmo código da tela").toBeTruthy();
    expect(linha!.origem).toBe("servidor");
    expect(linha!.mensagem).toContain("WhatsApp foi cadastrado em outro restaurante");
  } finally {
    await admin().auth.admin.deleteUser(segundo.data.user!.id);
    await admin().auth.admin.deleteUser(primeiro.data.user!.id);
  }
});

test("ninguém de fora lê a tabela de erros", async ({ request }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const r = await request.get(`${url}/rest/v1/erros_sistema?select=id`, { headers: { apikey: chave, Authorization: `Bearer ${chave}` } });
  expect(r.status()).toBe(401);
});
