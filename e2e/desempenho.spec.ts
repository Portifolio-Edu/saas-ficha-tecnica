// DESEMPENHO (2026-10-02): o que a barra da Vercel apontou no modo cozinha,
// em teste pra não voltar: a tela pulava na carga (CLS 0,14), trocar de
// seção travava o toque (até 352 ms com a CPU de tablet barato) e o botão
// "quem está usando" tinha nome falado diferente do texto escrito.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("modo cozinha com alguém usando", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("cozinha:responsavel", "Ana");
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((l) => {
        for (const e of l.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[])
          if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
  });

  test("a tela não pula na carga, nem com o menu recolhido", async ({ page }) => {
    for (const recolhido of ["0", "1"]) {
      await page.addInitScript((r) => localStorage.setItem("cozinha:menu-recolhido", r), recolhido);
      await page.goto("/preview/cozinha");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
      expect(cls, `CLS com menu recolhido=${recolhido}`).toBeLessThan(0.1);
    }
  });

  test("trocar de seção responde rápido mesmo com CPU de tablet barato", async ({ page, context }) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.addInitScript(() => {
      const w = window as unknown as { __cliques: number[] };
      w.__cliques = [];
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (e.name === "click") w.__cliques.push(e.duration);
      }).observe({ type: "event", durationThreshold: 16, buffered: true } as PerformanceObserverInit);
    });
    await page.goto("/preview/cozinha");
    await page.waitForLoadState("networkidle");
    const menu = page.getByRole("navigation", { name: "Seções da cozinha" });
    for (const secao of ["Produção", "Proteínas", "Temperatura", "Fichas", "Checklists"]) {
      await menu.getByRole("button", { name: new RegExp(`^${secao}`) }).click();
      await expect(menu.getByRole("button", { name: new RegExp(`^${secao}`) })).toHaveAttribute("aria-current", "page");
    }
    await page.waitForTimeout(500);
    const pior = await page.evaluate(() => Math.max(0, ...(window as unknown as { __cliques: number[] }).__cliques));
    // "Bom" no Core Web Vitals é até 200 ms; antes, Produção dava 352 ms.
    expect(pior, "clique mais lento (ms)").toBeLessThan(200);
  });

  test("botão de quem está usando: o nome falado começa pelo texto escrito", async ({ page }) => {
    await page.goto("/preview/cozinha");
    await expect(page.getByRole("button", { name: /^Ana\b.*trocar pessoa$/ })).toBeVisible();
    const r = await new AxeBuilder({ page }).withRules(["label-content-name-mismatch"]).analyze();
    expect(r.violations.map((v) => v.nodes.map((n) => n.target.join(" ")).join(", "))).toEqual([]);
  });
});

// DESEMPENHO (2026-10-02): a barra da Vercel apontou 263 ms de espera no
// primeiro toque depois de abrir Configurações e 150 ms na régua da meta.
test.describe("navegação e régua da meta", () => {
  test("trocar de tela não mexe no estilo do <html> (recalcularia a página inteira)", async ({ page }) => {
    await page.goto("/preview/visao-geral");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => {
      const w = window as unknown as { __mexidas: number };
      w.__mexidas = 0;
      new MutationObserver((m) => (w.__mexidas += m.length)).observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    });
    await page.getByRole("link", { name: "Configurações" }).first().click();
    await expect(page.getByRole("button", { name: /Enviar logo|Trocar logo/ })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __mexidas: number }).__mexidas)).toBe(0);
  });

  test("a régua responde na hora e a tela acompanha", async ({ page }) => {
    await page.goto("/preview/visao-geral");
    const regua = page.locator("#meta-casa");
    const inicial = Number(await regua.inputValue());
    await regua.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText(`${inicial + 2}%`, { exact: true })).toBeVisible();
    await expect(page.getByText(`alvo ${inicial + 2}% ·`)).toBeVisible();
    await page.getByRole("button", { name: "Voltar à meta cadastrada" }).click();
    await expect(page.getByText(`alvo ${inicial}% ·`)).toBeVisible();
  });
});

// DESEMPENHO (2026-10-02): trocar de seção em Configurações travava o toque
// (580 ms na barra da Vercel; 656 ms aqui com CPU 4x no primeiro clique).
test.describe("seções das configurações", () => {
  test("trocar de seção responde rápido e não perde o que foi digitado", async ({ page, context }) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.addInitScript(() => {
      const w = window as unknown as { __cliques: number[] };
      w.__cliques = [];
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (e.name === "click") w.__cliques.push(e.duration);
      }).observe({ type: "event", durationThreshold: 16, buffered: true } as PerformanceObserverInit);
    });
    await page.goto("/preview/configuracoes");
    await page.waitForLoadState("networkidle");
    const menu = page.getByRole("navigation", { name: "Seções das configurações" });
    const nome = page.getByRole("textbox", { name: "Nome do restaurante" });
    await nome.fill("Cantina Nova");
    for (const secao of ["Avisos no WhatsApp", "Minha conta", "Aparência", "Plano", "Restaurante"]) {
      await menu.getByRole("link", { name: secao }).click();
      await expect(menu.getByRole("link", { name: secao })).toHaveAttribute("aria-current", "page");
    }
    await expect(nome).toHaveValue("Cantina Nova");
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    const pior = Math.max(...(await page.evaluate(() => (window as unknown as { __cliques: number[] }).__cliques)));
    expect(pior, "pior clique entre seções (ms)").toBeLessThan(200);
  });
});
