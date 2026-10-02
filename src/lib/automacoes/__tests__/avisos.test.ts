import { describe, expect, it } from "vitest";
import { emMinutos, minutoLocal, naJanela, noSilencio, textoChecklistAbertura, textoResumo, textoTemperatura } from "../avisos";
import { foraDaFaixa, textoFaixa } from "@/lib/dominio/temperatura";

describe("quando avisar", () => {
  it("lê o horário do restaurante (Brasília), não o do servidor", () => {
    expect(minutoLocal(new Date("2026-10-02T11:30:00Z"))).toBe(8 * 60 + 30);
    expect(minutoLocal(new Date("2026-10-02T02:10:00Z"))).toBe(23 * 60 + 10);
  });

  it("silêncio que vira a noite", () => {
    const cfg = { silencioInicio: "23:00", silencioFim: "06:00" };
    expect(noSilencio(emMinutos("23:30"), cfg)).toBe(true);
    expect(noSilencio(emMinutos("02:00"), cfg)).toBe(true);
    expect(noSilencio(emMinutos("06:00"), cfg)).toBe(false);
    expect(noSilencio(emMinutos("12:00"), cfg)).toBe(false);
    expect(noSilencio(emMinutos("14:00"), { silencioInicio: "14:00", silencioFim: "16:00" })).toBe(true);
    expect(noSilencio(emMinutos("02:00"), { silencioInicio: null, silencioFim: null })).toBe(false);
  });

  it("janela depois do horário (sistema parado não manda resumo das 8h às 23h)", () => {
    expect(naJanela(emMinutos("07:59"), "08:00", 180)).toBe(false);
    expect(naJanela(emMinutos("08:00"), "08:00", 180)).toBe(true);
    expect(naJanela(emMinutos("10:59"), "08:00", 180)).toBe(true);
    expect(naJanela(emMinutos("11:00"), "08:00", 180)).toBe(false);
    expect(naJanela(emMinutos("23:59"), "22:00", 240)).toBe(true);
  });

  it("faixa de temperatura", () => {
    const camara = { temperaturaMinC: 0, temperaturaMaxC: 5 };
    expect(foraDaFaixa(camara, 9)).toBe(true);
    expect(foraDaFaixa(camara, -1)).toBe(true);
    expect(foraDaFaixa(camara, 5)).toBe(false);
    expect(foraDaFaixa({ temperaturaMinC: null, temperaturaMaxC: null }, 99)).toBe(false);
    expect(textoFaixa(camara)).toBe("0 a 5 °C");
    expect(textoFaixa({ temperaturaMinC: null, temperaturaMaxC: -18 })).toBe("até -18 °C");
    expect(textoFaixa({ temperaturaMinC: 60, temperaturaMaxC: null })).toBe("acima de 60 °C");
  });
});

describe("texto dos avisos", () => {
  it("temperatura diz onde, quanto, o certo, quem e o link", () => {
    const t = textoTemperatura({
      restaurante: "Cantina",
      local: "Câmara fria",
      temperaturaC: 8.5,
      faixa: "0 a 5 °C",
      responsavel: "Ana",
      registradoEm: "2026-10-02T17:32:00Z",
      app: "https://app.exemplo",
    });
    expect(t).toContain("Câmara fria: *8,5 °C* (o certo é 0 a 5 °C)");
    expect(t).toContain("Registrado por Ana às 14:32");
    expect(t.endsWith("https://app.exemplo/seguranca")).toBe(true);
  });

  it("checklist lista o que falta", () => {
    const t = textoChecklistAbertura({ restaurante: "Cantina", limite: "11:00:00", pendentes: [{ nome: "Abertura cozinha", feitos: 3, total: 8 }], app: "https://a" });
    expect(t).toContain("Passou das 11:00");
    expect(t).toContain("• Abertura cozinha: 3 de 8 itens");
  });

  it("resumo: sem perda e com perdas", () => {
    const base = { restaurante: "Cantina", data: "2026-10-01", produzidas: 12, perdas: [], temperaturasFora: 0, checklist: { feitos: 30, total: 40 }, pedidosPendentes: 0, app: "https://a" };
    const t = textoResumo(base);
    expect(t).toContain("como foi ontem (01/10)");
    expect(t).toContain("Perdas: nenhuma");
    expect(t).toContain("Checklists: 75% feitos");
    expect(t).not.toContain("Pedidos");
    const c = textoResumo({ ...base, perdas: Array.from({ length: 4 }, (_, i) => ({ receita: `Molho ${i}`, motivo: "queimou" })), pedidosPendentes: 2, temperaturasFora: 1 });
    expect(c).toContain("Perdas: 4: Molho 0 (queimou); Molho 1 (queimou); Molho 2 (queimou)…");
    expect(c).toContain("Temperaturas fora da faixa: 1");
    expect(c).toContain("esperando compra: 2");
  });
});
