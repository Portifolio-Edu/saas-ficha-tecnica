// AVISOS NO WHATSAPP (2026-10-02): regras dos avisos automáticos — quando
// avisar e o texto. Sem banco nem rede (testável); quem busca os dados é
// gerar.ts e quem entrega é o n8n (workflow "FT — Avisos").
// Onde mexer: aviso novo = tipo aqui + check em avisos.tipo (migration) +
// busca em gerar.ts + opção na tela (SecaoAvisos).

export type TipoAviso = "temperatura" | "checklist_abertura" | "resumo_diario";

export interface ConfigAvisos {
  temperatura: boolean;
  checklistAbertura: boolean;
  /** "HH:MM": a partir de quando o checklist de abertura atrasado vira aviso. */
  checklistAberturaAte: string;
  resumoDiario: boolean;
  /** "HH:MM" */
  resumoHora: string;
  /** Horário de silêncio ("HH:MM"); os dois ou nenhum. Temperatura não respeita. */
  silencioInicio: string | null;
  silencioFim: string | null;
}

export const CONFIG_PADRAO: ConfigAvisos = {
  temperatura: true,
  checklistAbertura: true,
  checklistAberturaAte: "11:00",
  resumoDiario: true,
  resumoHora: "08:00",
  silencioInicio: null,
  silencioFim: null,
};

/** Quanto tempo depois do horário o aviso ainda faz sentido (sistema fora do ar, n8n parado). */
export const JANELA_MIN = { checklist_abertura: 4 * 60, resumo_diario: 3 * 60 } as const;
/** Registro de temperatura mais velho que isso não vira aviso (ligou os avisos agora, não manda o histórico). */
export const TEMPERATURA_RECENTE_MIN = 120;

/** "08:30" ou "08:30:00" → 510. */
export function emMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Minutos desde a meia-noite no fuso do restaurante. */
export function minutoLocal(agora: Date, fuso = "America/Sao_Paulo"): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: fuso, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(agora)
      .map((x) => [x.type, x.value]),
  );
  return Number(p.hour) * 60 + Number(p.minute);
}

/** Dentro do silêncio? Aceita silêncio que vira a noite (23:00 → 06:00). */
export function noSilencio(minuto: number, cfg: Pick<ConfigAvisos, "silencioInicio" | "silencioFim">): boolean {
  if (!cfg.silencioInicio || !cfg.silencioFim) return false;
  const ini = emMinutos(cfg.silencioInicio);
  const fim = emMinutos(cfg.silencioFim);
  return ini < fim ? minuto >= ini && minuto < fim : minuto >= ini || minuto < fim;
}

/** Entre o horário e o horário + duração (no mesmo dia). */
export function naJanela(minuto: number, inicio: string, duracaoMin: number): boolean {
  const ini = emMinutos(inicio);
  return minuto >= ini && minuto < Math.min(ini + duracaoMin, 24 * 60);
}

const hora = (iso: string, fuso = "America/Sao_Paulo") =>
  new Date(iso).toLocaleTimeString("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit" });

const fmt = (n: number) => String(n).replace(".", ",");

export function textoTemperatura(a: {
  restaurante: string;
  local: string;
  temperaturaC: number;
  faixa: string | null;
  responsavel: string;
  registradoEm: string;
  app: string;
}): string {
  return [
    `🌡️ *${a.restaurante}: temperatura fora da faixa*`,
    `${a.local}: *${fmt(a.temperaturaC)} °C*${a.faixa ? ` (o certo é ${a.faixa})` : ""}.`,
    `Registrado por ${a.responsavel} às ${hora(a.registradoEm)}.`,
    "Confira o equipamento e os alimentos que estão nele.",
    `${a.app}/seguranca`,
  ].join("\n");
}

export function textoChecklistAbertura(a: {
  restaurante: string;
  limite: string;
  pendentes: { nome: string; feitos: number; total: number }[];
  app: string;
}): string {
  const linhas = a.pendentes.map((p) => `• ${p.nome}: ${p.feitos} de ${p.total} itens`);
  return [`📋 *${a.restaurante}: abertura não terminou*`, `Passou das ${a.limite.slice(0, 5)} e falta:`, ...linhas, `${a.app}/checklists`].join("\n");
}

export interface DadosResumo {
  restaurante: string;
  /** "2026-10-01" (ontem) */
  data: string;
  produzidas: number;
  perdas: { receita: string; motivo: string }[];
  temperaturasFora: number;
  checklist: { feitos: number; total: number };
  pedidosPendentes: number;
  app: string;
}

export function textoResumo(r: DadosResumo): string {
  const [, mes, dia] = r.data.split("-");
  const linhas = [`☀️ *${r.restaurante}: como foi ontem (${dia}/${mes})*`];
  linhas.push(`• Produções concluídas: ${r.produzidas}`);
  if (r.perdas.length) {
    const exemplos = r.perdas.slice(0, 3).map((p) => `${p.receita} (${p.motivo})`).join("; ");
    linhas.push(`• Perdas: ${r.perdas.length}: ${exemplos}${r.perdas.length > 3 ? "…" : ""}`);
  } else {
    linhas.push("• Perdas: nenhuma");
  }
  linhas.push(r.temperaturasFora ? `• Temperaturas fora da faixa: ${r.temperaturasFora}` : "• Temperaturas: todas na faixa");
  if (r.checklist.total) {
    const pct = Math.round((r.checklist.feitos / r.checklist.total) * 100);
    linhas.push(`• Checklists: ${pct}% feitos (${r.checklist.feitos} de ${r.checklist.total} itens)`);
  }
  if (r.pedidosPendentes) linhas.push(`• Pedidos da cozinha esperando compra: ${r.pedidosPendentes}`);
  linhas.push(`${r.app}/visao-geral`);
  return linhas.join("\n");
}
