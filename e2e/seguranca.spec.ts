// PLANO 9,5 (2026-09-26): proteções da etapa 3 vistas de fora, como um
// navegador ou um atacante veria. Complementa supabase/testes/endurecimento.sql.
import { test, expect } from "@playwright/test";

test("toda página sai com os cabeçalhos de segurança", async ({ request }) => {
  for (const caminho of ["/login", "/cozinha", "/preview/cozinha"]) {
    const resposta = await request.get(caminho, { maxRedirects: 0 });
    const h = resposta.headers();
    expect(h["x-frame-options"], caminho).toBe("DENY");
    expect(h["content-security-policy"], caminho).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"], caminho).toBe("nosniff");
    expect(h["referrer-policy"], caminho).toBe("strict-origin-when-cross-origin");
    expect(h["x-powered-by"], caminho).toBeUndefined();
  }
});

test("link do e-mail não leva pra site de fora", async ({ request }) => {
  const resposta = await request.get("/auth/confirmar?token_hash=x&type=recovery&next=/%5Csite-de-fora.com", { maxRedirects: 0 });
  expect(resposta.status()).toBeGreaterThanOrEqual(300);
  expect(new URL(resposta.headers()["location"]).host).toBe("127.0.0.1:3000");
});

test("gestor e estoquista não pedem senha nova por e-mail", async ({ page }) => {
  await page.goto("/recuperar-senha");
  await page.fill("#email", "gestor.qualquer");
  await page.getByRole("button").filter({ hasText: /Enviar|link/i }).first().click();
  await expect(page.getByText(/pede a senha nova ao dono ou ao gestor/)).toBeVisible();
});

test("visitante sem login não lê tabela nem chama função pela API", async ({ request }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const cab = { apikey: chave, Authorization: `Bearer ${chave}`, "Content-Type": "application/json" };
  const tabela = await request.get(`${url}/rest/v1/clientes?select=id`, { headers: cab });
  expect(tabela.status()).toBe(401);
  for (const funcao of ["auth_cliente_id", "telefone_disponivel"]) {
    const rpc = await request.post(`${url}/rest/v1/rpc/${funcao}`, { headers: cab, data: funcao === "telefone_disponivel" ? { p_telefone: "11987654321" } : {} });
    expect([401, 403, 404], funcao).toContain(rpc.status());
  }
});
