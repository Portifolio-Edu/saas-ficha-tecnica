import { describe, expect, it } from "vitest";
import { gerarEscala, folgasDaSemana } from "../motor";
import { diaDaSemana, paraDia } from "../datas";
import type { DiaEscala, FuncionarioEscala } from "../tipos";

// Outubro de 2026: dia 1 é quinta; domingos 4, 11, 18, 25.
const INICIO = "2026-10-01";
const FIM = "2026-12-31";

const pessoa = (id: string, extra: Partial<FuncionarioEscala> & { escala: FuncionarioEscala["escala"] }): FuncionarioEscala => ({
  id,
  nome: id,
  setor: "cozinha",
  cargo: "Cozinheiro",
  admissao: "2026-01-01",
  ...extra,
});

const wd = (d: DiaEscala) => diaDaSemana(paraDia(d.data));
const folgou = (d: DiaEscala) => d.situacao !== "trabalho";
const trabalhou = (d: DiaEscala) => d.situacao === "trabalho";

function maiorSequencia(dias: DiaEscala[]): number {
  let max = 0;
  let atual = 0;
  for (const d of dias) {
    atual = trabalhou(d) ? atual + 1 : 0;
    max = Math.max(max, atual);
  }
  return max;
}

describe("regras de ouro", () => {
  it("5x2 com folga calculada na sexta e sábado: trabalha nos dois e folga seg–qui", () => {
    // Âncora num domingo: 5 dias de trabalho (dom–qui) e folga sex + sáb.
    const f = pessoa("ana", { escala: { tipo: "5x2", ancora: "2026-09-27" } });
    const { folgas, remanejos } = folgasDaSemana(f.escala, "5x2");
    expect(remanejos.map((r) => r.de)).toEqual([5, 6]);
    expect(folgas.every((d) => d >= 1 && d <= 4)).toBe(true);

    const { porFuncionario } = gerarEscala({ funcionarios: [f], inicio: INICIO, fim: FIM });
    const dias = porFuncionario.ana;
    expect(dias.filter((d) => wd(d) === 5 || wd(d) === 6).every(trabalhou)).toBe(true);
    const sexta = dias.find((d) => wd(d) === 5)!;
    expect(sexta.ajuste).toMatch(/Folga remanejada para quinta/);
  });

  it("ninguém de 5x2 ou 6x1 folga sexta ou sábado, em nenhuma semana", () => {
    const equipe = ["a", "b", "c", "d", "e"].map((id, i) =>
      pessoa(id, { escala: { tipo: i % 2 ? "6x1" : "5x2", ancora: `2026-09-${String(21 + i).padStart(2, "0")}` } }),
    );
    const { porFuncionario } = gerarEscala({ funcionarios: equipe, inicio: INICIO, fim: FIM });
    for (const dias of Object.values(porFuncionario)) {
      expect(dias.filter((d) => wd(d) === 5 || wd(d) === 6).some(folgou)).toBe(false);
    }
  });

  it("folgas fora do rodízio só de segunda a quinta", () => {
    const f = pessoa("bia", { escala: { tipo: "5x2", ancora: "2026-09-24" } });
    const { porFuncionario } = gerarEscala({ funcionarios: [f], inicio: INICIO, fim: FIM });
    for (const d of porFuncionario.bia) {
      if (d.situacao === "folga" || d.situacao === "folga_compensatoria") expect([1, 2, 3, 4]).toContain(wd(d));
      if (d.situacao === "folga_domingo") expect(wd(d)).toBe(0);
    }
  });

  it("5x2 mantém 5 dias de trabalho por semana, inclusive na semana do domingo", () => {
    const f = pessoa("caio", { escala: { tipo: "5x2", ancora: "2026-09-24", folgasPreferidas: [1, 2] } });
    const { porFuncionario } = gerarEscala({ funcionarios: [f], inicio: "2026-10-05", fim: "2026-12-27" });
    const dias = porFuncionario.caio;
    for (let s = 0; s < dias.length; s += 7) {
      expect(dias.slice(s, s + 7).filter(trabalhou).length).toBe(5);
    }
  });
});

