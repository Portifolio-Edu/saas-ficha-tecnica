import { describe, expect, it } from "vitest";
import { qtdDeBancada, unidadeCerta } from "../bancada";

describe("quantidades de bancada", () => {
  it("fração de kg e litro vira g e ml", () => {
    expect(qtdDeBancada(0.15, "l")).toBe("150 ml");
    expect(qtdDeBancada(0.01, "kg")).toBe("10 g");
    expect(qtdDeBancada(0.005, "kg")).toBe("5 g");
    expect(qtdDeBancada(0.0025, "kg")).toBe("2,5 g");
  });
  it("a partir de 1 fica em kg e litros", () => {
    expect(qtdDeBancada(2.2, "kg")).toBe("2,2 kg");
    expect(qtdDeBancada(1, "l")).toBe("1 litro");
    expect(qtdDeBancada(4, "litros")).toBe("4 litros");
    expect(qtdDeBancada(1500, "g")).toBe("1,5 kg");
  });
  it("unidade de rendimento no singular e no plural", () => {
    expect(qtdDeBancada(1, "discos")).toBe("1 disco");
    expect(qtdDeBancada(10, "discos")).toBe("10 discos");
    expect(unidadeCerta(1, "porções")).toBe("porção");
    expect(unidadeCerta(2, "porção")).toBe("porções");
    expect(unidadeCerta(3, "un")).toBe("un");
  });
});
