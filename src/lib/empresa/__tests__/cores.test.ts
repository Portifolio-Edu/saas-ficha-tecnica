import { describe, expect, it } from "vitest";
import { ALFA_SUAVE, CORES_DESTAQUE, COR_PADRAO, contraste, corPorValor, cssDaCor, misturar } from "../cores";

// Superfícies de globals.css onde o --marca aparece como texto, ícone ou anel de foco.
const CLARO = { panel: "#ffffff", fundo: "#f6f6f7", elevado: "#f3f3f5" };
const ESCURO = { panel: "#131315", fundo: "#0b0b0c", elevado: "#1a1a1d" };

describe("cores de destaque", () => {
  it("o contraste confere com a referência da WCAG", () => {
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contraste("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

  for (const cor of CORES_DESTAQUE) {
    it(`${cor.nome}: ≥ 4,5:1 nos dois temas, inclusive no fundo tingido`, () => {
      for (const [tema, sup, frente, alfa] of [
        ["claro", CLARO, cor.claro, ALFA_SUAVE.claro],
        ["escuro", ESCURO, cor.escuro, ALFA_SUAVE.escuro],
      ] as const) {
        const fundos = [...Object.values(sup), misturar(frente, sup.panel, alfa)];
        for (const f of fundos) expect(contraste(frente, f), `${tema} ${frente} em ${f}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  it("só aceita cor da lista; o resto volta pro padrão", () => {
    expect(corPorValor("#0F766E").id).toBe("verde-azulado");
    expect(corPorValor("#ff0000")).toBe(COR_PADRAO);
    expect(corPorValor(null)).toBe(COR_PADRAO);
  });

  it("o CSS só sai de valores da lista (nada do banco entra cru)", () => {
    expect(cssDaCor(null)).toBeNull();
    expect(cssDaCor(COR_PADRAO.claro)).toBeNull();
    expect(cssDaCor("#0e7490}body{display:none")).toBeNull();
    const css = cssDaCor("#7e22ce")!;
    expect(css).toContain("--marca:#7e22ce");
    expect(css).toContain('html[data-theme="dark"]{--marca:#c084fc');
  });
});
