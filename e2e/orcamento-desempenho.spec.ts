// DESEMPENHO (2026-10-02): orçamento de desempenho de TODAS as telas, pra a
// lentidão no toque não voltar. Antes cada travada era corrigida tela a tela
// depois que a barra da Vercel apontava (régua da meta, Configurações,
// cozinha…). A causa de fundo era a mesma em todas: código pesado baixado e
// executado na abertura da tela (o cliente do Supabase em toda tela do app,
// o Recharts em CMV/Proteínas/Segurança, os dados da demo em Produções),
// segurando o primeiro toque.
//
// Duas travas:
//  1. Peso (não depende da máquina, nunca dá falso alarme): o JS que a tela
//     executa ao abrir cabe no teto e não traz biblioteca pesada que só é
//     usada depois (essas entram com next/dynamic ou import() na hora do uso).
//  2. Maior travada na abertura, com a CPU 4x mais lenta (celular/tablet
//     simples): é o máximo que um toque pode ter de esperar. Medida sem
//     toque simulado de propósito: tocar durante a carga dava números que
//     variavam 5x entre rodadas (dependia de onde o toque caía), e teste
//     que falha à toa é pior que nenhum. Cada tela abre 2 vezes e vale a
//     menor: pico isolado da máquina não reprova, regressão de verdade sim.
//
// Tela nova: entra sozinha na lista se seguir as rotas de src/app. Se o teste
// falhar, a mensagem diz a tela, o peso e o que entrou indevidamente.
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { RODADA, admin, entrar } from "./apoio";

/** JS executado na abertura de cada tela (comprimido, como vai pela rede). Hoje a maior tem ~195 KB. */
const TETO_KB = 215;
/**
 * Maior travada na abertura, CPU 4x. Medido em 2026-10-02: app 160–260 ms em
 * toda tela; demo 180–550 ms (Escalas desenha o mês inteiro; CMV, Proteínas e
 * Segurança montam o gráfico logo depois de abrir). 750 ms com CPU 4x ≈ 190 ms
 * num computador comum, o limite do "bom" no Core Web Vitals.
 */
const TETO_TRAVADA_APP_MS = 450;
const TETO_TRAVADA_DEMO_MS = 750;

/** Bibliotecas que só servem depois de uma ação (ou só na demo): não podem vir na abertura. */
const PROIBIDOS: { nome: string; marca: RegExp; soNoApp?: boolean }[] = [
  { nome: "cliente do Supabase no navegador (só pra Sair; use import() no clique)", marca: /GoTrueClient/ },
  { nome: "Recharts (gráficos; use next/dynamic com <EspacoDoGrafico/>)", marca: /recharts-surface/ },
  { nome: "@react-pdf (PDF; carregue no clique de baixar)", marca: /@react-pdf|PDFDocument/ },
  { nome: "dados de exemplo da demo (src/app/preview/fixtures.ts)", marca: /local-camara-carnes/, soNoApp: true },
];

const PAGINAS = path.join(__dirname, "..", "src", "app");
const rotasCom = (base: string) =>
  fs
    .readdirSync(path.join(PAGINAS, base))
    .filter((d) => fs.existsSync(path.join(PAGINAS, base, d, "page.tsx")))
    .map((d) => `/${base ? `${base}/` : ""}${d}`);

const ROTAS_DEMO = rotasCom("preview");
/** Telas do app logado (as públicas e as de conta ficam de fora: não têm o menu nem dados). */
const ROTAS_APP = rotasCom("").filter((r) => !["/preview", "/cadastro", "/login", "/nova-senha", "/recuperar-senha", "/privacidade", "/termos", "/consulta"].includes(r));

type Peso = { kb: number; proibidos: string[] };

