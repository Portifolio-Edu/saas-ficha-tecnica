// AVISOS NO WHATSAPP (2026-10-02): regras dos avisos automáticos — quando
// avisar e o texto. Sem banco nem rede (testável); quem busca os dados é
// gerar.ts e quem entrega é o n8n (workflow "FT — Avisos").
// Onde mexer: aviso novo = tipo aqui + check em avisos.tipo (migration) +
// busca em gerar.ts + opção na tela (SecaoAvisos) + rótulo no histórico.

// AVISOS PRA GESTÃO (2026-10-02): avisos focados no que o gestor precisa
// agir (insumo, fornecedor, equipe, desperdício, vendas). Temperatura saiu:
// é cobrança da nutricionista (vai ter canal próprio). Pra voltar ao formato
// anterior: supabase/reverter/20261002120000_avisos_gestao.sql + git revert.
import { formatadorData, numeroBR } from "@/lib/formato";
export type TipoAviso =
  | "estoque_baixo"
  | "compras_prazo"
  | "preco_subiu"
  | "rendimento_baixo"
  | "equipe"
  | "desperdicio"
  | "vendas"
  | "checklist_abertura"
  | "resumo_diario";

export interface ConfigAvisos {
  /** Insumo abaixo do mínimo no estoque. */
  estoqueBaixo: boolean;
  /** Pedido do fornecedor fechando, preço que subiu, carne rendendo menos. */
  fornecedor: boolean;
  /** Falta, atestado e equipe abaixo do mínimo hoje/amanhã. */
  equipe: boolean;
  /** "HH:MM": antes disso não manda aviso de equipe (o gestor ainda não está de pé). */
  equipeHora: string;
  /** Produção perdida (desperdício). */
  desperdicio: boolean;
  /** Fechamento de vendas/CMV. */
  vendas: boolean;
  checklistAbertura: boolean;
  /** "HH:MM": a partir de quando o checklist de abertura atrasado vira aviso. */
  checklistAberturaAte: string;
  resumoDiario: boolean;
  /** "HH:MM" */
  resumoHora: string;
  /** Horário de silêncio ("HH:MM"); os dois ou nenhum. Vale pra todos os avisos. */
  silencioInicio: string | null;
  silencioFim: string | null;
}

export const CONFIG_PADRAO: ConfigAvisos = {
  estoqueBaixo: true,
  fornecedor: true,
  equipe: true,
  equipeHora: "07:00",
  desperdicio: true,
  vendas: true,
  checklistAbertura: true,
  checklistAberturaAte: "11:00",
  resumoDiario: true,
  resumoHora: "08:00",
  silencioInicio: null,
  silencioFim: null,
};

const hhmm = (t: unknown) => (typeof t === "string" && t ? t.slice(0, 5) : null);

/** Linha de avisos_config → config (sem linha = padrão). Um lugar só pra tela, ação e gerador. */
export function configDaLinha(l: Record<string, unknown> | null | undefined): ConfigAvisos {
  if (!l) return CONFIG_PADRAO;
  return {
    estoqueBaixo: Boolean(l.estoque_baixo),
    fornecedor: Boolean(l.fornecedor),
    equipe: Boolean(l.equipe),
    equipeHora: hhmm(l.equipe_hora) ?? CONFIG_PADRAO.equipeHora,
    desperdicio: Boolean(l.desperdicio),
    vendas: Boolean(l.vendas),
    checklistAbertura: Boolean(l.checklist_abertura),
    checklistAberturaAte: hhmm(l.checklist_abertura_ate) ?? CONFIG_PADRAO.checklistAberturaAte,
    resumoDiario: Boolean(l.resumo_diario),
    resumoHora: hhmm(l.resumo_hora) ?? CONFIG_PADRAO.resumoHora,
    silencioInicio: hhmm(l.silencio_inicio),
    silencioFim: hhmm(l.silencio_fim),
  };
}

/** Config → colunas de avisos_config (sem cliente_id). */
export function linhaDaConfig(c: ConfigAvisos) {
  return {
    estoque_baixo: c.estoqueBaixo,
    fornecedor: c.fornecedor,
    equipe: c.equipe,
    equipe_hora: c.equipeHora,
    desperdicio: c.desperdicio,
    vendas: c.vendas,
    checklist_abertura: c.checklistAbertura,
    checklist_abertura_ate: c.checklistAberturaAte,
    resumo_diario: c.resumoDiario,
    resumo_hora: c.resumoHora,
    silencio_inicio: c.silencioInicio,
    silencio_fim: c.silencioFim,
  };
}

/** Quanto tempo depois do horário o aviso ainda faz sentido (sistema fora do ar, n8n parado). */
export const JANELA_MIN = { checklist_abertura: 4 * 60, resumo_diario: 3 * 60 } as const;

