import { describe, expect, it } from "vitest";
import { extensaoDaFoto, TAMANHO_MAXIMO_FOTO } from "../tipoFoto";

describe("extensaoDaFoto", () => {
  it("usa a extensão do tipo, não do nome", () => {
    expect(extensaoDaFoto("image/jpeg", 1000)).toBe("jpg");
    expect(extensaoDaFoto("image/webp", 1000)).toBe("webp");
  });

  it("recusa o que não é foto e foto grande demais", () => {
    expect(() => extensaoDaFoto("text/html", 10)).toThrow(/Envie uma foto/);
    expect(() => extensaoDaFoto("image/svg+xml", 10)).toThrow(/Envie uma foto/);
    expect(() => extensaoDaFoto("", 10)).toThrow(/Envie uma foto/);
    expect(() => extensaoDaFoto("image/png", TAMANHO_MAXIMO_FOTO + 1)).toThrow(/5 MB/);
  });
});
