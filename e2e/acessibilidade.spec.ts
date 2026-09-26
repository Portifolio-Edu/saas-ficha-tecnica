// PLANO 9,5 (2026-09-26): acessibilidade (axe, regras WCAG 2.1 A/AA) nas telas
// principais, nos dois temas. As telas de demonstração usam os mesmos
// componentes das telas logadas, então cobrem o sistema sem precisar de login.
// Falha se aparecer qualquer violação séria ou crítica.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const TELAS = [
  "/login",
  "/cadastro",
  "/recuperar-senha",
  "/termos",
  "/preview/visao-geral",
  "/preview/receitas",
  "/preview/insumos",
  "/preview/estoque",
  "/preview/producoes",
  "/preview/cmv",
  "/preview/checklists",
  "/preview/seguranca",
  "/preview/relatorios",
  "/preview/escalas",
  "/preview/equipe",
  "/preview/cozinha",
  "/preview/proteinas",
  "/preview/nutricional",
  "/preview/integracoes",
  "/preview/configuracoes",
  "/preview/consulta",
];

for (const tema of ["light", "dark"] as const) {
  for (const tela of TELAS) {
    test(`${tela} (${tema === "light" ? "claro" : "escuro"}) sem violação séria`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("tema", t), tema);
      await page.goto(tela);
      await page.waitForLoadState("networkidle");
      const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const graves = resultado.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      const resumo = graves.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}× — ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
      expect(resumo, resumo.join("\n")).toEqual([]);
    });
  }
}

// Celular (390 px): o menu vira gaveta e várias telas trocam de layout.
test.describe("celular", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const tela of TELAS) {
    test(`${tela} (celular) sem violação séria`, async ({ page }) => {
      await page.goto(tela);
      await page.waitForLoadState("networkidle");
      const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const graves = resultado.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      const resumo = graves.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}× — ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
      expect(resumo, resumo.join("\n")).toEqual([]);
    });
  }
});
