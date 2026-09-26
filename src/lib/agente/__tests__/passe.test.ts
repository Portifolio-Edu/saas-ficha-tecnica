import { describe, expect, it } from "vitest";
import { assinarPasse, chaveN8nConfere, verificarPasse } from "../passe";

const SEGREDO = "s".repeat(40);
const dados = { u: "user-1", c: "cli-1", p: "gestor" as const, n: "Gil", r: "Bistrô", canal: "web" as const };

describe("passe do agente", () => {
  it("assina e confere", () => {
    const agora = Date.UTC(2026, 8, 26, 12);
    const passe = assinarPasse(dados, SEGREDO, agora);
    expect(verificarPasse(passe, SEGREDO, agora + 60_000)).toMatchObject({ ...dados, v: 1 });
  });

  it("recusa vencido, adulterado, outro segredo e lixo", () => {
    const agora = Date.UTC(2026, 8, 26, 12);
    const passe = assinarPasse(dados, SEGREDO, agora);
    expect(verificarPasse(passe, SEGREDO, agora + 16 * 60_000)).toBeNull();
    const [corpo, sig] = passe.split(".");
    const outroRestaurante = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(corpo, "base64url").toString()), c: "cli-2" })).toString("base64url");
    expect(verificarPasse(`${outroRestaurante}.${sig}`, SEGREDO, agora)).toBeNull();
    expect(verificarPasse(passe, "x".repeat(40), agora)).toBeNull();
    expect(verificarPasse("abc", SEGREDO, agora)).toBeNull();
    expect(verificarPasse(null, SEGREDO, agora)).toBeNull();
  });

  it("segredo curto não assina", () => {
    expect(() => assinarPasse(dados, "curto")).toThrow();
  });

  it("chave do n8n", () => {
    const chave = "k".repeat(40);
    expect(chaveN8nConfere(chave, chave)).toBe(true);
    expect(chaveN8nConfere("k".repeat(39) + "x", chave)).toBe(false);
    expect(chaveN8nConfere(null, chave)).toBe(false);
    expect(chaveN8nConfere("curta", "curta")).toBe(false);
  });
});