/** Lê os <script> que o HTML da tela manda executar ao abrir e mede/inspeciona cada um. */
async function pesoDaAbertura(page: Page, rota: string, cache: Map<string, string>): Promise<Peso> {
  const resp = await page.request.get(rota);
  expect(resp.ok(), `${rota} abriu`).toBe(true);
  expect(new URL(resp.url()).pathname, `${rota} não redirecionou`).toBe(rota);
  const html = await resp.text();
  // noModule: polyfills só pra navegador antigo; os atuais nem baixam.
  const scripts = [...new Set([...html.matchAll(/<script([^>]*)>/g)].filter((m) => !/nomodule/i.test(m[1])).map((m) => m[1].match(/src="([^"]+\.js)"/)?.[1]))].filter(
    (s): s is string => !!s,
  );
  let bytes = 0;
  const proibidos = new Set<string>();
  for (const src of scripts) {
    if (!cache.has(src)) cache.set(src, await (await page.request.get(src)).text());
    const codigo = cache.get(src)!;
    bytes += zlib.gzipSync(codigo).length;
    for (const p of PROIBIDOS) if ((!p.soNoApp || !rota.startsWith("/preview")) && p.marca.test(codigo)) proibidos.add(p.nome);
  }
  return { kb: Math.round(bytes / 1024), proibidos: [...proibidos] };
}

async function conferirPesos(page: Page, rotas: string[]) {
  const cache = new Map<string, string>();
  const problemas: string[] = [];
  for (const rota of rotas) {
    const { kb, proibidos } = await pesoDaAbertura(page, rota, cache);
    if (kb > TETO_KB) problemas.push(`${rota}: ${kb} KB na abertura (teto ${TETO_KB} KB)`);
    for (const p of proibidos) problemas.push(`${rota}: abre com ${p}`);
  }
  expect(problemas, "telas acima do orçamento").toEqual([]);
}

/** Abre a tela com CPU 4x e devolve a maior travada (Long Animation Frame) até ela assentar. */
async function maiorTravada(page: Page, rota: string): Promise<number> {
  const medidas: number[] = [];
  for (let i = 0; i < 2; i++) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.goto(rota);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    medidas.push(
      await page.evaluate(
        () =>
          new Promise<number>((ok) => {
            // Sem nenhuma travada o observador não chama: aí é 0.
            setTimeout(() => ok(0), 500);
            new PerformanceObserver((l, o) => {
              o.disconnect();
              ok(Math.max(0, ...l.getEntries().map((e) => e.duration)));
            }).observe({ type: "long-animation-frame", buffered: true });
          }),
      ),
    );
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await cdp.detach();
  }
  return Math.round(Math.min(...medidas));
}

async function conferirTravadas(page: Page, rotas: string[], teto: number) {
  const lentas: string[] = [];
  for (const rota of rotas) {
    const ms = await maiorTravada(page, rota);
    if (ms > teto) lentas.push(`${rota}: ${ms} ms`);
  }
  expect(lentas, `telas que travam mais de ${teto} ms ao abrir (CPU 4x)`).toEqual([]);
}

test.describe("orçamento de desempenho: demo", () => {
  test("toda tela da demo abre leve, sem biblioteca pesada", async ({ page }) => {
    expect(ROTAS_DEMO.length).toBeGreaterThan(10);
    await conferirPesos(page, ROTAS_DEMO);
  });

  test("nenhuma tela da demo trava ao abrir (CPU 4x)", async ({ page }) => {
    test.setTimeout(ROTAS_DEMO.length * 20_000);
    await page.addInitScript(() => localStorage.setItem("cozinha:responsavel", "Ana"));
    await conferirTravadas(page, ROTAS_DEMO, TETO_TRAVADA_DEMO_MS);
  });

  test("gráficos sob demanda aparecem", async ({ page }) => {
    for (const rota of ["/preview/cmv", "/preview/proteinas", "/preview/seguranca"]) {
      await page.goto(rota);
      await expect(page.locator(".recharts-surface").first(), `${rota} desenha o gráfico`).toBeVisible();
    }
  });
});

test.describe.serial("orçamento de desempenho: app logado", () => {
  const email = `orcamento.${RODADA}@exemplo.com`;
  const senha = "orcamento-senha-123";
  let userId = "";

  test.beforeAll(async () => {
    const u = await admin().auth.admin.createUser({ email, password: senha, email_confirm: true });
    expect(u.error).toBeNull();
    userId = u.data.user!.id;
    const { error } = await admin()
      .from("clientes")
      .insert({ user_id: userId, nome: "Dono Orçamento", nome_restaurante: `Orçamento ${RODADA}`, telefone: `55119${String(Date.now()).slice(-8)}` });
    expect(error).toBeNull();
  });

  test.afterAll(async () => {
    if (userId) await admin().auth.admin.deleteUser(userId);
  });

  test("toda tela do app abre leve, sem biblioteca pesada", async ({ page }) => {
    expect(ROTAS_APP.length).toBeGreaterThan(10);
    await entrar(page, email, senha);
    await conferirPesos(page, ROTAS_APP);
  });

  test("nenhuma tela do app trava ao abrir (CPU 4x)", async ({ page }) => {
    test.setTimeout(ROTAS_APP.length * 20_000);
    await entrar(page, email, senha);
    await conferirTravadas(page, ROTAS_APP, TETO_TRAVADA_APP_MS);
  });

  test("sair da conta continua funcionando (o cliente do Supabase vem só no clique)", async ({ page }) => {
    await entrar(page, email, senha);
    await page.goto("/configuracoes");
    await page.getByRole("button", { name: /^Conta de / }).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
    await page.waitForURL(/\/login/);
    await page.goto("/visao-geral");
    await expect(page).toHaveURL(/\/login/);
  });
});
