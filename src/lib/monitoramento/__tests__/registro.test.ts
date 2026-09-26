import { describe, expect, it } from "vitest";
import { limparTexto, montarRegistro, rotaSemBusca } from "../registro";

describe("registro de erro", () => {
  it("tira token, chave, e-mail e número longo do texto", () => {
    const t = limparTexto("falhou eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0NTY3.abcdefghijklmn pra dona@bistro.com.br tel 5511987654321 sb_secret_abcdefghijklmnopqrst");
    expect(t).not.toMatch(/eyJ|dona@|5511987654321|sb_secret_/);
    expect(t).toContain("[token]");
    expect(t).toContain("[email]");
    expect(t).toContain("[número]");
    expect(t).toContain("[chave]");
  });

  it("guarda só o caminho da rota (a busca pode ter token)", () => {
    expect(rotaSemBusca("/auth/confirmar?token_hash=abc&type=recovery")).toBe("/auth/confirmar");
    expect(rotaSemBusca(null)).toBeNull();
  });

  it("monta a linha nos limites da tabela", () => {
    const erro = Object.assign(new Error("x".repeat(5000)), { digest: "123456" });
    const r = montarRegistro({ origem: "servidor", erro, rota: "/cmv?x=1", metodo: "POST" });
    expect(r.mensagem.length).toBe(1000);
    expect(r.digest).toBe("123456");
    expect(r.rota).toBe("/cmv");
    expect(r.detalhe!.length).toBeLessThanOrEqual(8000);
    expect(montarRegistro({ origem: "navegador", erro: 42 }).mensagem).toBe("Erro sem mensagem");
  });
});
