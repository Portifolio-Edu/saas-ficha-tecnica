import { describe, expect, it } from "vitest";
import { camposFaltando, cnpjValido, enderecoEmUmaLinha, formatarCep, formatarCnpj, lerEmpresa } from "../empresa";

const form = (campos: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
};

describe("CNPJ", () => {
  it("confere os dígitos verificadores, com ou sem pontuação", () => {
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11222333000181")).toBe(true);
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
    expect(cnpjValido("00.000.000/0000-00")).toBe(false);
    expect(cnpjValido("1122233300018")).toBe(false);
  });

  it("formata pra exibir", () => {
    expect(formatarCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatarCep("01310100")).toBe("01310-100");
  });
});

describe("formulário da empresa", () => {
  it("normaliza pro formato do banco", () => {
    const { dados, erros } = lerEmpresa(
      form({
        nomeRestaurante: "  Cantina   da Praça ",
        razaoSocial: "Cantina da Praça Ltda",
        cnpj: "11.222.333/0001-81",
        inscricaoEstadual: "isento",
        emailContato: "Contato@Cantina.com.br",
        telefoneContato: "(11) 3333-4444",
        cep: "01310-100",
        uf: "sp",
        cidade: "São Paulo",
      }),
    );
    expect(erros).toEqual({});
    expect(dados).toMatchObject({
      nomeRestaurante: "Cantina da Praça",
      cnpj: "11222333000181",
      inscricaoEstadual: "ISENTO",
      emailContato: "contato@cantina.com.br",
      telefoneContato: "551133334444",
      cep: "01310100",
      uf: "SP",
      logradouro: null,
    });
  });

  it("aponta o erro no campo certo", () => {
    const { erros } = lerEmpresa(
      form({ nomeRestaurante: "x", cnpj: "11.222.333/0001-82", emailContato: "sem-arroba", cep: "0131", uf: "XX", telefoneContato: "3333-4444", numero: "1".repeat(21) }),
    );
    expect(Object.keys(erros).sort()).toEqual(["cep", "cnpj", "emailContato", "nomeRestaurante", "numero", "telefoneContato", "uf"]);
  });

  it("campos vazios ficam nulos (apagar um dado é permitido)", () => {
    const { dados, erros } = lerEmpresa(form({ nomeRestaurante: "Cantina", cnpj: "  ", razaoSocial: "" }));
    expect(erros).toEqual({});
    expect(dados.cnpj).toBeNull();
    expect(dados.razaoSocial).toBeNull();
  });

  it("endereço numa linha e o que falta no cadastro", () => {
    const e = { logradouro: "Av. Paulista", numero: "1000", complemento: "sala 2", bairro: "Bela Vista", cidade: "São Paulo", uf: "SP", cep: "01310100" };
    expect(enderecoEmUmaLinha(e)).toBe("Av. Paulista, 1000 sala 2 · Bela Vista · São Paulo/SP · 01310-100");
    const { dados } = lerEmpresa(form({ nomeRestaurante: "Cantina" }));
    expect(camposFaltando(dados)).toEqual(["razão social", "CNPJ", "endereço"]);
  });
});
