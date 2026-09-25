// FUSO (2026-09-25): "hoje" do restaurante. O servidor da Vercel roda em UTC,
// então `new Date().setHours(0)` virava o dia às 21h de Brasília: checklist
// marcado às 20h sumia do painel às 21h e a produção da noite caía no "hoje"
// errado. Aqui o dia é sempre o de Brasília (sem horário de verão desde 2019).
// Restaurante em outro fuso (Manaus, Acre...) precisaria de um fuso por
// cliente: trocar FUSO_RESTAURANTE por um campo em `clientes`.
// Reverter: voltar os chamadores pra `d.setHours(0, 0, 0, 0)` e apagar este arquivo.

export const FUSO_RESTAURANTE = "America/Sao_Paulo";

function partes(agora: Date, fuso: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZoneName: "longOffset",
  });
  const p = Object.fromEntries(f.formatToParts(agora).map((x) => [x.type, x.value]));
  const offset = p.timeZoneName === "GMT" ? "+00:00" : p.timeZoneName.replace("GMT", "");
  return { ano: p.year, mes: p.month, dia: p.day, offset };
}

/** Meia-noite de hoje no fuso do restaurante, em ISO (UTC). */
export function inicioDoDiaISO(agora = new Date(), fuso = FUSO_RESTAURANTE): string {
  const { ano, mes, dia, offset } = partes(agora, fuso);
  return new Date(`${ano}-${mes}-${dia}T00:00:00${offset}`).toISOString();
}

/** Dia e mês de hoje no fuso do restaurante ("25", "09"). */
export function diaMesLocal(agora = new Date(), fuso = FUSO_RESTAURANTE): { dia: string; mes: string } {
  const { dia, mes } = partes(agora, fuso);
  return { dia, mes };
}