describe("rodízio de domingo (equidade)", () => {
  const equipe = ["joao", "maria", "pedro"].map((id, i) =>
    pessoa(id, { admissao: `2026-0${i + 1}-01`, escala: { tipo: "6x1", ancora: "2026-09-22", folgasPreferidas: [(i + 1) as 1 | 2 | 3] } }),
  );

  it("com 3 pessoas e rodízio de 3 semanas: todo domingo 1 folga e cada um folga o mesmo número", () => {
    // 12 semanas: 5/out a 27/dez.
    const { porFuncionario } = gerarEscala({ funcionarios: equipe, inicio: "2026-10-05", fim: "2026-12-27" });
    const domingos = porFuncionario.joao.map((d, i) => ({ d, i })).filter(({ d }) => wd(d) === 0).map(({ i }) => i);
    expect(domingos.length).toBe(12);
    for (const i of domingos) {
      const deFolga = equipe.filter((f) => porFuncionario[f.id][i].situacao === "folga_domingo");
      expect(deFolga.length).toBe(1);
    }
    for (const f of equipe) {
      expect(porFuncionario[f.id].filter((d) => d.situacao === "folga_domingo").length).toBe(4);
    }
  });

  it("6x1 nunca passa de 6 dias seguidos, mesmo com o domingo do rodízio", () => {
    const { porFuncionario } = gerarEscala({ funcionarios: equipe, inicio: INICIO, fim: FIM });
    for (const f of equipe) expect(maiorSequencia(porFuncionario[f.id])).toBeLessThanOrEqual(6);
  });

  it("admissão reequilibra a fila: a pessoa nova entra no rodízio", () => {
    const nova = pessoa("lia", { admissao: "2026-11-02", escala: { tipo: "6x1", ancora: "2026-11-03", folgasPreferidas: [4] } });
    const { porFuncionario } = gerarEscala({ funcionarios: [...equipe, nova], inicio: INICIO, fim: FIM });
    expect(porFuncionario.lia.filter((d) => paraDia(d.data) < paraDia("2026-11-02")).every((d) => d.situacao === "fora_do_contrato")).toBe(true);
    expect(porFuncionario.lia.some((d) => d.situacao === "folga_domingo")).toBe(true);
  });

  it("rodízio acima de 3 semanas gera alerta pra conferir a convenção", () => {
    const { alertas } = gerarEscala({ funcionarios: equipe, regras: { intervaloDomingoSemanas: 4 }, inicio: INICIO, fim: "2026-10-31" });
    expect(alertas.filter((a) => a.tipo === "legal" && a.severidade === "atencao").length).toBe(3);
  });
});

describe("regimes alternados", () => {
  it("12x36 alterna dia sim, dia não a partir da âncora", () => {
    const f = pessoa("rui", { setor: "outro", cargo: "Segurança", escala: { tipo: "12x36", ancora: "2026-10-01" } });
    const dias = gerarEscala({ funcionarios: [f], inicio: INICIO, fim: "2026-10-10" }).porFuncionario.rui;
    expect(dias.map((d) => (trabalhou(d) ? "T" : "F")).join("")).toBe("TFTFTFTFTF");
  });

  it("24x48 trabalha 1 a cada 3 dias", () => {
    const f = pessoa("gil", { setor: "outro", cargo: "Segurança", escala: { tipo: "24x48", ancora: "2026-10-02" } });
    const dias = gerarEscala({ funcionarios: [f], inicio: INICIO, fim: "2026-10-09" }).porFuncionario.gil;
    expect(dias.map((d) => (trabalhou(d) ? "T" : "F")).join("")).toBe("FTFFTFFTF");
  });

  it("restrição de escala longa troca 12x36 por 5x2 enquanto durar", () => {
    const f = pessoa("eva", { setor: "outro", cargo: "Segurança", escala: { tipo: "12x36", ancora: "2026-10-01" } });
    const { porFuncionario, alertas } = gerarEscala({
      funcionarios: [f],
      ocorrencias: [{ id: "o1", funcionarioId: "eva", tipo: "restricao", inicio: "2026-10-05", fim: "2026-10-18", restricoes: ["sem_escala_longa"] }],
      inicio: INICIO,
      fim: "2026-10-25",
    });
    const semanaRestrita = porFuncionario.eva.filter((d) => d.data >= "2026-10-05" && d.data <= "2026-10-11");
    expect(semanaRestrita.filter(trabalhou).length).toBe(5);
    expect(semanaRestrita.filter((d) => wd(d) === 5 || wd(d) === 6).every(trabalhou)).toBe(true);
    expect(alertas.some((a) => a.tipo === "restricao")).toBe(true);
  });
});

