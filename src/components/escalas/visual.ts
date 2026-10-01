// ESCALAS (2026-09-26): cores, rótulos e utilidades de calendário das telas
// de escala. Cores só dos tokens do tema (--etapa-*), funcionam no claro e no
// escuro. Trabalho = azul, folga = verde, férias = âmbar, ausência = vermelho.
import { diaDaSemana, paraDia, paraISO } from "@/lib/escalas/datas";
import type { DataISO, SituacaoDia } from "@/lib/escalas/tipos";

export const tint = (cor: string, pct: number) => `color-mix(in srgb, ${cor} ${pct}%, transparent)`;

export interface EstiloSituacao {
  rotulo: string;
  sigla: string;
  cor: string;
  texto: string;
  fundo: string;
}

const azul = "var(--etapa-estoque)";
const verde = "var(--etapa-produzido)";
const ambar = "var(--etapa-producao)";
const vermelho = "var(--etapa-perda)";

export const ESTILO: Record<SituacaoDia, EstiloSituacao> = {
  trabalho: { rotulo: "Trabalha", sigla: "T", cor: azul, texto: "var(--etapa-estoque-texto)", fundo: tint(azul, 16) },
  folga: { rotulo: "Folga", sigla: "F", cor: verde, texto: "var(--etapa-produzido-texto)", fundo: tint(verde, 16) },
  folga_domingo: { rotulo: "Folga de domingo (rodízio)", sigla: "D", cor: verde, texto: "var(--etapa-produzido-texto)", fundo: tint(verde, 28) },
  folga_compensatoria: { rotulo: "Folga compensatória", sigla: "C", cor: verde, texto: "var(--etapa-produzido-texto)", fundo: tint(verde, 10) },
  ferias: { rotulo: "Férias", sigla: "Fé", cor: ambar, texto: "var(--etapa-producao-texto)", fundo: tint(ambar, 18) },
  falta: { rotulo: "Falta", sigla: "FT", cor: vermelho, texto: "var(--etapa-perda-texto)", fundo: tint(vermelho, 18) },
  atestado: { rotulo: "Atestado", sigla: "AT", cor: vermelho, texto: "var(--etapa-perda-texto)", fundo: tint(vermelho, 14) },
  ausente: { rotulo: "Ausente", sigla: "AU", cor: vermelho, texto: "var(--etapa-perda-texto)", fundo: tint(vermelho, 14) },
  afastado: { rotulo: "Afastado", sigla: "AF", cor: "var(--tinta-sub)", texto: "var(--tinta-sub)", fundo: tint("var(--tinta)", 9) },
  fora_do_contrato: { rotulo: "Fora do contrato", sigla: "", cor: "var(--linha)", texto: "var(--tinta-faint)", fundo: "transparent" },
};

export const SIGLA_DIA = ["D", "S", "T", "Q", "Q", "S", "S"] as const;
export const NOME_DIA_CURTO = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "2026-10" → primeiro e último dia do mês. */
export function limitesDoMes(mes: string): { inicio: DataISO; fim: DataISO } {
  const [a, m] = mes.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return { inicio: `${mes}-01`, fim: `${mes}-${String(ultimo).padStart(2, "0")}` };
}

export function somarMeses(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function rotuloMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  const nome = MESES[m - 1];
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${a}`;
}

export function diasEntre(inicio: DataISO, fim: DataISO): DataISO[] {
  const out: DataISO[] = [];
  for (let d = paraDia(inicio); d <= paraDia(fim); d++) out.push(paraISO(d));
  return out;
}

export const diaSemanaDe = (d: DataISO) => diaDaSemana(paraDia(d));
export const ehPico = (d: DataISO) => {
  const w = diaSemanaDe(d);
  return w === 5 || w === 6;
};
export const diaMes = (d: DataISO) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
export const somarDias = (d: DataISO, n: number) => paraISO(paraDia(d) + n);
/** Segunda-feira da semana da data. */
export const segundaDaSemana = (d: DataISO) => somarDias(d, -((diaSemanaDe(d) + 6) % 7));

export const ROTULO_SETOR: Record<string, string> = { cozinha: "Cozinha", salao: "Salão", bar: "Bar", outro: "Apoio" };
export const rotuloEquipe = (equipe: string) => {
  const [setor, cargo] = equipe.split(":");
  return `${ROTULO_SETOR[setor] ?? setor} · ${cargo}`;
};
