import { describe, expect, it } from "vitest";
import {
  CONFIG_PADRAO,
  cmvDoFechamento,
  configDaLinha,
  emMinutos,
  itensNovos,
  lerConfigAvisos,
  linhaDaConfig,
  minutoLocal,
  naJanela,
  noSilencio,
  tempoRestante,
  textoChecklistAbertura,
  textoComprasPrazo,
  textoDesperdicio,
  textoEquipe,
  textoEstoqueBaixo,
  textoPrecoSubiu,
  textoRendimentoBaixo,
  textoResumo,
  textoVendas,
} from "../avisos";

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

  it("item já avisado não volta; repetido no mesmo lote conta uma vez", () => {
    const itens = [{ chave: "arroz" }, { chave: "feijao" }, { chave: "arroz" }, { chave: "oleo" }];
    expect(itensNovos(itens, new Set(["feijao"])).map((i) => i.chave)).toEqual(["arroz", "oleo"]);
    expect(itensNovos(itens, new Set(["arroz", "feijao", "oleo"]))).toEqual([]);
  });

  it("tempo até o pedido fechar", () => {
    expect(tempoRestante(0.4)).toBe("1 min");
    expect(tempoRestante(45)).toBe("45 min");
    expect(tempoRestante(90)).toBe("1h30");
    expect(tempoRestante(120)).toBe("2h");
  });

  it("CMV do fechamento = estoque inicial + compras − estoque final", () => {
    expect(cmvDoFechamento({ estoqueInicial: 10000, compras: 30000, estoqueFinal: 8000 })).toBe(32000);
  });
});

describe("texto dos avisos", () => {
  const app = "https://app.exemplo";

  it("insumo abaixo do mínimo diz quanto tem, o mínimo e quando pedir", () => {
    const t = textoEstoqueBaixo({
      restaurante: "Cantina",
      itens: [{ nome: "Arroz", saldo: 2.5, minimo: 10, unidade: "kg", prazo: "Atacadão: peça até hoje às 18h pra chegar amanhã." }],
      app,
    });
    expect(t).toContain("*Cantina: insumo abaixo do mínimo*");
    expect(t).toContain("• Arroz: 2,5 kg (mínimo 10 kg). Atacadão: peça até hoje às 18h pra chegar amanhã.");
    expect(t.endsWith(`${app}/estoque`)).toBe(true);
    const muitos = textoEstoqueBaixo({ restaurante: "C", itens: Array.from({ length: 20 }, (_, i) => ({ nome: `I${i}`, saldo: 0, minimo: 1, unidade: "un", prazo: null })), app });
    expect(muitos).toContain("insumos abaixo do mínimo");
    expect(muitos).toContain("• e mais 9");
    expect(muitos.split("\n").filter((l) => l.startsWith("•"))).toHaveLength(12);
  });

  it("pedido fechando: fornecedor, quanto falta, prazo e o que a cozinha pediu", () => {
    const t = textoComprasPrazo({ restaurante: "Cantina", empresa: "Hortifruti Silva", minutosRestantes: 90, frase: "Peça até hoje às 18h pra chegar amanhã.", pedidos: ["tomate", "coentro", "cebola"], app });
    expect(t).toContain("pedido do Hortifruti Silva fecha em 1h30");
    expect(t).toContain("3 pedidos da cozinha esperando: tomate, coentro e cebola.");
    expect(textoComprasPrazo({ restaurante: "C", empresa: "X", minutosRestantes: 30, frase: "", pedidos: ["a", "b", "c", "d", "e", "f"], app })).toContain("a, b, c, d e mais 2.");
  });

  it("preço que subiu mostra antes, depois e quanto", () => {
    const t = textoPrecoSubiu({ restaurante: "Cantina", itens: [{ nome: "Picanha", antes: 69.9, depois: 79.9, unidade: "kg" }], app });
    expect(t).toContain("fornecedor subiu o preço");
    expect(t).toContain("• Picanha: R$ 69,90 → R$ 79,90 o kg (+14%)");
    expect(t.endsWith(`${app}/insumos`)).toBe(true);
  });

  it("carne rendendo menos cita o fornecedor e compara com a ficha", () => {
    const t = textoRendimentoBaixo({ restaurante: "Cantina", itens: [{ nome: "Picanha", fornecedor: "Boi Bom", rendeu: 0.7, esperado: 1 / 1.2 }], app });
    expect(t).toContain("• Picanha (Boi Bom): rendeu 70%, o normal é 83%");
    expect(t).toContain("conversar com o fornecedor");
  });

  it("equipe, desperdício e vendas", () => {
    expect(textoEquipe({ restaurante: "Cantina", alertas: ["Ana (Cozinheira) faltou em qui 02/10: buscar extra com o mesmo perfil."], app })).toContain(
      "• Ana (Cozinheira) faltou em qui 02/10",
    );
    const d = textoDesperdicio({ restaurante: "Cantina", itens: [{ receita: "Molho de tomate", quantidade: 3, unidade: "kg", motivo: "queimou", responsavel: "João" }], app });
    expect(d).toContain("produção perdida");
    expect(d).toContain("• Molho de tomate, 3 kg: queimou (João)");
    const v = textoVendas({
      restaurante: "Cantina",
      inicio: "2026-09-01",
      fim: "2026-09-30",
      faturamento: 120000,
      cmv: 37440,
      maisVendidos: [
        { nome: "Parmegiana", quantidade: 320 },
        { nome: "Feijoada", quantidade: 210 },
      ],
      app,
    });
    expect(v).toContain("vendas de 01/09 a 30/09");
    expect(v).toContain("Faturamento: R$ 120.000,00");
    expect(v).toContain("CMV: 31,2% (R$ 37.440,00)");
    expect(v).toContain("1. Parmegiana: 320\n2. Feijoada: 210");
    expect(textoVendas({ restaurante: "C", inicio: "2026-09-01", fim: "2026-09-30", faturamento: 0, cmv: 0, maisVendidos: [], app })).not.toContain("CMV");
  });

  it("checklist lista o que falta", () => {
    const t = textoChecklistAbertura({ restaurante: "Cantina", limite: "11:00:00", pendentes: [{ nome: "Abertura cozinha", feitos: 3, total: 8 }], app });
    expect(t).toContain("Passou das 11:00");
    expect(t).toContain("• Abertura cozinha: 3 de 8 itens");
  });

  it("resumo: sem perda e com perdas, insumos abaixo e pedidos; sem temperatura", () => {
    const base = { restaurante: "Cantina", data: "2026-10-01", produzidas: 12, perdas: [], checklist: { feitos: 30, total: 40 }, pedidosPendentes: 0, insumosAbaixo: 0, app };
    const t = textoResumo(base);
    expect(t).toContain("como foi ontem (01/10)");
    expect(t).toContain("Perdas: nenhuma");
    expect(t).toContain("Checklists: 75% feitos");
    expect(t).not.toContain("Pedidos");
    expect(t).not.toContain("Insumos");
    expect(t).not.toContain("Temperatura");
    const c = textoResumo({ ...base, perdas: Array.from({ length: 4 }, (_, i) => ({ receita: `Molho ${i}`, motivo: "queimou" })), pedidosPendentes: 2, insumosAbaixo: 3 });
    expect(c).toContain("Perdas: 4: Molho 0 (queimou); Molho 1 (queimou); Molho 2 (queimou)…");
    expect(c).toContain("Insumos abaixo do mínimo: 3");
    expect(c).toContain("esperando compra: 2");
  });
});

