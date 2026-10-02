// DESEMPENHO (2026-10-02): o que a barra da Vercel apontou no modo cozinha,
// em teste pra não voltar: a tela pulava na carga (CLS 0,14), trocar de
// seção travava o toque (até 352 ms com a CPU de tablet barato) e o botão
// "quem está usando" tinha nome falado diferente do texto escrito.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { esperarHidratado } from "./apoio";

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
    await esperarHidratado(regua);
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
    await esperarHidratado(nome);
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

// DESEMPENHO (2026-10-02): a barra da Vercel mostrou 450 ms de espera num
// toque logo depois de abrir a cozinha: as seções eram preparadas em
// sequência e o toque caía no meio de uma. Agora a preparação espera a pessoa
// ficar parada e só prepara as pesadas.
test.describe("cozinha: preparação em segundo plano", () => {
  test("não prepara seção enquanto a pessoa toca; prepara quando ela para", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("cozinha:responsavel", "Ana"));
    await page.goto("/preview/cozinha");
    await expect(page.locator('[data-secao="checklists"]')).toBeAttached();
    // Toca na tela (num canto vazio do cabeçalho) a cada 400 ms por 4 s.
    for (let i = 0; i < 10; i++) {
      await page.mouse.click(600, 30);
      await page.waitForTimeout(400);
    }
    await expect(page.locator("[data-secao]")).toHaveCount(1);
    // Parou: as pesadas são preparadas (Produção primeiro); as leves não.
    await expect(page.locator('[data-secao="producao"]')).toBeAttached({ timeout: 8000 });
    await expect(page.locator('[data-secao="temperatura"]')).toHaveCount(0);
  });
});

// DESEMPENHO (2026-10-02): toque lento em produção vira linha no log do
// servidor, dizendo qual script segurou (MedidorToque + /api/desempenho).
test.describe("medidor de toque lento", () => {
  test("toque que trava a tela é relatado ao trocar de aba, com o script culpado", async ({ page }) => {
    // O Playwright não lê o corpo de um sendBeacon: guarda uma cópia antes de mandar.
    await page.addInitScript(() => {
      const original = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = (url, dados) => {
        (window as unknown as { __beacon: unknown }).__beacon = dados;
        return original(url, dados);
      };
    });
    await page.goto("/preview/visao-geral");
    await page.waitForLoadState("networkidle");
    // Um clique que segura a tela por 350 ms (simula código pesado no toque).
    await page.evaluate(() =>
      document.querySelector("main")!.addEventListener("click", () => {
        const fim = performance.now() + 350;
        while (performance.now() < fim);
      }),
    );
    await page.mouse.click(700, 500);
    await page.waitForTimeout(300);
    const resposta = page.waitForResponse((r) => r.url().endsWith("/api/desempenho"));
    // Esconder a aba é quando o navegador manda (o mesmo de trocar de app no celular).
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect((await resposta).status()).toBe(204);
    const relato = JSON.parse(await page.evaluate(() => ((window as unknown as { __beacon: Blob }).__beacon).text())) as {
      rota: string;
      totalMs: number;
      processamentoMs: number;
      scripts: { origem: string; chamada: string }[];
    };
    expect(relato.rota).toBe("/preview/visao-geral");
    expect(relato.totalMs).toBeGreaterThanOrEqual(300);
    expect(relato.processamentoMs).toBeGreaterThanOrEqual(300);
    expect(relato.scripts[0]).toMatchObject({ chamada: expect.stringMatching(/click/) });
  });

  test("servidor só aceita relato do próprio site e bem formado", async ({ request }) => {
    const valido = { rota: "/visao-geral", evento: "click", alvo: "div", atrasoMs: 300, processamentoMs: 10, apresentacaoMs: 5, totalMs: 315, segundosDesdeAbertura: 1, scripts: [] };
    expect((await request.post("/api/desempenho", { data: valido, headers: { origin: "https://outro.site" } })).status()).toBe(403);
    expect((await request.post("/api/desempenho", { data: { ...valido, totalMs: 50 } })).status()).toBe(400);
    expect((await request.post("/api/desempenho", { data: "x".repeat(5000) })).status()).toBe(400);
    expect((await request.post("/api/desempenho", { data: valido })).status()).toBe(204);
  });
});
