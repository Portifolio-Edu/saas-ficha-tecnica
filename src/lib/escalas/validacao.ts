// ESCALAS (2026-09-26): validação dos cadastros de escala e prontuário. Pura,
// usada no formulário (antes de enviar), na demo e nas server actions. O
// banco repete as regras críticas (check + trigger), então nada passa por
// fora da tela.
import { paraDia } from "./datas";
import { regimesPermitidos, setorProtegido } from "./motor";
import type { DataISO, DiaSemana, Restricao, Setor, TipoEscala, TipoOcorrencia } from "./tipos";

export const SETORES: { id: Setor; rotulo: string }[] = [
  { id: "cozinha", rotulo: "Cozinha" },
  { id: "salao", rotulo: "Salão" },
  { id: "bar", rotulo: "Bar" },
  { id: "outro", rotulo: "Apoio (segurança, limpeza, manutenção...)" },
];
export const REGIMES: { id: TipoEscala; rotulo: string; descricao: string }[] = [
  { id: "5x2", rotulo: "5x2", descricao: "5 dias de trabalho e 2 folgas por semana" },
  { id: "6x1", rotulo: "6x1", descricao: "6 dias de trabalho e 1 folga por semana" },
  { id: "12x36", rotulo: "12x36", descricao: "12h de trabalho, 36h de descanso (só apoio)" },
  { id: "24x48", rotulo: "24x48", descricao: "24h de trabalho, 48h de descanso (só apoio)" },
];
export const TIPOS_OCORRENCIA: { id: Exclude<TipoOcorrencia, "ausencia" | "ausencia_prolongada">; rotulo: string }[] = [
  { id: "falta", rotulo: "Falta" },
  { id: "atestado", rotulo: "Atestado" },
  { id: "afastamento", rotulo: "Afastamento" },
  { id: "ferias", rotulo: "Férias" },
  { id: "restricao", rotulo: "Restrição temporária" },
];
export const RESTRICOES: { id: Restricao; rotulo: string }[] = [
  { id: "sem_escala_longa", rotulo: "Sem 12x36 / 24x48" },
  { id: "sem_noturno", rotulo: "Sem turno noturno (depois das 22h)" },
  { id: "sem_carga_pesada", rotulo: "Sem carregar peso" },
];

export interface CadastroEscalaInput {
  nome: string;
  setor: Setor;
  cargo: string;
  admissao: DataISO;
  desligamento: DataISO | null;
  tipo: TipoEscala;
  ancora: DataISO;
  folgasPreferidas: DiaSemana[];
  intervaloDomingoSemanas: number | null;
  turnoInicio: string | null;
  turnoFim: string | null;
}

export interface OcorrenciaInput {
  funcionarioId: string;
  tipo: Exclude<TipoOcorrencia, "ausencia" | "ausencia_prolongada">;
  inicio: DataISO;
  fim: DataISO;
  restricoes: Restricao[];
  nota: string | null;
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const dataValida = (d: string) => DATA.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;

/** Devolve a mensagem do primeiro problema, ou null se estiver tudo certo. */
export function validarCadastro(c: CadastroEscalaInput): string | null {
  if (!c.nome.trim()) return "Informe o nome.";
  if (c.nome.trim().length > 80) return "Nome com no máximo 80 caracteres.";
  if (!SETORES.some((s) => s.id === c.setor)) return "Escolha o setor.";
  if (!c.cargo.trim()) return "Informe o cargo (ex.: Cozinheiro, Sushiman, Garçom).";
  if (c.cargo.trim().length > 40) return "Cargo com no máximo 40 caracteres.";
  if (!dataValida(c.admissao)) return "Informe a data de admissão.";
  if (c.desligamento && !dataValida(c.desligamento)) return "Data de desligamento inválida.";
  if (c.desligamento && paraDia(c.desligamento) < paraDia(c.admissao)) return "O desligamento não pode ser antes da admissão.";
  if (!REGIMES.some((r) => r.id === c.tipo)) return "Escolha o regime.";
  if (!regimesPermitidos(c.setor).includes(c.tipo)) {
    return "Cozinha, salão e bar só trabalham em 5x2 ou 6x1: em 12x36 e 24x48 a folga cairia na sexta ou no sábado.";
  }
  if (!dataValida(c.ancora)) return "Informe o primeiro dia de trabalho do ciclo.";
  const n = c.tipo === "5x2" ? 2 : c.tipo === "6x1" ? 1 : 0;
  if (n === 0 && c.folgasPreferidas.length > 0) return "12x36 e 24x48 não têm folga fixa: os dias alternam.";
  if (c.folgasPreferidas.some((d) => d < 1 || d > 4)) return "Folga só de segunda a quinta: sexta e sábado são dias de pico e domingo é pelo rodízio.";
  if (new Set(c.folgasPreferidas).size !== c.folgasPreferidas.length) return "Escolha dias de folga diferentes.";
  if (n > 0 && c.folgasPreferidas.length > 0 && c.folgasPreferidas.length !== n) return `${c.tipo} tem ${n} ${n === 1 ? "folga" : "folgas"} por semana: escolha ${n}.`;
  if (c.intervaloDomingoSemanas !== null && !(Number.isInteger(c.intervaloDomingoSemanas) && c.intervaloDomingoSemanas >= 1 && c.intervaloDomingoSemanas <= 7)) {
    return "Rodízio de domingo entre 1 e 7 semanas.";
  }
  if ((c.turnoInicio && !HORA.test(c.turnoInicio)) || (c.turnoFim && !HORA.test(c.turnoFim))) return "Horário no formato 08:00.";
  if (Boolean(c.turnoInicio) !== Boolean(c.turnoFim)) return "Informe início e fim do turno (ou nenhum dos dois).";
  if (setorProtegido(c.setor) && c.tipo !== "5x2" && c.tipo !== "6x1") return "Regime não permitido pro setor.";
  return null;
}

export function validarOcorrencia(o: OcorrenciaInput): string | null {
  if (!o.funcionarioId) return "Escolha a pessoa.";
  if (!TIPOS_OCORRENCIA.some((t) => t.id === o.tipo)) return "Escolha o tipo.";
  if (!dataValida(o.inicio) || !dataValida(o.fim)) return "Informe as datas.";
  if (paraDia(o.fim) < paraDia(o.inicio)) return "O fim não pode ser antes do início.";
  if (paraDia(o.fim) - paraDia(o.inicio) > 366) return "Período de no máximo 1 ano.";
  if (o.tipo === "restricao" && o.restricoes.length === 0) return "Marque qual é a restrição.";
  if (o.tipo !== "restricao" && o.restricoes.length > 0) return "Restrição só no tipo \"Restrição temporária\".";
  if (o.restricoes.some((r) => !RESTRICOES.some((x) => x.id === r))) return "Restrição inválida.";
  if (o.nota && o.nota.length > 500) return "Observação com no máximo 500 caracteres.";
  return null;
}
