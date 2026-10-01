import { describe, expect, it } from "vitest";
import { mensagemConvite, minhaEscala, proximaFolga, textoTurno } from "../consulta";
import type { EscalaPublica } from "@/lib/escalas/publica";

const escala: EscalaPublica = {
  inicio: "2026-09-21",
  fim: "2026-09-27",
  pessoas: [
    { id: "a", nome: "Ana", setor: "cozinha", cargo: "Chef", equipe: "cozinha:chef", turno: { inicio: "10:00", fim: "18:20" } },
    { id: "b", nome: "Bia", setor: "cozinha", cargo: "Aux", equipe: "cozinha:aux", turno: null },
  ],
  dias: {
    a: [
      { data: "2026-09-21", situacao: "trabalho" },
      { data: "2026-09-22", situacao: "folga" },
      { data: "2026-09-23", situacao: "trabalho" },
      { data: "2026-09-24", situacao: "trabalho" },
      { data: "2026-09-25", situacao: "folga" },
      { data: "2026-09-26", situacao: "ferias" },
      null,
    ],
    b: [],
  },
};

describe("minhaEscala", () => {
  it("só a pessoa, de hoje em diante, com o turno", () => {
    const m = minhaEscala(escala, "a", "2026-09-23")!;
    expect(m.turno).toEqual({ inicio: "10:00", fim: "18:20" });
    expect(m.dias.map((d) => d.data)).toEqual(["2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27"]);
    expect(m.dias.at(-1)!.situacao).toBeNull();
  });

  it("sem escala ou pessoa fora dela: null", () => {
    expect(minhaEscala(null, "a", "2026-09-23")).toBeNull();
    expect(minhaEscala(escala, "x", "2026-09-23")).toBeNull();
  });

  it("próxima folga depois de hoje", () => {
    expect(proximaFolga(minhaEscala(escala, "a", "2026-09-22")!)?.data).toBe("2026-09-25");
    expect(proximaFolga(minhaEscala(escala, "a", "2026-09-25")!)).toBeNull();
  });
});

describe("textos", () => {
  it("turno curto", () => {
    expect(textoTurno({ inicio: "10:00", fim: "18:20" })).toBe("10h–18h20");
    expect(textoTurno(null)).toBeNull();
  });

  it("convite com o primeiro nome e o link", () => {
    const t = mensagemConvite("Juliana Costa", "Bistrô Aurora", "https://x/consulta/abc");
    expect(t).toContain("Oi, Juliana!");
    expect(t).toContain("Bistrô Aurora");
    expect(t).toContain("https://x/consulta/abc");
  });
});
