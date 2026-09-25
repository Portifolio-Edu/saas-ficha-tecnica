import { describe, expect, it } from "vitest";
import { gerarEscala } from "../motor";
import { diaDaSemana, paraDia, paraISO } from "../datas";
import { paraMotor } from "../cadastro";
import { montarEscalaPublica, periodoCozinha, publicarEscala, recortePublico, situacaoPublica } from "../publica";
import { validarCadastro } from "../validacao";
import { escalasDemoIniciais } from "@/lib/demo/escalas";
import type { FuncionarioEscala, Ocorrencia } from "../tipos";

// ESCALAS (2026-09-26): a cozinha tem que ver exatamente o que o gestor vê
// (só que sem motivo). Estes testes rodam as duas versões lado a lado.

const HOJES = ["2026-09-25", "2026-09-28", "2026-10-03", "2026-12-24", "2027-02-14"];

describe("periodoCozinha", () => {
  it("começa numa segunda, tem 7 semanas e cabe no limite da escala_publica (62 dias)", () => {
    for (const hoje of HOJES) {
      const { inicio, fim } = periodoCozinha(hoje);
      expect(diaDaSemana(paraDia(inicio))).toBe(1);
      expect(diaDaSemana(paraDia(fim))).toBe(0);
      expect(paraDia(fim) - paraDia(inicio)).toBe(48);
      expect(paraDia(inicio) <= paraDia(hoje) && paraDia(hoje) <= paraDia(fim)).toBe(true);
    }
  });
});

describe("escala pública = escala do gestor sem o motivo", () => {
  it("dia a dia, a cozinha vê a mesma situação que o gestor (dados da demo)", () => {
    for (const hoje of HOJES) {
      const { pessoas, ocorrencias, regras } = escalasDemoIniciais(hoje);
      const funcionarios = paraMotor(pessoas);
      const { inicio, fim } = periodoCozinha(hoje);
      const gestao = gerarEscala({ funcionarios, ocorrencias, regras, inicio, fim });
      const publica = montarEscalaPublica(recortePublico(funcionarios, ocorrencias, regras), inicio, fim);
      expect(publica).not.toBeNull();
      for (const p of publica!.pessoas) {
        const esperado = gestao.porFuncionario[p.id].map((d) => situacaoPublica(d.situacao));
        expect(publica!.dias[p.id].map((d) => d?.situacao ?? null)).toEqual(esperado);
      }
    }
  });

  it("falta lançada num dia de folga continua folga pros dois", () => {
    const f: FuncionarioEscala = { id: "a", nome: "A", setor: "cozinha", cargo: "Cozinheiro", admissao: "2026-01-01", escala: { tipo: "6x1", ancora: "2026-01-05", folgasPreferidas: [2] } };
    // 2026-10-06 é terça (folga fixa).
    const ocs: Ocorrencia[] = [{ id: "x", funcionarioId: "a", tipo: "falta", inicio: "2026-10-06", fim: "2026-10-06" }];
    const regras = { intervaloDomingoSemanas: 3, coberturaMinima: {} };
    const gestao = gerarEscala({ funcionarios: [f], ocorrencias: ocs, regras, inicio: "2026-10-05", fim: "2026-10-11" });
    const publica = montarEscalaPublica(recortePublico([f], ocs, regras), "2026-10-05", "2026-10-11")!;
    expect(gestao.porFuncionario.a[1].situacao).toBe("folga");
    expect(publica.dias.a[1]?.situacao).toBe("folga");
    expect(gestao.alertas.filter((a) => a.tipo === "contingencia")).toHaveLength(0);
  });

  it("afastamento cobre o período todo, folga inclusive, e aparece como ausente", () => {
    const f: FuncionarioEscala = { id: "a", nome: "A", setor: "cozinha", cargo: "Cozinheiro", admissao: "2026-01-01", escala: { tipo: "6x1", ancora: "2026-01-05", folgasPreferidas: [2] } };
    const ocs: Ocorrencia[] = [{ id: "x", funcionarioId: "a", tipo: "afastamento", inicio: "2026-10-05", fim: "2026-10-11" }];
    const regras = { intervaloDomingoSemanas: 3, coberturaMinima: {} };
    const gestao = gerarEscala({ funcionarios: [f], ocorrencias: ocs, regras, inicio: "2026-10-05", fim: "2026-10-11" });
    const publica = montarEscalaPublica(recortePublico([f], ocs, regras), "2026-10-05", "2026-10-11")!;
    expect(gestao.porFuncionario.a.every((d) => d.situacao === "afastado")).toBe(true);
    expect(publica.dias.a.every((d) => d?.situacao === "ausente")).toBe(true);
  });

  it("vale a ocorrência mais forte, em qualquer ordem: afastamento > férias > falta", () => {
    const f: FuncionarioEscala = { id: "a", nome: "A", setor: "salao", cargo: "Garçom", admissao: "2026-01-01", escala: { tipo: "6x1", ancora: "2026-01-05", folgasPreferidas: [1] } };
    const base: Ocorrencia[] = [
      { id: "1", funcionarioId: "a", tipo: "falta", inicio: "2026-10-09", fim: "2026-10-09" },
      { id: "2", funcionarioId: "a", tipo: "ferias", inicio: "2026-10-08", fim: "2026-10-10" },
      { id: "3", funcionarioId: "a", tipo: "afastamento", inicio: "2026-10-10", fim: "2026-10-10" },
    ];
    const regras = { intervaloDomingoSemanas: 3, coberturaMinima: {} };
    for (const ocs of [base, [...base].reverse(), [base[1], base[2], base[0]]]) {
      const r = gerarEscala({ funcionarios: [f], ocorrencias: ocs, regras, inicio: "2026-10-08", fim: "2026-10-10" });
      expect(r.porFuncionario.a.map((d) => d.situacao)).toEqual(["ferias", "ferias", "afastado"]);
      expect(r.alertas.filter((a) => a.tipo === "contingencia")).toHaveLength(0);
    }
  });

  it("nada de motivo, nota, nível ou habilidade sai pra cozinha", () => {
    const hoje = "2026-10-01";
    const { pessoas, ocorrencias, regras } = escalasDemoIniciais(hoje);
    const funcionarios = paraMotor(pessoas);
    const { inicio, fim } = periodoCozinha(hoje);
    const corte = recortePublico(funcionarios, ocorrencias, regras);
    const texto = JSON.stringify([corte, montarEscalaPublica(corte, inicio, fim)]);
    expect(texto).not.toMatch(/falta|atestado|afastamento|afastado|nota|Avisou|nivel|habilidades|sem_noturno|sem_carga_pesada|coberturaMinima":\{"/);
  });
});

