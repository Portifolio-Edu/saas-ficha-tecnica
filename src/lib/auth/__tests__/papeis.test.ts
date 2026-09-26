import { describe, expect, it } from "vitest";
import { podeAcessar, rotaInicial } from "../papeis";
import { emailDeLogin, normalizarUsuario, usuarioValido } from "../equipe";

// EQUIPE (2026-09-25): quem abre qual tela e como o login vira e-mail técnico.
describe("podeAcessar", () => {
  it("dono e gestor abrem tudo", () => {
    for (const rota of ["/visao-geral", "/relatorios", "/cmv", "/equipe", "/receitas"]) {
      expect(podeAcessar("dono", rota)).toBe(true);
      expect(podeAcessar("gestor", rota)).toBe(true);
    }
  });

  it("estoquista só abre compras, estoque e CMV", () => {
    expect(podeAcessar("estoquista", "/estoque")).toBe(true);
    expect(podeAcessar("estoquista", "/insumos")).toBe(true);
    expect(podeAcessar("estoquista", "/cmv")).toBe(true);
    expect(podeAcessar("estoquista", "/relatorios")).toBe(false);
    expect(podeAcessar("estoquista", "/visao-geral")).toBe(false);
    expect(podeAcessar("estoquista", "/receitas")).toBe(false);
    expect(podeAcessar("estoquista", "/equipe")).toBe(false);
    expect(podeAcessar("estoquista", "/estoque-falso")).toBe(false);
  });

  it("cozinha só abre o modo cozinha", () => {
    expect(podeAcessar("cozinha", "/cozinha")).toBe(true);
    expect(podeAcessar("cozinha", "/cozinha/fichas")).toBe(true);
    expect(podeAcessar("cozinha", "/estoque")).toBe(false);
    expect(podeAcessar("cozinha", "/checklists")).toBe(false);
  });

  it("cada papel tem a sua tela inicial", () => {
    expect(rotaInicial("dono")).toBe("/visao-geral");
    expect(rotaInicial("estoquista")).toBe("/estoque");
    expect(rotaInicial("cozinha")).toBe("/cozinha");
  });
});

describe("login da equipe", () => {
  it("normaliza o usuário", () => {
    expect(normalizarUsuario(" Maria Estoque ")).toBe("maria.estoque");
    expect(normalizarUsuario("João")).toBe("joao");
  });

  it("valida o formato", () => {
    expect(usuarioValido("maria.estoque")).toBe(true);
    expect(usuarioValido("ab")).toBe(false);
    expect(usuarioValido("maria@x")).toBe(false);
  });

  it("e-mail passa direto; usuário vira e-mail técnico", () => {
    expect(emailDeLogin("dono@restaurante.com")).toBe("dono@restaurante.com");
    expect(emailDeLogin("Maria.Estoque")).toBe("maria.estoque@equipe.fichatecnica.invalid");
  });
});
