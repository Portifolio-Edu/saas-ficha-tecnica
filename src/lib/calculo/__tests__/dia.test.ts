import { describe, expect, it } from "vitest";
import { diaMesLocal, inicioDoDiaISO } from "../dia";
import { gerarLote } from "../lote";

describe("dia do restaurante (Brasília)", () => {
  it("às 22h de Brasília (01h UTC do dia seguinte) ainda é o mesmo dia", () => {
    const agora = new Date("2026-09-26T01:00:00Z"); // 25/09 22:00 em Brasília
    expect(inicioDoDiaISO(agora)).toBe("2026-09-25T03:00:00.000Z");
    expect(diaMesLocal(agora)).toEqual({ dia: "25", mes: "09" });
  });

  it("logo depois da meia-noite de Brasília já é o dia novo", () => {
    const agora = new Date("2026-09-26T03:05:00Z"); // 26/09 00:05 em Brasília
    expect(inicioDoDiaISO(agora)).toBe("2026-09-26T03:00:00.000Z");
  });

  it("o lote usa o dia de Brasília, não o do servidor", () => {
    expect(gerarLote("Molho de tomate", 3, new Date("2026-09-26T01:00:00Z"))).toBe("MD-2509-03");
  });

  it("aceita outro fuso", () => {
    expect(inicioDoDiaISO(new Date("2026-09-25T12:00:00Z"), "America/Manaus")).toBe("2026-09-25T04:00:00.000Z");
  });
});
