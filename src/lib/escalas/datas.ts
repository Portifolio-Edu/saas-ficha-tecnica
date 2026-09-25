// ESCALAS (2026-09-26): aritmética de dias civis, em UTC, pra não depender do
// fuso do servidor (a Vercel roda em UTC; o restaurante, em Brasília).
import type { DataISO, DiaSemana } from "./tipos";

const MS_DIA = 86_400_000;

/** Dias desde 1970-01-01. */
export function paraDia(data: DataISO): number {
  const [a, m, d] = data.split("-").map(Number);
  return Math.floor(Date.UTC(a, m - 1, d) / MS_DIA);
}

export function paraISO(dia: number): DataISO {
  return new Date(dia * MS_DIA).toISOString().slice(0, 10);
}

/** 1970-01-01 foi quinta-feira. */
export function diaDaSemana(dia: number): DiaSemana {
  return ((((dia + 4) % 7) + 7) % 7) as DiaSemana;
}

/** Semana de segunda a domingo, numerada desde 1970-01-05 (segunda). */
export function semanaAbsoluta(dia: number): number {
  return Math.floor((dia - 4) / 7);
}

/** Resto sempre positivo (pra datas antes da âncora). */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export const NOME_DIA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"] as const;
