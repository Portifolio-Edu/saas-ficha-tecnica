import { describe, expect, it } from "vitest";
import { extrasCompativeis, formatarTelefone, mensagemConvite, normalizarTelefone, validarExtra, type Extra } from "../extras";
import { chaveTag, limparTag, normalizarPerfil, resumoAssiduidade, tagsUnicas, validarNota, validarPerfil } from "../perfil";
import type { PerfilVaga } from "../tipos";

const extra = (id: string, e: Partial<Extra> = {}): Extra => ({
  id,
  nome: id,
  telefone: "5511987654321",
  setor: "cozinha",
  cargos: ["Cozinheiro"],
  nivel: "pleno",
  pracas: [],
  aceitaWhatsapp: true,
  consentimentoEm: "2026-09-01T00:00:00Z",
  ativo: true,
  nota: null,
  ...e,
});

const vaga: PerfilVaga = { setor: "cozinha", cargo: "Cozinheiro", nivel: "pleno", habilidades: ["Grelha", "Chapa"] };

describe("matchmaking de extras", () => {
  it("cruza nível e praças de quem faltou; quem cobre tudo vem primeiro", () => {
    const r = extrasCompativeis(vaga, [
      extra("so-grelha", { pracas: ["Grelha"] }),
      extra("completo", { pracas: ["grelha", "CHAPA", "Fritura"] }),
      extra("confeitaria", { pracas: ["Confeitaria"] }),
    ]);
    expect(r.map((c) => c.extra.id)).toEqual(["completo", "so-grelha"]);
    expect(r[0].completo).toBe(true);
    expect(r[1].pracasFaltando).toEqual(["Chapa"]);
  });

  it("nível abaixo do de quem faltou não entra; sem nível informado também não", () => {
    const r = extrasCompativeis(vaga, [
      extra("junior", { nivel: "junior", pracas: ["Grelha", "Chapa"] }),
      extra("sem-nivel", { nivel: null, pracas: ["Grelha", "Chapa"] }),
      extra("senior", { nivel: "senior", pracas: ["Grelha", "Chapa"] }),
    ]);
    expect(r.map((c) => c.extra.id)).toEqual(["senior"]);
  });

  it("entre iguais, prefere o nível mais próximo (não chama especialista à toa)", () => {
    const r = extrasCompativeis(vaga, [
      extra("especialista", { nivel: "especialista", pracas: ["Grelha", "Chapa"] }),
      extra("pleno", { nivel: "pleno", pracas: ["Grelha", "Chapa"] }),
    ]);
    expect(r.map((c) => c.extra.id)).toEqual(["pleno", "especialista"]);
  });

  it("outro setor e extra inativo ficam de fora", () => {
    const r = extrasCompativeis(vaga, [extra("bar", { setor: "bar", pracas: ["Grelha"] }), extra("inativo", { ativo: false, pracas: ["Grelha"] })]);
    expect(r).toHaveLength(0);
  });

  it("quem faltou sem praças no prontuário: vale o mesmo cargo", () => {
    const r = extrasCompativeis({ setor: "salao", cargo: "Garçom", habilidades: [] }, [
      extra("garcom", { setor: "salao", cargos: ["garçom"] }),
      extra("maitre", { setor: "salao", cargos: ["Maître"] }),
    ]);
    expect(r.map((c) => c.extra.id)).toEqual(["garcom"]);
  });

  it("empate: aceita WhatsApp antes, depois nome", () => {
    const r = extrasCompativeis(vaga, [
      extra("b", { pracas: ["Grelha", "Chapa"], aceitaWhatsapp: false, consentimentoEm: null }),
      extra("c", { pracas: ["Grelha", "Chapa"] }),
      extra("a", { pracas: ["Grelha", "Chapa"] }),
    ]);
    expect(r.map((c) => c.extra.id)).toEqual(["a", "c", "b"]);
  });
});

describe("prontuário de competências", () => {
  it("tags limpas, sem repetição por maiúscula ou acento", () => {
    expect(limparTag("  segura   a praça ")).toBe("Segura a praça");
    expect(chaveTag("Açougue")).toBe(chaveTag("acougue"));
    expect(tagsUnicas(["Chapa", "chapa ", "Grelha", ""])).toEqual(["Chapa", "Grelha"]);
    expect(normalizarPerfil({ nivel: "pleno", pracas: ["grelha", "Grelha"], pontosFortes: [], limitacoes: [], observacoes: "  " })).toEqual({
      nivel: "pleno",
      pracas: ["Grelha"],
      pontosFortes: [],
      limitacoes: [],
      observacoes: null,
    });
  });

  it("valida nível, limites de tags e observação", () => {
    const ok = { nivel: "senior" as const, pracas: ["Grelha"], pontosFortes: [], limitacoes: [], observacoes: null };
    expect(validarPerfil(ok)).toBeNull();
    expect(validarPerfil({ ...ok, nivel: "chefe" as never })).toMatch(/Nível/);
    expect(validarPerfil({ ...ok, pracas: Array.from({ length: 21 }, (_, i) => `p${i}`) })).toMatch(/20/);
    expect(validarPerfil({ ...ok, limitacoes: ["x".repeat(41)] })).toMatch(/40/);
    expect(validarPerfil({ ...ok, observacoes: "x".repeat(2001) })).toMatch(/2000/);
  });

  it("nota: tipo, data não futura e texto", () => {
    const n = { funcionarioId: "a", data: "2026-09-20", tipo: "elogio" as const, texto: "Segurou a grelha." };
    expect(validarNota(n, "2026-09-27")).toBeNull();
    expect(validarNota({ ...n, data: "2026-09-28" }, "2026-09-27")).toMatch(/não chegou/);
    expect(validarNota({ ...n, texto: "  " }, "2026-09-27")).toMatch(/Escreva/);
  });

  it("assiduidade: conta dias de falta e atestado nos últimos 90 dias", () => {
    const ocs = [
      { funcionarioId: "a", tipo: "falta", inicio: "2026-09-19", fim: "2026-09-19" },
      { funcionarioId: "a", tipo: "atestado", inicio: "2026-09-01", fim: "2026-09-03" },
      { funcionarioId: "a", tipo: "falta", inicio: "2026-01-10", fim: "2026-01-10" },
      { funcionarioId: "b", tipo: "falta", inicio: "2026-09-20", fim: "2026-09-20" },
      { funcionarioId: "a", tipo: "ferias", inicio: "2026-08-01", fim: "2026-08-10" },
    ];
    expect(resumoAssiduidade(ocs, "a", "2026-09-27")).toMatchObject({ faltas: 1, atestados: 3 });
  });
});

describe("extras: telefone e convite", () => {
  it("normaliza e formata telefone brasileiro", () => {
    expect(normalizarTelefone("(11) 98765-4321")).toBe("5511987654321");
    expect(formatarTelefone("5511987654321")).toBe("(11) 98765-4321");
    expect(validarExtra({ nome: "Lia", telefone: "11 9876", setor: "cozinha", cargos: ["Cozinheiro"], nivel: null, pracas: [], aceitaWhatsapp: false, ativo: true, nota: null })).toMatch(/DDD/);
  });

  it("mensagem de convite com primeiro nome, cargo e data", () => {
    expect(mensagemConvite({ nome: "Lia Martins" }, { cargo: "Cozinheiro", data: "2026-10-02" }, "Cantina Bella Notte")).toBe(
      "Oi, Lia! Aqui é do Cantina Bella Notte. Precisamos de cozinheiro no dia 02/10/2026. Você consegue? Responde aqui que eu te passo o horário.",
    );
  });
});
