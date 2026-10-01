// RÓTULO PARA VAREJO (2026-09-26): na demo (lasanha congelada pro
// supermercado). Confere a prévia no formato da norma, a revisão antes da
// gráfica, a coerência glúten × alergênicos, o PDF e a acessibilidade da tela
// com o formulário aberto, nos dois temas.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("rótulo para varejo: prévia no formato ANVISA, revisão e PDF", async ({ page }) => {
  await page.goto("/preview/nutricional");
  await page.getByRole("button", { name: "Lasanha Bolonhesa" }).click();
  await expect(page.getByRole("tab", { name: "Rótulo para varejo (supermercado)" })).toHaveAttribute("aria-selected", "true");

  const previa = page.getByLabel("Prévia do rótulo para varejo");
  await expect(previa.getByText("ALÉRGICOS: CONTÉM LEITE E DERIVADOS DE TRIGO E OVOS. PODE CONTER SOJA.")).toBeVisible();
  await expect(previa.getByText("CONTÉM GLÚTEN", { exact: false })).toBeVisible();
  await expect(previa.getByText(/^INGREDIENTES: /)).toBeVisible();
  await expect(previa.getByText("Porção: 400 g (1 pedaço)", { exact: false })).toBeVisible();
  for (const coluna of ["100 g", "400 g", "%VD*"]) await expect(previa.getByRole("columnheader", { name: coluna })).toBeVisible();
  for (const nutriente of ["Valor energético (kcal / kJ)", "Açúcares totais (g)", "Açúcares adicionados (g)", "Gorduras saturadas (g)", "Gorduras trans (g)", "Fibras alimentares (g)", "Sódio (mg)"])
    await expect(previa.getByRole("cell", { name: nutriente })).toBeVisible();

  const revisao = page.getByRole("region", { name: "Revisão antes da gráfica" });
  await expect(revisao.getByText("Pronto pra gráfica")).toBeVisible();

  // Glúten contra os alergênicos: bloqueia.
  await revisao.getByRole("button", { name: "Editar dados do rótulo" }).click();
  await page.getByRole("radio", { name: "NÃO CONTÉM GLÚTEN" }).click();
  await expect(page.getByText("o certo é “CONTÉM GLÚTEN”", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Salvar dados do rótulo" }).click();
  await expect(revisao.getByText("Glúten não bate com os alergênicos")).toBeVisible();
  await expect(revisao.getByRole("button", { name: "PDF (rascunho)" })).toBeVisible();
  await page.getByRole("radio", { name: "CONTÉM GLÚTEN", exact: true }).click();
  await page.getByRole("button", { name: "Salvar dados do rótulo" }).click();
  await expect(revisao.getByText("Pronto pra gráfica")).toBeVisible();

  const download = page.waitForEvent("download");
  await revisao.getByRole("button", { name: "PDF · Rótulo para varejo" }).click();
  expect((await download).suggestedFilename()).toBe("rotulo-varejo-lasanha-bolonhesa.pdf");
});

for (const tema of ["light", "dark"] as const) {
  test(`rótulo para varejo com o formulário aberto (${tema === "light" ? "claro" : "escuro"}) sem violação séria`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("tema", t), tema);
    await page.goto("/preview/nutricional");
    await page.getByRole("button", { name: "Lasanha Bolonhesa" }).click();
    await page.getByRole("button", { name: "Editar dados do rótulo" }).click();
    await expect(page.getByRole("group", { name: "Alergênicos" })).toBeVisible();
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const graves = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(graves.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  });
}
