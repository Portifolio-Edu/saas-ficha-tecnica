import { describe, expect, it } from "vitest";
import { descreverAlvo, origemDoScript, validarRelato } from "../toqueLento";

const SITE = "https://fichatecnica.app";

describe("toque lento: de onde veio o script", () => {
  it("separa o nosso código, extensão do navegador e a barra da Vercel", () => {
    expect(origemDoScript(`${SITE}/_next/static/chunks/abc123.js`, SITE)).toEqual({ origem: "app", arquivo: "abc123.js" });
    expect(origemDoScript("chrome-extension://gighmmpiobklfepjocnamgkkbiglidom/conteudo.js", SITE)).toEqual({ origem: "extensao", arquivo: "gighmmpiobklfepjocnamgkkbiglidom" });
    expect(origemDoScript("https://vercel.live/_next-live/feedback/feedback.js", SITE).origem).toBe("barra-vercel");
    expect(origemDoScript(`${SITE}/configuracoes?secao=conta`, SITE)).toEqual({ origem: "pagina", arquivo: "/configuracoes" });
    expect(origemDoScript("", SITE).origem).toBe("pagina");
    expect(origemDoScript("https://cdn.exemplo.com/x.js", SITE)).toEqual({ origem: "outro", arquivo: "cdn.exemplo.com" });
  });

  it("descreve o elemento como a barra da Vercel, sem texto da pessoa", () => {
    expect(descreverAlvo("DIV", "p-4 md:p-8 flex-1 animate-fade-in")).toBe("div.p-4.md:p-8.flex-1");
    expect(descreverAlvo(undefined, undefined)).toBe("(sem alvo)");
  });
});

describe("toque lento: o que o servidor aceita", () => {
  const base = { rota: "/configuracoes", evento: "pointerdown", alvo: "div.p-4", atrasoMs: 761, processamentoMs: 20, apresentacaoMs: 10, totalMs: 791, segundosDesdeAbertura: 2, scripts: [] };

  it("aceita um relato válido e tira a busca do endereço", () => {
    const r = validarRelato({ ...base, rota: "/configuracoes?secao=conta&token=abc", scripts: [{ origem: "app", arquivo: "a.js", chamada: "classic-script", ms: 700.4 }] });
    expect(r?.rota).toBe("/configuracoes");
    expect(r?.scripts).toEqual([{ origem: "app", arquivo: "a.js", chamada: "classic-script", ms: 700 }]);
  });

  it("recusa toque rápido, rota estranha e lixo", () => {
    expect(validarRelato({ ...base, totalMs: 120 })).toBeNull();
    expect(validarRelato({ ...base, rota: "https://outro.site/" })).toBeNull();
    expect(validarRelato("texto")).toBeNull();
    expect(validarRelato(null)).toBeNull();
  });

  it("limita tamanho e números absurdos", () => {
    const r = validarRelato({ ...base, alvo: "x".repeat(500), atrasoMs: -5, scripts: Array.from({ length: 20 }, () => ({ origem: "hacker", arquivo: "y", chamada: "z", ms: 1e12 })) });
    expect(r?.alvo).toHaveLength(120);
    expect(r?.atrasoMs).toBe(0);
    expect(r?.scripts).toHaveLength(5);
    expect(r?.scripts[0]).toEqual({ origem: "outro", arquivo: "y", chamada: "z", ms: 600_000 });
  });
});
