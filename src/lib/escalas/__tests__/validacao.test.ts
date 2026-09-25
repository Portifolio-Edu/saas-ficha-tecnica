import { describe, expect, it } from "vitest";
import { normalizarHabilidades, validarCadastro, validarOcorrencia, type CadastroEscalaInput } from "../validacao";

const base: CadastroEscalaInput = {
  nome: "Kenji",
  setor: "cozinha",
  cargo: "Sushiman",
  nivel: "senior",
  habilidades: ["sushi"],
  admissao: "2026-01-10",
  desligamento: null,
  tipo: "6x1",
  ancora: "2026-09-22",
  folgasPreferidas: [2],
  intervaloDomingoSemanas: null,
  turnoInicio: "10:00",
  turnoFim: "18:00",
};

describe("validarCadastro", () => {
  it("aceita um cadastro correto", () => expect(validarCadastro(base)).toBeNull());
  it("bloqueia 12x36 e 24x48 em cozinha, salão e bar", () => {
    for (const setor of ["cozinha", "salao", "bar"] as const) {
      expect(validarCadastro({ ...base, setor, tipo: "12x36", folgasPreferidas: [] })).toMatch(/só trabalham em 5x2 ou 6x1/);
      expect(validarCadastro({ ...base, setor, tipo: "24x48", folgasPreferidas: [] })).toMatch(/só trabalham em 5x2 ou 6x1/);
    }
    expect(validarCadastro({ ...base, setor: "outro", tipo: "12x36", folgasPreferidas: [] })).toBeNull();
  });
  it("bloqueia folga na sexta, no sábado ou no domingo", () => {
    for (const d of [5, 6, 0] as const) expect(validarCadastro({ ...base, folgasPreferidas: [d] })).toMatch(/segunda a quinta/);
  });
  it("exige o número certo de folgas do regime", () => {
    expect(validarCadastro({ ...base, tipo: "5x2", folgasPreferidas: [1] })).toMatch(/2 folgas/);
    expect(validarCadastro({ ...base, tipo: "5x2", folgasPreferidas: [1, 1] })).toMatch(/diferentes/);
    expect(validarCadastro({ ...base, tipo: "5x2", folgasPreferidas: [1, 3] })).toBeNull();
  });
  it("datas e horários", () => {
    expect(validarCadastro({ ...base, admissao: "2026-02-30" })).toMatch(/admissão/);
    expect(validarCadastro({ ...base, desligamento: "2025-12-31" })).toMatch(/antes da admissão/);
    expect(validarCadastro({ ...base, turnoFim: null })).toMatch(/início e fim/);
    expect(validarCadastro({ ...base, turnoInicio: "25:00" })).toMatch(/08:00/);
  });
});

describe("validarOcorrencia", () => {
  const oc = { funcionarioId: "f1", tipo: "atestado" as const, inicio: "2026-10-09", fim: "2026-10-10", restricoes: [], nota: null };
  it("aceita", () => expect(validarOcorrencia(oc)).toBeNull());
  it("fim antes do início", () => expect(validarOcorrencia({ ...oc, fim: "2026-10-08" })).toMatch(/antes do início/));
  it("restrição exige marcar qual", () => expect(validarOcorrencia({ ...oc, tipo: "restricao" })).toMatch(/Marque/));
  it("restrição só no tipo certo", () => expect(validarOcorrencia({ ...oc, restricoes: ["sem_noturno"] })).toMatch(/só no tipo/));
});

it("normaliza habilidades", () => expect(normalizarHabilidades("Sushi, sashimi ,, Sushi")).toEqual(["sushi", "sashimi"]));
