// ESCALAS (2026-09-26): versão da escala que a cozinha vê (tablet). Só o que
// cada um precisa pra se organizar: quem trabalha, quem folga, férias e
// "ausente" — nunca o motivo (falta, atestado, afastamento, restrição).
import { chaveEquipe, gerarEscala } from "./motor";
import { diaDaSemana, paraDia, paraISO } from "./datas";
import type { DataISO, FuncionarioEscala, Ocorrencia, RegrasEscala, ResultadoEscala, Setor, SituacaoDia } from "./tipos";

export type SituacaoPublica = "trabalho" | "folga" | "ferias" | "ausente";

export interface PessoaPublica {
  id: string;
  nome: string;
  setor: Setor;
  cargo: string;
  equipe: string;
  turno: { inicio: string; fim: string } | null;
}

export interface EscalaPublica {
  inicio: DataISO;
  fim: DataISO;
  pessoas: PessoaPublica[];
  /** Por pessoa, um item por dia do período; null = fora do contrato. */
  dias: Record<string, ({ data: DataISO; situacao: SituacaoPublica } | null)[]>;
}

export function situacaoPublica(s: SituacaoDia): SituacaoPublica | null {
  switch (s) {
    case "trabalho":
      return "trabalho";
    case "folga":
    case "folga_domingo":
    case "folga_compensatoria":
      return "folga";
    case "ferias":
      return "ferias";
    case "fora_do_contrato":
      return null;
    default:
      return "ausente";
  }
}

export function publicarEscala(funcionarios: FuncionarioEscala[], resultado: ResultadoEscala, inicio: DataISO, fim: DataISO): EscalaPublica {
  const pessoas = funcionarios
    .filter((f) => (resultado.porFuncionario[f.id] ?? []).some((d) => d.situacao !== "fora_do_contrato"))
    .map((f) => ({ id: f.id, nome: f.nome, setor: f.setor, cargo: f.cargo, equipe: chaveEquipe(f), turno: f.escala.turno ?? null }))
    .sort((a, b) => a.setor.localeCompare(b.setor) || a.cargo.localeCompare(b.cargo) || a.nome.localeCompare(b.nome));
  const dias: EscalaPublica["dias"] = {};
  for (const p of pessoas) {
    dias[p.id] = (resultado.porFuncionario[p.id] ?? []).map((d) => {
      const s = situacaoPublica(d.situacao);
      return s ? { data: d.data, situacao: s } : null;
    });
  }
  return { inicio, fim, pessoas, dias };
}

/**
 * Período que o tablet recebe: da segunda da semana passada até o domingo
 * daqui a 5 semanas (7 semanas, 49 dias; a função escala_publica aceita até 62).
 */
export function periodoCozinha(hoje: DataISO): { inicio: DataISO; fim: DataISO } {
  const h = paraDia(hoje);
  const segunda = h - ((diaDaSemana(h) + 6) % 7);
  return { inicio: paraISO(segunda - 7), fim: paraISO(segunda + 41) };
}

/**
 * Calcula e publica a escala da cozinha. Se o motor recusar (ex.: alguma
 * folga cairia em sexta/sábado num setor protegido), devolve null: o tablet
 * mostra "escala em revisão" em vez de uma escala errada.
 */
export function montarEscalaPublica(
  entrada: { funcionarios: FuncionarioEscala[]; ocorrencias: Ocorrencia[]; regras: RegrasEscala },
  inicio: DataISO,
  fim: DataISO,
): EscalaPublica | null {
  try {
    const resultado = gerarEscala({ ...entrada, inicio, fim });
    return publicarEscala(entrada.funcionarios, resultado, inicio, fim);
  } catch {
    return null;
  }
}

/**
 * Mesmo recorte que a função escala_publica faz no banco (usado na demo, que
 * não tem banco): falta/atestado → "ausencia", afastamento →
 * "ausencia_prolongada", restrição só quando muda a escala; sem nota, nível
 * nem habilidades. Se mudar aqui, mude a migration (e vice-versa).
 */
export function recortePublico(funcionarios: FuncionarioEscala[], ocorrencias: Ocorrencia[], regras: RegrasEscala) {
  return {
    regras: { intervaloDomingoSemanas: regras.intervaloDomingoSemanas, coberturaMinima: {} },
    funcionarios: funcionarios.map(({ id, nome, setor, cargo, admissao, desligamento, escala }) => ({ id, nome, setor, cargo, admissao, desligamento, escala })),
    ocorrencias: ocorrencias
      .filter((o) => o.tipo !== "restricao" || o.restricoes?.includes("sem_escala_longa"))
      .map((o, i): Ocorrencia => ({
        id: `pub-${i}`,
        funcionarioId: o.funcionarioId,
        tipo: o.tipo === "ferias" || o.tipo === "restricao" ? o.tipo : o.tipo === "afastamento" || o.tipo === "ausencia_prolongada" ? "ausencia_prolongada" : "ausencia",
        inicio: o.inicio,
        fim: o.fim,
        ...(o.tipo === "restricao" ? { restricoes: ["sem_escala_longa" as const] } : {}),
      })),
  };
}