describe("dados da demo", () => {
  it("cadastros completos passam na mesma validação da tela e do servidor", () => {
    for (const p of escalasDemoIniciais("2026-09-25").pessoas.filter((x) => x.escala)) {
      const e = p.escala!;
      expect(
        validarCadastro({
          nome: p.nome,
          setor: p.setor!,
          cargo: p.cargo!,
          nivel: p.nivel,
          habilidades: p.habilidades,
          admissao: p.admissao!,
          desligamento: p.desligamento,
          tipo: e.tipo,
          ancora: e.ancora,
          folgasPreferidas: e.folgasPreferidas ?? [],
          intervaloDomingoSemanas: e.intervaloDomingoSemanas ?? null,
          turnoInicio: e.turno?.inicio ?? null,
          turnoFim: e.turno?.fim ?? null,
        }),
        p.nome,
      ).toBeNull();
    }
  });

  it("cozinha, salão e bar nunca folgam sexta nem sábado; atestado da sexta vira contingência", () => {
    for (const hoje of HOJES) {
      const { pessoas, ocorrencias, regras } = escalasDemoIniciais(hoje);
      const funcionarios = paraMotor(pessoas);
      const inicio = paraISO(paraDia(hoje) - 35);
      const fim = paraISO(paraDia(hoje) + 120);
      const r = gerarEscala({ funcionarios, ocorrencias, regras, inicio, fim });
      for (const f of funcionarios.filter((x) => x.setor !== "outro")) {
        for (const d of r.porFuncionario[f.id]) {
          if (d.situacao.startsWith("folga")) expect([5, 6]).not.toContain(diaDaSemana(paraDia(d.data)));
        }
      }
      const atestado = ocorrencias.find((o) => o.tipo === "atestado")!;
      expect(r.alertas.some((a) => a.tipo === "contingencia" && a.funcionarioId === "f-marcos" && a.data === atestado.inicio)).toBe(true);
    }
  });
});

describe("publicarEscala", () => {
  it("ignora quem está fora do contrato no período todo", () => {
    const f: FuncionarioEscala = { id: "n", nome: "N", setor: "bar", cargo: "Bartender", admissao: "2027-01-01", escala: { tipo: "6x1", ancora: "2027-01-04", folgasPreferidas: [1] } };
    const r = gerarEscala({ funcionarios: [f], ocorrencias: [], regras: { intervaloDomingoSemanas: 3, coberturaMinima: {} }, inicio: "2026-10-01", fim: "2026-10-31" });
    expect(publicarEscala([f], r, "2026-10-01", "2026-10-31").pessoas).toHaveLength(0);
  });
});