/** Limites de quando vira aviso (mexa aqui pra calibrar). */
export const LIMITES = {
  /** Avisa do pedido quando faltam até 2 h pro fornecedor fechar. */
  prazoPedidoMin: 120,
  /** Preço que subiu 10% ou mais numa troca. */
  precoSubiu: 0.1,
  /** Rendimento 10% pior que o da ficha (fator de correção maior). */
  rendimentoPior: 0.1,
  /** Só olha o que aconteceu nessas últimas horas (ligou os avisos agora: não manda o histórico). */
  recenteHoras: { preco_subiu: 24, rendimento_baixo: 24, desperdicio: 48, vendas: 24 },
  /** Item já avisado nesse período não volta a ser avisado. */
  lembraDias: 30,
} as const;

/** Tipos que juntam vários itens num aviso só e não repetem item já avisado. */
export const TIPOS_EM_LOTE = ["estoque_baixo", "compras_prazo", "preco_subiu", "rendimento_baixo", "equipe", "desperdicio"] as const satisfies readonly TipoAviso[];
export type TipoEmLote = (typeof TIPOS_EM_LOTE)[number];

/** Item de um aviso em lote: a chave identifica o item (não repete), a linha vai no texto. */
export interface ItemAviso {
  chave: string;
  linha: string;
}

/** Itens que ainda não foram avisados (mantém a ordem). */
export function itensNovos<T extends { chave: string }>(itens: T[], jaAvisados: ReadonlySet<string>): T[] {
  const vistos = new Set<string>();
  return itens.filter((i) => {
    if (jaAvisados.has(i.chave) || vistos.has(i.chave)) return false;
    vistos.add(i.chave);
    return true;
  });
}

