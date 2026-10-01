// PLANO 9,5 (2026-09-26): testes de ponta a ponta com login real (etapa 2).
// Rodam contra o app de verdade ligado a um Supabase LOCAL (`supabase start`),
// nunca contra produção. Antes: `source e2e/ambiente.sh` e `npm run build`.
// Rodar: `npm run e2e`. No CI: job "Ponta a ponta" em .github/workflows/ci.yml.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  // Um restaurante por rodada, com estado que passa de um teste pro outro
  // (cadastro → acessos → tablet → escala): roda em ordem, um de cada vez.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx next start -H 127.0.0.1 -p 3000",
    url: "http://127.0.0.1:3000/login",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