describe("prontuário e contingência", () => {
  const sushi = pessoa("kenji", {
    setor: "cozinha",
    cargo: "Sushiman",
    nivel: "senior",
    habilidades: ["sushi", "sashimi", "maçarico"],
    escala: { tipo: "6x1", ancora: "2026-09-22", folgasPreferidas: [2] },
  });

  it("atestado em dia de trabalho vira contingência com o perfil de quem faltou", () => {
    const { porFuncionario, alertas } = gerarEscala({
      funcionarios: [sushi],
      ocorrencias: [{ id: "a1", funcionarioId: "kenji", tipo: "atestado", inicio: "2026-10-09", fim: "2026-10-10" }],
      inicio: INICIO,
      fim: "2026-10-31",
    });
    expect(porFuncionario.kenji.find((d) => d.data === "2026-10-09")!.situacao).toBe("atestado");
    const cont = alertas.filter((a) => a.tipo === "contingencia");
    expect(cont.map((a) => a.data)).toEqual(["2026-10-09", "2026-10-10"]);
    expect(cont[0].perfil).toEqual({ setor: "cozinha", cargo: "Sushiman", nivel: "senior", habilidades: ["sushi", "sashimi", "maçarico"] });
  });

  it("falta num dia de folga não gera contingência", () => {
    const { alertas } = gerarEscala({
      funcionarios: [sushi],
      ocorrencias: [{ id: "f1", funcionarioId: "kenji", tipo: "falta", inicio: "2026-10-06", fim: "2026-10-06" }], // terça = folga
      inicio: INICIO,
      fim: "2026-10-31",
    });
    expect(alertas.filter((a) => a.tipo === "contingencia")).toHaveLength(0);
  });

  it("férias tiram a pessoa sem contingência, mas a cobertura avisa", () => {
    const outro = pessoa("yuki", { cargo: "Sushiman", escala: { tipo: "6x1", ancora: "2026-09-22", folgasPreferidas: [3] } });
    const { porFuncionario, alertas } = gerarEscala({
      funcionarios: [sushi, outro],
      ocorrencias: [{ id: "v1", funcionarioId: "kenji", tipo: "ferias", inicio: "2026-10-12", fim: "2026-10-25" }],
      regras: { coberturaMinima: { "cozinha:Sushiman": 2 } },
      inicio: INICIO,
      fim: "2026-10-31",
    });
    expect(porFuncionario.kenji.filter((d) => d.situacao === "ferias")).toHaveLength(14);
    expect(alertas.filter((a) => a.tipo === "contingencia")).toHaveLength(0);
    const sexta = alertas.find((a) => a.tipo === "cobertura" && a.data === "2026-10-16");
    expect(sexta?.severidade).toBe("critico");
    expect(sexta?.faltam).toBe(1);
  });

  it("desligamento: depois da data fica fora do contrato", () => {
    const f = { ...sushi, desligamento: "2026-10-15" };
    const dias = gerarEscala({ funcionarios: [f], inicio: INICIO, fim: "2026-10-31" }).porFuncionario.kenji;
    expect(dias.filter((d) => d.data > "2026-10-15").every((d) => d.situacao === "fora_do_contrato")).toBe(true);
  });
});

describe("sexta e sábado: proibição absoluta nos setores protegidos", () => {
  it("12x36 cadastrado na cozinha (dado inválido) é calculado como 5x2 e gera alerta crítico", () => {
    const f = pessoa("bad", { escala: { tipo: "12x36", ancora: "2026-10-01" } });
    const { porFuncionario, alertas } = gerarEscala({ funcionarios: [f], inicio: INICIO, fim: FIM });
    expect(porFuncionario.bad.filter((d) => wd(d) === 5 || wd(d) === 6).every(trabalhou)).toBe(true);
    expect(alertas.some((a) => a.tipo === "legal" && a.severidade === "critico")).toBe(true);
  });

  it("varredura: 300 combinações de regime, âncora, folga e equipe num ano inteiro, sem nenhuma folga sexta/sábado e sem 7 dias seguidos", () => {
    let semente = 42;
    const aleatorio = () => ((semente = (semente * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let caso = 0; caso < 300; caso++) {
      const tamanho = 1 + Math.floor(aleatorio() * 6);
      const setor = (["cozinha", "salao", "bar"] as const)[Math.floor(aleatorio() * 3)];
      const equipe = Array.from({ length: tamanho }, (_, i) => {
        const tipo = aleatorio() < 0.5 ? "5x2" : "6x1";
        const dia = 1 + Math.floor(aleatorio() * 28);
        const preferidas =
          aleatorio() < 0.5 ? undefined : tipo === "5x2" ? ([1, 2, 3, 4].sort(() => aleatorio() - 0.5).slice(0, 2) as (1 | 2 | 3 | 4)[]) : ([1 + Math.floor(aleatorio() * 4)] as (1 | 2 | 3 | 4)[]);
        return pessoa(`p${caso}-${i}`, {
          setor,
          cargo: "Equipe",
          admissao: `2026-0${1 + Math.floor(aleatorio() * 9)}-${String(dia).padStart(2, "0")}`,
          escala: { tipo, ancora: `2026-10-${String(dia).padStart(2, "0")}`, folgasPreferidas: preferidas, intervaloDomingoSemanas: 2 + Math.floor(aleatorio() * 3) },
        });
      });
      const { porFuncionario } = gerarEscala({ funcionarios: equipe, inicio: "2026-10-01", fim: "2027-09-30" });
      for (const f of equipe) {
        const dias = porFuncionario[f.id];
        expect(dias.filter((d) => (wd(d) === 5 || wd(d) === 6) && ["folga", "folga_domingo", "folga_compensatoria"].includes(d.situacao))).toHaveLength(0);
        expect(maiorSequencia(dias)).toBeLessThanOrEqual(6);
      }
    }
  });

  it("apoio (setor outro) pode usar 12x36 normalmente", () => {
    const f = pessoa("seg", { setor: "outro", cargo: "Segurança", escala: { tipo: "12x36", ancora: "2026-10-01" } });
    const { porFuncionario, alertas } = gerarEscala({ funcionarios: [f], inicio: INICIO, fim: "2026-10-31" });
    expect(porFuncionario.seg.filter(trabalhou)).toHaveLength(16);
    expect(alertas.filter((a) => a.severidade === "critico")).toHaveLength(0);
  });
});
