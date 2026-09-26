// CELULAR (2026-09-26): dono, gestor e estoquista usam muito fora do
// restaurante. Nenhuma tela pode rolar pro lado no celular (sinal de tabela
// larga sem versão de lista) e a barra de baixo leva aos destinos do papel.
import { test, expect } from "@playwright/test";

const TELAS = [
  "visao-geral", "receitas", "insumos", "estoque", "producoes", "cmv", "checklists", "seguranca",
  "relatorios", "escalas", "equipe", "proteinas", "nutricional", "integracoes", "configuracoes", "consulta",
];

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

for (const papel of ["dono", "estoquista"] as const) {
  test(`${papel}: nenhuma tela rola pro lado no celular`, async ({ page }) => {
    await page.addInitScript((p) => localStorage.setItem("demo:papel", p), papel);
    const largas: string[] = [];
    for (const tela of TELAS) {
      await page.goto(`/preview/${tela}`);
      await page.waitForLoadState("networkidle");
      const largura = await page.evaluate(() => document.documentElement.scrollWidth);
      if (largura > 390) largas.push(`${tela} (${largura}px)`);
    }
    expect(largas, `telas mais largas que o celular: ${largas.join(", ")}`).toEqual([]);
  });
}

test("barra de baixo: atalhos do papel e o Menu com o resto", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("demo:papel", "estoquista"));
  await page.goto("/preview/estoque");
  const barra = page.getByRole("navigation", { name: "Atalhos" });
  await expect(barra.getByRole("link")).toHaveText(["Estoque", "Insumos", "Proteínas", "CMV"]);
  await expect(barra.getByRole("link", { name: "Estoque" })).toHaveAttribute("aria-current", "page");
  await barra.getByRole("link", { name: "Insumos" }).click();
  await expect(page).toHaveURL(/\/preview\/insumos$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Insumos");
  await barra.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("navigation", { name: "Seções" }).last().getByRole("link", { name: "Manipulação de proteínas" })).toBeVisible();
});

test("escala no celular: agenda do dia com turno; tocar na pessoa abre o detalhe", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("demo:papel", "gestor"));
  await page.goto("/preview/escalas");
  const dias = page.getByRole("tablist", { name: "Dia" });
  await expect(dias.getByRole("tab", { selected: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: /^Hoje, / })).toBeVisible();
  const equipe = page.getByRole("region", { name: /Cozinha · Cozinheiro/i }).first();
  await expect(equipe.getByText(/trabalhando/)).toBeVisible();
  const pessoa = equipe.getByRole("button").first();
  await pessoa.click();
  await expect(pessoa).toHaveAttribute("aria-expanded", "true");
  const detalhe = equipe.getByRole("region", { name: "Detalhe do dia" });
  await expect(detalhe.getByRole("button", { name: "Lançar ocorrência" })).toBeInViewport();
  await detalhe.getByRole("button", { name: "Prontuário" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
