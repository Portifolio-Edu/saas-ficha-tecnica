import { describe, expect, it } from "vitest";
import {
  cnpjValido,
  formatarCnpj,
  fracaoParaPct,
  lerNumeroPtBr,
  nomeJaExiste,
  pctParaFracao,
  validarCanal,
  validarRestaurante,
  validarTurno,
} from "../configuracoes";

describe("lerNumeroPtBr", () => {
  it("aceita vírgula, ponto e o sinal de porcentagem", () => {
    expect(lerNumeroPtBr("12,5")).toBe(12.5);
    expect(lerNumeroPtBr("12.5")).toBe(12.5);
    expect(lerNumeroPtBr(" 65 % ")).toBe(65);
  });

  it("trata ponto de milhar quando há vírgula decimal", () => {
    expect(lerNumeroPtBr("1.234,5")).toBe(1234.5);
  });

  it("vazio e lixo viram null", () => {
    expect(lerNumeroPtBr("")).toBeNull();
    expect(lerNumeroPtBr("abc")).toBeNull();
    expect(lerNumeroPtBr("1,2,3")).toBeNull();
  });
});

describe("pctParaFracao e fracaoParaPct", () => {
  it("não deixa erro de ponto flutuante virar valor torto no banco", () => {
    expect(pctParaFracao(65)).toBe(0.65);
    expect(pctParaFracao(15.2)).toBe(0.152);
    expect(pctParaFracao(0.1 * 3 * 100)).toBe(0.3);
  });

  it("ida e volta mantém o número", () => {
    expect(fracaoParaPct(0.152)).toBe(15.2);
    expect(fracaoParaPct(pctParaFracao(12.5))).toBe(12.5);
  });
});

describe("cnpjValido", () => {
  it("confere os dois dígitos verificadores", () => {
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11222333000181")).toBe(true);
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
  });

  it("recusa tamanho errado e sequência repetida", () => {
    expect(cnpjValido("1122233300018")).toBe(false);
    expect(cnpjValido("00000000000000")).toBe(false);
    expect(cnpjValido("")).toBe(false);
  });

  it("formata com máscara", () => {
    expect(formatarCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });
});

describe("validarRestaurante", () => {
  const base = { nomeRestaurante: "Cantina Bella Notte", nome: "Marina", cnpj: "", margemAlvoPct: "65" };

  it("converte a margem pra fração e deixa o CNPJ em branco como null", () => {
    const r = validarRestaurante(base);
    expect(r).toEqual({ ok: true, valor: { nomeRestaurante: "Cantina Bella Notte", nome: "Marina", cnpj: null, margemAlvo: 0.65 } });
  });

  it("guarda só os dígitos do CNPJ", () => {
    const r = validarRestaurante({ ...base, cnpj: "11.222.333/0001-81" });
    expect(r.ok && r.valor.cnpj).toBe("11222333000181");
  });

  it("recusa CNPJ que não confere", () => {
    const r = validarRestaurante({ ...base, cnpj: "11.222.333/0001-80" });
    expect(r.ok).toBe(false);
  });

  it("recusa margem fora de 1% a 95% e margem ilegível", () => {
    expect(validarRestaurante({ ...base, margemAlvoPct: "0" }).ok).toBe(false);
    expect(validarRestaurante({ ...base, margemAlvoPct: "96" }).ok).toBe(false);
    expect(validarRestaurante({ ...base, margemAlvoPct: "" }).ok).toBe(false);
    expect(validarRestaurante({ ...base, margemAlvoPct: "70,5" }).ok).toBe(true);
  });

  it("exige nome do restaurante e do responsável", () => {
    expect(validarRestaurante({ ...base, nomeRestaurante: "  " }).ok).toBe(false);
    expect(validarRestaurante({ ...base, nome: "" }).ok).toBe(false);
  });
});

describe("validarCanal", () => {
  it("aceita comissão 0 (canal sem comissão) e converte pra fração", () => {
    const r = validarCanal({ nomeCanal: "Retirada", comissaoPct: "0", embala: true, ativo: true });
    expect(r).toEqual({ ok: true, valor: { nomeCanal: "Retirada", comissaoPercentual: 0, embala: true, ativo: true } });
  });

  it("converte 15,2% em 0,152", () => {
    const r = validarCanal({ nomeCanal: "iFood", comissaoPct: "15,2", embala: true, ativo: true });
    expect(r.ok && r.valor.comissaoPercentual).toBe(0.152);
  });

  it("comissão em branco não vira 0 em silêncio", () => {
    expect(validarCanal({ nomeCanal: "iFood", comissaoPct: "", embala: true, ativo: true }).ok).toBe(false);
  });

  it("recusa comissão acima do teto e nome vazio", () => {
    expect(validarCanal({ nomeCanal: "iFood", comissaoPct: "61", embala: true, ativo: true }).ok).toBe(false);
    expect(validarCanal({ nomeCanal: " ", comissaoPct: "10", embala: true, ativo: true }).ok).toBe(false);
  });
});

describe("validarTurno", () => {
  it("horário é opcional", () => {
    expect(validarTurno({ nome: " Almoço ", horario: "" })).toEqual({ ok: true, valor: { nome: "Almoço", horario: null } });
    expect(validarTurno({ nome: "Jantar", horario: "18h-23h" })).toEqual({ ok: true, valor: { nome: "Jantar", horario: "18h-23h" } });
  });

  it("exige nome", () => {
    expect(validarTurno({ nome: "", horario: "7h" }).ok).toBe(false);
  });
});

describe("nomeJaExiste", () => {
  const lista = [
    { id: "1", nome: "Manhã" },
    { id: "2", nome: "iFood" },
  ];

  it("ignora maiúscula e acento", () => {
    expect(nomeJaExiste("manha", lista)).toBe(true);
    expect(nomeJaExiste("IFOOD", lista)).toBe(true);
    expect(nomeJaExiste("Noite", lista)).toBe(false);
  });

  it("não conta o próprio item em edição", () => {
    expect(nomeJaExiste("Manhã", lista, "1")).toBe(false);
  });
});
