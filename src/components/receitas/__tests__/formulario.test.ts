import { describe, expect, it } from "vitest";
import {
  numeroDoCampo,
  validarCamposReceita,
  type CamposReceita,
} from "../formulario";

const campos: CamposReceita = {
  nome: "Molho",
  precoVenda: "25,90",
  rendimento: "2",
  pesoPorcaoG: "",
  vendasMes: "",
  ficha: [
    {
      insumoId: "tomate",
      subReceitaId: null,
      quantidade: "1,5",
      unidade: "kg",
    },
  ],
};

describe("edição da ficha", () => {
  it("lê decimais da operação sem truncar a vírgula", () => {
    expect(numeroDoCampo(" 1,5 ")).toBe(1.5);
    expect(numeroDoCampo("0.025")).toBe(0.025);
    expect(validarCamposReceita(campos)).toEqual({});
  });
  it("não transforma vazio, texto ou separadores ambíguos em quantidades válidas", () => {
    for (const valor of ["", "2 kg", "1.000,50", "Infinity", "1e309"])
      expect(Number.isFinite(numeroDoCampo(valor))).toBe(false);
  });
  it("impede salvar uma linha vazia, negativa ou zero durante a edição", () => {
    for (const quantidade of ["", "0", "-2", "NaN"]) {
      expect(
        validarCamposReceita({
          ...campos,
          ficha: [{ ...campos.ficha[0], quantidade }],
        }),
      ).toHaveProperty("linha-0");
    }
  });
  it("identifica campos obrigatórios e aceita preço zero sem rendimento zero", () => {
    expect(
      validarCamposReceita({
        ...campos,
        nome: " ",
        precoVenda: "",
        rendimento: "0",
        ficha: [],
      }),
    ).toMatchObject({
      nome: expect.any(String),
      precoVenda: expect.any(String),
      rendimento: expect.any(String),
      ficha: expect.any(String),
    });
    expect(validarCamposReceita({ ...campos, precoVenda: "0" })).toEqual({});
  });
  it("valida os opcionais preenchidos, sem exigir que sejam preenchidos", () => {
    expect(
      validarCamposReceita({ ...campos, vendasMes: "1,5", pesoPorcaoG: "-1" }),
    ).toMatchObject({
      vendasMes: expect.any(String),
      pesoPorcaoG: expect.any(String),
    });
    expect(
      validarCamposReceita({ ...campos, vendasMes: "0", pesoPorcaoG: "100,5" }),
    ).toEqual({});
  });
});
