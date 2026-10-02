// PRAÇAS NA COZINHA (2026-10-02): a montagem das praças no modo cozinha
// (pedido do dono: "pra que seja tudo montado sempre no padrão"). Confere:
// cada praça com as áreas e a lista; conferir um item atualiza a praça, o
// número do menu e o atalho em Checklists (o mesmo registro); foto amplia,
// troca e fecha devolvendo o foco; sem violação de acessibilidade.
// PRAÇAS DA CASA (2026-10-02): "as praças têm que ser as mesmas cadastradas
// no sistema de gestão": praça criada na gestão (com área, item e foto)
// aparece igual na cozinha e vira a opção de praça em Equipe/Extras.
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// 1x1 px: só pra ter "foto" na demo de teste (a demo real não tem foto inventada).
const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function semViolacao(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const graves = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(graves.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
}

test.describe("praças no modo cozinha", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("cozinha:responsavel", "Ana"));
  });

  test("conferir um item na praça atualiza a praça, o menu e o atalho em Checklists", async ({ page }) => {
    await page.goto("/preview/cozinha");
    const menu = page.getByRole("navigation", { name: "Seções da cozinha" });
    await menu.getByRole("button", { name: /^Praças/ }).click();
    await expect(page.getByRole("heading", { name: "Praças", level: 1 })).toBeVisible();
    for (const nome of ["Praça de pizza", "Praça quente (fogão)", "Garde manger (frios)"]) await expect(page.getByRole("button", { name: new RegExp(nome.replace(/[()]/g, "\\$&")) })).toBeVisible();
    await expect(menu.getByRole("button", { name: "Praças 12" })).toBeVisible();

    await page.getByRole("button", { name: /Praça de pizza/ }).click();
    await expect(page.getByText("5 de 9 conferidos hoje")).toBeVisible();
    for (const area of ["Bancada de montagem", "Geladeira de apoio", "Forno"]) await expect(page.getByRole("heading", { name: area, level: 2 })).toBeVisible();
    await expect(page.getByText("Sem foto de como fica montada").first()).toBeVisible();

    const item = page.getByRole("button", { name: "Calabresa fatiada em 1 cuba 1/6" });
    await expect(item).toHaveAttribute("aria-pressed", "false");
    await item.click();
    await expect(item).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("6 de 9 conferidos hoje")).toBeVisible();
    await expect(menu.getByRole("button", { name: "Praças 11" })).toBeVisible();
    await semViolacao(page);

    // Checklists: as praças não se repetem lá; o atalho mostra o mesmo número.
    await menu.getByRole("button", { name: /^Checklists/ }).click();
    const atalho = page.getByRole("button", { name: /Montagem das praças/ });
    await expect(atalho).toContainText("11 itens pra conferir");
    await expect(page.getByRole("button", { name: /Praça de pizza/ })).toHaveCount(0);
    await atalho.click();
    await expect(page.getByRole("heading", { name: "Praça de pizza", level: 1 })).toBeVisible();
  });

  test("foto da área amplia, troca e fecha devolvendo o foco", async ({ page }) => {
    await page.addInitScript((pixel) => {
      const item = (id: string, area: string, texto: string, ordem: number) => ({ id, checklistId: "p1", texto, ordem, concluidoHoje: false, areaId: area });
      localStorage.setItem(
        "demo_checklists",
        JSON.stringify([
          {
            id: "p1",
            nome: "Praça de teste",
            momento: "praca",
            areas: [{ id: "a1", checklistId: "p1", nome: "Bancada", ordem: 1 }],
            fotos: [
              { id: "f1", checklistId: "p1", url: pixel, legenda: "Vista de frente", ordem: 1, areaId: "a1" },
              { id: "f2", checklistId: "p1", url: pixel, legenda: "Vista de cima", ordem: 2, areaId: "a1" },
            ],
            itens: [item("i1", "a1", "Molho em 2 cubas", 1)],
          },
        ]),
      );
    }, PIXEL);
    await page.goto("/preview/cozinha");
    await page.getByRole("navigation", { name: "Seções da cozinha" }).getByRole("button", { name: /^Praças/ }).click();
    await page.getByRole("button", { name: /Praça de teste/ }).click();

    const ampliar = page.getByRole("button", { name: "Ampliar foto de Bancada: Vista de frente" });
    await expect(page.getByText("Vista de frente")).toBeVisible();
    await page.getByRole("button", { name: "Foto 2: Vista de cima" }).click();
    await expect(page.getByRole("button", { name: "Ampliar foto de Bancada: Vista de cima" })).toBeVisible();
    await page.getByRole("button", { name: "Foto 1: Vista de frente" }).click();

    await ampliar.click();
    const foto = page.getByRole("dialog", { name: "Bancada · Vista de frente" });
    await expect(foto).toBeVisible();
    await expect(foto.getByRole("button", { name: "Fechar" })).toBeFocused();
    await expect(foto.getByText("1 de 2")).toBeVisible();
    await semViolacao(page);
    await foto.getByRole("button", { name: "Próxima foto" }).click();
    await expect(page.getByRole("dialog", { name: "Bancada · Vista de cima" }).getByText("2 de 2")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(ampliar).toBeFocused();
  });

  test("praça cadastrada na gestão aparece igual na cozinha e nas praças da equipe", async ({ page }) => {
    // Gestão: nova praça com uma área, um item e a foto da área montada.
    await page.goto("/preview/checklists");
    await page.getByRole("tab", { name: /^Praças/ }).click();
    await page.getByRole("button", { name: "Nova praça" }).click();
    await page.getByPlaceholder(/Nome da praça/).fill("Praça de sobremesas");
    await page.getByRole("button", { name: "Criar praça" }).click();
    await page.getByRole("button", { name: /Praça de sobremesas/ }).click();
    await page.getByPlaceholder(/Nome da área/).fill("Bancada de finalização");
    await page.getByRole("button", { name: "Criar área" }).click();
    await page.getByRole("button", { name: "Editar praça" }).click();
    await page.getByRole("textbox", { name: "Novo item em Bancada de finalização" }).fill("Calda de chocolate no bico dosador");
    await page.getByRole("button", { name: "Adicionar" }).first().click();
    await page.getByRole("button", { name: "Pronto" }).click();
    const png = Buffer.from(PIXEL.split(",")[1], "base64");
    await page.getByLabel("Foto da praça").first().setInputFiles({ name: "bancada.png", mimeType: "image/png", buffer: png });
    await page.getByRole("button", { name: "Salvar foto" }).click();
    await expect(page.getByRole("button", { name: /Ampliar foto de Bancada de finalização/ })).toBeVisible();

    // Cozinha (depois de recarregar): a mesma praça, área, item e foto.
    await page.goto("/preview/cozinha");
    await page.getByRole("navigation", { name: "Seções da cozinha" }).getByRole("button", { name: /^Praças/ }).click();
    await page.getByRole("button", { name: /Praça de sobremesas/ }).click();
    await expect(page.getByRole("heading", { name: "Bancada de finalização", level: 2 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Calda de chocolate no bico dosador" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Ampliar foto de Bancada de finalização/ })).toBeVisible();

    // Equipe/Extras: as praças da cozinha são as cadastradas (não a lista genérica).
    await page.goto("/preview/escalas");
    await page.getByRole("tab", { name: "Extras" }).click();
    await page.getByRole("button", { name: "Adicionar extra" }).click();
    const pracas = page.getByRole("group", { name: "Praças do extra" });
    for (const nome of ["Praça de sobremesas", "Praça de pizza", "Garde manger (frios)"]) await expect(pracas.getByRole("button", { name: nome })).toBeVisible();
    await expect(pracas.getByRole("button", { name: "Grelha" })).toHaveCount(0);
    await expect(page.getByText("as opções são as praças cadastradas em Checklists → Praças")).toBeVisible();
  });
});
