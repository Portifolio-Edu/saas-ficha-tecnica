import { describe, expect, it } from "vitest";
import { codigoDaMensagem, gerarCodigo, hashCodigo, numeroDoWhatsapp, variantesTelefone } from "../whatsapp";

describe("WhatsApp do agente", () => {
  it("código de 6 dígitos e hash estável", () => {
    expect(gerarCodigo()).toMatch(/^\d{6}$/);
    expect(hashCodigo("123 456")).toBe(hashCodigo("123456"));
    expect(hashCodigo("123456")).toMatch(/^[0-9a-f]{64}$/);
  });
  it("número do WhatsApp", () => {
    expect(numeroDoWhatsapp("5511988887777@s.whatsapp.net")).toBe("5511988887777");
    expect(numeroDoWhatsapp("11988887777")).toBe("5511988887777");
  });
  it("com e sem o nono dígito", () => {
    expect(variantesTelefone("5511988887777")).toEqual(["5511988887777", "551188887777"]);
    expect(variantesTelefone("551188887777@s.whatsapp.net")).toEqual(["551188887777", "5511988887777"]);
    expect(variantesTelefone("551133334444")).toEqual(["551133334444"]);
  });
  it("lê o código da mensagem", () => {
    expect(codigoDaMensagem("ATIVAR 123456")).toBe("123456");
    expect(codigoDaMensagem("ativar: 123 456")).toBe("123456");
    expect(codigoDaMensagem("quero ativar")).toBeNull();
    expect(codigoDaMensagem("ATIVAR 12345")).toBeNull();
  });
});
