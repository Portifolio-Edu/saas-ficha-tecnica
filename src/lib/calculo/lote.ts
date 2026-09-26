// Código do lote de produção: sigla da receita + dia/mês + sequência
// ("Molho de tomate", 3ª do dia 25/09 -> "MD-2509-03"). Saiu de
// src/app/producoes/actions.ts pra o modo cozinha usar a mesma regra (2026-09-25).
// FUSO (2026-09-25): dia/mês de Brasília (antes getDate() do servidor, UTC).
import { diaMesLocal } from "./dia";

export function gerarLote(nome: string, sequencia: number, agora = new Date()): string {
  const { dia: dd, mes: mm } = diaMesLocal(agora);
  const sigla = nome
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const seq = String(sequencia).padStart(2, "0");
  return `${sigla}-${dd}${mm}-${seq}`;
}
