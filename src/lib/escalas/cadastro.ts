// ESCALAS (2026-09-26): formato do cadastro que as telas usam (pode estar
// incompleto: pessoa criada em "Equipe" só com o nome ainda não tem setor,
// cargo nem regime) e a conversão pro formato do motor. Puro.
import type { CadastroEscalaInput } from "./validacao";
import { PERFIL_VAZIO, type PerfilCompetencia } from "./perfil";
import type { ConfigEscala, DataISO, FuncionarioEscala, Ocorrencia, Setor } from "./tipos";

export interface PessoaEscala {
  id: string;
  nome: string;
  setor: Setor | null;
  cargo: string | null;
  admissao: DataISO | null;
  desligamento: DataISO | null;
  escala: ConfigEscala | null;
  /** PERFIL (2026-09-27): prontuário de competências (só dono/gestor). */
  perfil: PerfilCompetencia;
}

export interface OcorrenciaRegistro extends Ocorrencia {
  criadoEm: string;
}

export const cadastroCompleto = (p: PessoaEscala): boolean => Boolean(p.setor && p.cargo && p.admissao && p.escala);

/** Só quem tem setor, cargo, admissão e regime entra no cálculo. */
export function paraMotor(pessoas: PessoaEscala[]): FuncionarioEscala[] {
  return pessoas.filter(cadastroCompleto).map((p) => ({
    id: p.id,
    nome: p.nome,
    setor: p.setor!,
    cargo: p.cargo!,
    nivel: p.perfil.nivel ?? undefined,
    habilidades: p.perfil.pracas,
    admissao: p.admissao!,
    desligamento: p.desligamento,
    escala: p.escala!,
  }));
}

/** Valores iniciais do formulário (pessoa nova ou existente). */
export function cadastroInicial(p: PessoaEscala | null, hoje: DataISO): CadastroEscalaInput {
  return {
    nome: p?.nome ?? "",
    setor: p?.setor ?? "cozinha",
    cargo: p?.cargo ?? "",
    admissao: p?.admissao ?? hoje,
    desligamento: p?.desligamento ?? null,
    tipo: p?.escala?.tipo ?? "6x1",
    ancora: p?.escala?.ancora ?? hoje,
    folgasPreferidas: p?.escala?.folgasPreferidas ?? [],
    intervaloDomingoSemanas: p?.escala?.intervaloDomingoSemanas ?? null,
    turnoInicio: p?.escala?.turno?.inicio ?? null,
    turnoFim: p?.escala?.turno?.fim ?? null,
  };
}

/** Aplica o formulário na pessoa (usado na demo, que não tem banco). O
 * prontuário de competências não muda aqui (tem tela própria). */
export function aplicarCadastro(id: string, c: CadastroEscalaInput, perfil: PerfilCompetencia = PERFIL_VAZIO): PessoaEscala {
  return {
    id,
    nome: c.nome.trim(),
    setor: c.setor,
    cargo: c.cargo.trim(),
    perfil,
    admissao: c.admissao,
    desligamento: c.desligamento,
    escala: {
      tipo: c.tipo,
      ancora: c.ancora,
      folgasPreferidas: c.folgasPreferidas,
      ...(c.intervaloDomingoSemanas !== null ? { intervaloDomingoSemanas: c.intervaloDomingoSemanas } : {}),
      ...(c.turnoInicio && c.turnoFim ? { turno: { inicio: c.turnoInicio, fim: c.turnoFim } } : {}),
    },
  };
}
