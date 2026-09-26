import { describe, expect, it } from "vitest";
import { caminhoInterno } from "../redirecionamento";

describe("caminhoInterno (destino do link do e-mail)", () => {
  it("aceita caminho do próprio site, com busca", () => {
    expect(caminhoInterno("/nova-senha")).toBe("/nova-senha");
    expect(caminhoInterno("/escalas?aba=equipe")).toBe("/escalas?aba=equipe");
  });

  it("recusa qualquer saída pra outro site", () => {
    for (const ruim of ["//site.com", "/\\site.com", "/\\/site.com", "https://site.com", "site.com", "/\t/site.com", " /x", ""]) {
      expect(caminhoInterno(ruim)).toBe("/visao-geral");
    }
    expect(caminhoInterno(null)).toBe("/visao-geral");
  });
});
