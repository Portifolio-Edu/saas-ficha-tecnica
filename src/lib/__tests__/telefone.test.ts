import { describe, expect, it } from "vitest";
import { formatarTelefone, normalizarTelefone, telefoneValido } from "../telefone";

describe("telefone num formato só (55 + DDD)", () => {
  it("formatos diferentes do mesmo número viram o mesmo valor", () => {
    for (const t of ["(11) 98765-4321", "11987654321", "+55 11 98765-4321", "55 (11) 98765 4321"]) {
      expect(normalizarTelefone(t), t).toBe("5511987654321");
    }
    expect(normalizarTelefone("(11) 3456-7890")).toBe("551134567890");
  });

  it("exige DDD", () => {
    expect(telefoneValido("98765-4321")).toBe(false);
    expect(telefoneValido("(11) 98765-4321")).toBe(true);
    expect(telefoneValido("")).toBe(false);
  });

  it("formata pra exibir", () => {
    expect(formatarTelefone("5511987654321")).toBe("(11) 98765-4321");
    expect(formatarTelefone("551134567890")).toBe("(11) 3456-7890");
  });
});