/** "08:30" ou "08:30:00" → 510. */
export function emMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Minutos desde a meia-noite no fuso do restaurante. */
export function minutoLocal(agora: Date, fuso = "America/Sao_Paulo"): number {
  const p = Object.fromEntries(
    // DESEMPENHO (2026-10-02): formatador reaproveitado (antes: new Intl.DateTimeFormat a cada chamada).
    formatadorData({ timeZone: fuso, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }, "en-GB")
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

const fmt = (n: number, casas = 2) => numeroBR(n, { maximumFractionDigits: casas });
const reais = (n: number) => numeroBR(n, { style: "currency", currency: "BRL" }).replace(/\u00a0/g, " ");
const ddmm = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}`;
const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);

/** Até 12 linhas com "•"; o resto vira "e mais N" (WhatsApp longo ninguém lê). */
const MAX_LINHAS = 12;
function marcadores(linhas: string[]): string[] {
  if (linhas.length <= MAX_LINHAS) return linhas.map((l) => `• ${l}`);
  const cabem = linhas.slice(0, MAX_LINHAS - 1).map((l) => `• ${l}`);
  return [...cabem, `• e mais ${linhas.length - cabem.length}`];
}

/** "a, b e c" */
function emFrase(nomes: string[], max = 4): string {
  const n = nomes.slice(0, max);
  const resto = nomes.length - n.length;
  if (resto > 0) return `${n.join(", ")} e mais ${resto}`;
  return n.length > 1 ? `${n.slice(0, -1).join(", ")} e ${n[n.length - 1]}` : (n[0] ?? "");
}

/** 45 → "45 min"; 90 → "1h30"; 120 → "2h". */
export function tempoRestante(min: number): string {
  if (min < 60) return `${Math.max(1, Math.round(min))} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export function textoEstoqueBaixo(a: {
  restaurante: string;
  itens: { nome: string; saldo: number; minimo: number; unidade: string; prazo: string | null }[];
  app: string;
}): string {
  const linhas = a.itens.map((i) => `${i.nome}: ${fmt(i.saldo)} ${i.unidade} (mínimo ${fmt(i.minimo)} ${i.unidade})${i.prazo ? `. ${i.prazo}` : ""}`);
  return [`📦 *${a.restaurante}: ${plural(a.itens.length, "insumo abaixo do mínimo", "insumos abaixo do mínimo")}*`, ...marcadores(linhas), `${a.app}/estoque`].join("\n");
}

export function textoComprasPrazo(a: {
  restaurante: string;
  empresa: string;
  minutosRestantes: number;
  /** "Peça até hoje às 18h pra chegar amanhã." */
  frase: string;
  pedidos: string[];
  app: string;
}): string {
  return [
    `🛒 *${a.restaurante}: pedido do ${a.empresa} fecha em ${tempoRestante(a.minutosRestantes)}*`,
    a.frase,
    `${a.pedidos.length} ${plural(a.pedidos.length, "compra aprovada esperando", "compras aprovadas esperando")}: ${emFrase(a.pedidos)}.`,
    `${a.app}/estoque/compras`,
  ].join("\n");
}

export function textoPrecoSubiu(a: {
  restaurante: string;
  itens: { nome: string; antes: number; depois: number; unidade: string }[];
  app: string;
}): string {
  const linhas = a.itens.map((i) => `${i.nome}: ${reais(i.antes)} → ${reais(i.depois)} o ${i.unidade} (+${Math.round((i.depois / i.antes - 1) * 100)}%)`);
  return [
    `💸 *${a.restaurante}: ${plural(a.itens.length, "fornecedor subiu o preço", "fornecedores subiram preços")}*`,
    ...marcadores(linhas),
    "Os pratos que usam isso ficaram mais caros. Confira a margem.",
    `${a.app}/insumos`,
  ].join("\n");
}

export function textoRendimentoBaixo(a: {
  restaurante: string;
  itens: { nome: string; fornecedor: string | null; rendeu: number; esperado: number }[];
  app: string;
}): string {
  const linhas = a.itens.map((i) => `${i.nome}${i.fornecedor ? ` (${i.fornecedor})` : ""}: rendeu ${Math.round(i.rendeu * 100)}%, o normal é ${Math.round(i.esperado * 100)}%`);
  return [`🥩 *${a.restaurante}: carne rendendo menos que o normal*`, ...marcadores(linhas), "Vale conversar com o fornecedor.", `${a.app}/proteinas`].join("\n");
}

export function textoEquipe(a: { restaurante: string; alertas: string[]; app: string }): string {
  return [`👥 *${a.restaurante}: falta gente na equipe*`, ...marcadores(a.alertas), `${a.app}/escalas`].join("\n");
}

export function textoDesperdicio(a: {
  restaurante: string;
  itens: { receita: string; quantidade: number; unidade: string; motivo: string; responsavel: string }[];
  app: string;
}): string {
  const linhas = a.itens.map((i) => `${i.receita}, ${fmt(i.quantidade)} ${i.unidade}: ${i.motivo} (${i.responsavel})`);
  return [`🗑️ *${a.restaurante}: ${plural(a.itens.length, "produção perdida", "produções perdidas")}*`, ...marcadores(linhas), `${a.app}/producoes`].join("\n");
}

/** CMV do período = estoque inicial + compras − estoque final. */
export function cmvDoFechamento(f: { estoqueInicial: number; compras: number; estoqueFinal: number }): number {
  return f.estoqueInicial + f.compras - f.estoqueFinal;
}

export function textoVendas(a: {
  restaurante: string;
  inicio: string;
  fim: string;
  faturamento: number;
  cmv: number;
  maisVendidos: { nome: string; quantidade: number }[];
  app: string;
}): string {
  const linhas = [`📊 *${a.restaurante}: vendas de ${ddmm(a.inicio)} a ${ddmm(a.fim)}*`, `Faturamento: ${reais(a.faturamento)}`];
  if (a.faturamento > 0) linhas.push(`CMV: ${fmt((a.cmv / a.faturamento) * 100, 1)}% (${reais(a.cmv)})`);
  if (a.maisVendidos.length) {
    linhas.push("Mais vendidos:");
    a.maisVendidos.forEach((p, i) => linhas.push(`${i + 1}. ${p.nome}: ${fmt(p.quantidade, 0)}`));
  }
  linhas.push(`${a.app}/cmv`);
  return linhas.join("\n");
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
  checklist: { feitos: number; total: number };
  pedidosPendentes: number;
  /** Insumos abaixo do mínimo agora. */
  insumosAbaixo: number;
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
  if (r.checklist.total) {
    const pct = Math.round((r.checklist.feitos / r.checklist.total) * 100);
    linhas.push(`• Checklists: ${pct}% feitos (${r.checklist.feitos} de ${r.checklist.total} itens)`);
  }
  if (r.insumosAbaixo) linhas.push(`• Insumos abaixo do mínimo: ${r.insumosAbaixo}`);
  if (r.pedidosPendentes) linhas.push(`• Requisições abertas (aprovação ou compra): ${r.pedidosPendentes}`);
  linhas.push(`${r.app}/visao-geral`);
  return linhas.join("\n");
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Lê o formulário da tela (checkbox "on" = ligado). Erros por campo. */
export function lerConfigAvisos(form: FormData): { config: ConfigAvisos; erros: Record<string, string> } {
  const erros: Record<string, string> = {};
  const ligado = (n: string) => form.get(n) === "on";
  const hora = (n: string, padrao: string) => {
    const v = String(form.get(n) ?? "").trim().slice(0, 5) || padrao;
    if (!HORA.test(v)) erros[n] = "Horário inválido (ex.: 08:30).";
    return v;
  };
  const silencio = ligado("silencio");
  const config: ConfigAvisos = {
    estoqueBaixo: ligado("estoqueBaixo"),
    fornecedor: ligado("fornecedor"),
    equipe: ligado("equipe"),
    equipeHora: hora("equipeHora", CONFIG_PADRAO.equipeHora),
    desperdicio: ligado("desperdicio"),
    vendas: ligado("vendas"),
    checklistAbertura: ligado("checklistAbertura"),
    checklistAberturaAte: hora("checklistAberturaAte", CONFIG_PADRAO.checklistAberturaAte),
    resumoDiario: ligado("resumoDiario"),
    resumoHora: hora("resumoHora", CONFIG_PADRAO.resumoHora),
    silencioInicio: silencio ? hora("silencioInicio", "23:00") : null,
    silencioFim: silencio ? hora("silencioFim", "06:00") : null,
  };
  if (silencio && config.silencioInicio === config.silencioFim) erros.silencioFim = "O fim precisa ser diferente do início.";
  return { config, erros };
}
