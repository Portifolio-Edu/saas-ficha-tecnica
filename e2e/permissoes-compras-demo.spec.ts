import { test, expect } from "@playwright/test";

test("demo compartilha a delegação entre Configurações e Compras e registra estoque como aprovador", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("demo:papel", "gestor"));
  await page.goto("/preview/configuracoes?secao=compras");
  const permissao = () => page.getByRole("switch", { name: "Permitir que o estoque aprove e rejeite compras", exact: true });
  await permissao().check();
  await page.getByRole("button", { name: "Salvar permissões", exact: true }).click();
  await expect(page.getByText("Permissões de compras salvas.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Ver como/ }).click();
  await page.getByRole("option", { name: /^Estoquista/ }).click();
  await page.goto("/preview/estoque/compras");
  await page.getByRole("button", { name: "Aprovar Coentro", exact: true }).click();
  await page.getByRole("button", { name: "Cancelar compra de Coentro", exact: true }).click();
  const historico = page.getByRole("region", { name: "Histórico de compras" });
  await expect(historico.getByText("Aprovado por Estoque (demonstração)", { exact: false })).toBeVisible();
  await page.goto("/preview/configuracoes?secao=compras");
  await expect(permissao()).toHaveCount(0);
  await page.getByRole("button", { name: /^Ver como/ }).click();
  await page.getByRole("option", { name: /^Dono/ }).click();
  await permissao().uncheck();
  await page.getByRole("button", { name: "Salvar permissões", exact: true }).click();
  await expect(page.getByText("Permissões de compras salvas.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Ver como/ }).click();
  await page.getByRole("option", { name: /^Estoquista/ }).click();
  await page.goto("/preview/estoque/compras");
  await expect(page.getByRole("button", { name: /^Aprovar / })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Histórico de compras" }).getByText("Coentro", { exact: false })).toBeVisible();
});