describe("configuração dos avisos", () => {
  const form = (c: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(c)) f.set(k, v);
    return f;
  };
  it("checkbox desmarcado = desligado; silêncio desligado não guarda horário", () => {
    const { config, erros } = lerConfigAvisos(
      form({ estoqueBaixo: "on", equipe: "on", equipeHora: "06:30", checklistAberturaAte: "10:30", resumoHora: "07:00", silencioInicio: "22:00", silencioFim: "06:00" }),
    );
    expect(erros).toEqual({});
    expect(config).toEqual({
      estoqueBaixo: true,
      fornecedor: false,
      equipe: true,
      equipeHora: "06:30",
      desperdicio: false,
      vendas: false,
      checklistAbertura: false,
      checklistAberturaAte: "10:30",
      resumoDiario: false,
      resumoHora: "07:00",
      silencioInicio: null,
      silencioFim: null,
    });
  });
  it("horário inválido e silêncio sem duração", () => {
    const { erros } = lerConfigAvisos(form({ resumoHora: "25:00", equipeHora: "7h", silencio: "on", silencioInicio: "22:00", silencioFim: "22:00" }));
    expect(Object.keys(erros).sort()).toEqual(["equipeHora", "resumoHora", "silencioFim"]);
  });
  it("banco ↔ config ida e volta; sem linha = padrão", () => {
    expect(configDaLinha(null)).toEqual(CONFIG_PADRAO);
    const cfg = { ...CONFIG_PADRAO, vendas: false, equipeHora: "06:00", silencioInicio: "23:00", silencioFim: "06:00" };
    const linha = { ...linhaDaConfig(cfg), equipe_hora: "06:00:00", silencio_inicio: "23:00:00", silencio_fim: "06:00:00" };
    expect(configDaLinha(linha)).toEqual(cfg);
  });
});
