// PEDIDOS DA COZINHA (2026-09-26): a cozinha pede, quem compra resolve.
// Aqui: categorias do pedido, tipos, e a conta do prazo — "até quando pedir
// pra chegar na próxima entrega" — a partir da agenda do fornecedor
// (dias da semana de entrega, horário limite e quantos dias antes).
// Tudo no relógio do restaurante (America/Sao_Paulo), sem depender do fuso
// do servidor ou do aparelho.

import type { Categoria } from "./insumo";

export type CategoriaPedido = "hortifruti" | "proteinas" | "secos" | "laticinios" | "outros";

export const CATEGORIAS_PEDIDO: { id: CategoriaPedido; rotulo: string }[] = [
  { id: "hortifruti", rotulo: "Hortifrúti" },
  { id: "proteinas", rotulo: "Proteínas" },
  { id: "secos", rotulo: "Secos" },
  { id: "laticinios", rotulo: "Laticínios" },
  { id: "outros", rotulo: "Outros" },
];

export const UNIDADES_PEDIDO = ["kg", "g", "un", "cx", "pct", "maço", "dz", "l", "ml"] as const;
export type UnidadePedido = (typeof UNIDADES_PEDIDO)[number];

/** Categoria do insumo → categoria do pedido (a cozinha pode trocar). */
export function categoriaDoInsumo(c: Categoria): CategoriaPedido {
  if (c === "proteina") return "proteinas";
  if (c === "hortalica" || c === "fruta") return "hortifruti";
  if (c === "laticinio") return "laticinios";
  if (c === "tempero") return "secos";
  return "outros";
}

export type StatusRequisicao = "pendente" | "comprado" | "cancelado";

export interface Requisicao {
  id: string;
  categoria: CategoriaPedido;
  insumoId: string | null;
  descricao: string;
  quantidade: number | null;
  unidade: UnidadePedido | null;
  observacao: string | null;
  responsavel: string;
  status: StatusRequisicao;
  criadoEm: string;
  resolvidoEm: string | null;
}

export interface NovaRequisicao {
  categoria: CategoriaPedido;
  insumoId: string | null;
  descricao: string;
  quantidade: number | null;
  unidade: UnidadePedido | null;
  observacao: string | null;
}

export function validarRequisicao(r: NovaRequisicao): string | null {
  if (!CATEGORIAS_PEDIDO.some((c) => c.id === r.categoria)) return "Escolha a categoria.";
  const d = r.descricao.trim();
  if (!d) return "Diga o que precisa (ex.: tomate, coentro).";
  if (d.length > 120) return "Nome do item muito longo.";
  if (r.quantidade !== null && !(r.quantidade > 0 && r.quantidade < 100000)) return "Quantidade inválida.";
  if (r.quantidade !== null && !r.unidade) return "Escolha a unidade.";
  if ((r.observacao ?? "").length > 200) return "Observação com até 200 letras.";
  return null;
}

/** Agenda de entrega de um fornecedor (o que a cozinha pode ver). */
export interface AgendaFornecedor {
  empresa: string;
  categorias: CategoriaPedido[];
  /** 0 = domingo … 6 = sábado. */
  diasEntrega: number[];
  /** "18:00" (null = sem horário limite: vale o dia todo). */
  pedidoAte: string | null;
  /** Quantos dias antes da entrega o pedido precisa sair (0 = no próprio dia). */
  antecedencia: number;
}

export const DIAS_SEMANA_CURTO = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Data e minuto do dia no relógio do restaurante. */
export interface Agora {
  data: string; // AAAA-MM-DD
  minutos: number; // 0..1439
}

export function agoraNoRestaurante(d: Date = new Date(), fuso = "America/Sao_Paulo"): Agora {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return { data: `${p.year}-${p.month}-${p.day}`, minutos: Number(p.hour) * 60 + Number(p.minute) };
}

function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
function diaDaSemana(data: string): number {
  return new Date(`${data}T12:00:00Z`).getUTCDay();
}
function minutosDe(hora: string | null): number | null {
  if (!hora) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(hora);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export interface ProximoPedido {
  empresa: string;
  /** Dia da entrega (AAAA-MM-DD). */
  entrega: string;
  /** Último dia pra pedir (AAAA-MM-DD) e o horário limite nele (null = o dia todo). */
  prazoData: string;
  prazoHora: string | null;
  /** Minutos até o prazo (pra destacar quando está perto). */
  minutosRestantes: number;
}

/** Próxima entrega que ainda dá tempo de pedir, olhando até 3 semanas à frente. */
export function proximoPedido(f: AgendaFornecedor, agora: Agora): ProximoPedido | null {
  if (f.diasEntrega.length === 0) return null;
  const limite = minutosDe(f.pedidoAte);
  for (let i = 0; i <= 21; i++) {
    const entrega = somarDias(agora.data, i);
    if (!f.diasEntrega.includes(diaDaSemana(entrega))) continue;
    const prazoData = somarDias(entrega, -f.antecedencia);
    const diasAtePrazo = Math.round((Date.parse(`${prazoData}T00:00:00Z`) - Date.parse(`${agora.data}T00:00:00Z`)) / 86_400_000);
    const minutoPrazo = limite ?? 24 * 60;
    const minutosRestantes = diasAtePrazo * 24 * 60 + minutoPrazo - agora.minutos;
    if (minutosRestantes <= 0) continue;
    return { empresa: f.empresa, entrega, prazoData, prazoHora: limite === null ? null : f.pedidoAte!.slice(0, 5), minutosRestantes };
  }
  return null;
}

/** Fornecedores da categoria, do prazo mais próximo pro mais distante. */
export function pedidosDaCategoria(agenda: AgendaFornecedor[], categoria: CategoriaPedido, agora: Agora): ProximoPedido[] {
  return agenda
    .filter((f) => f.categorias.includes(categoria))
    .map((f) => proximoPedido(f, agora))
    .filter((p): p is ProximoPedido => p !== null)
    .sort((a, b) => a.minutosRestantes - b.minutosRestantes);
}

function nomeDoDia(data: string, agora: Agora): string {
  const dif = Math.round((Date.parse(`${data}T00:00:00Z`) - Date.parse(`${agora.data}T00:00:00Z`)) / 86_400_000);
  if (dif === 0) return "hoje";
  if (dif === 1) return "amanhã";
  const [, m, d] = data.split("-");
  return `${DIAS_SEMANA[diaDaSemana(data)]} (${d}/${m})`;
}

function hora(h: string): string {
  const [hh, mm] = h.split(":");
  return mm === "00" ? `${Number(hh)}h` : `${Number(hh)}h${mm}`;
}

/** "Peça até amanhã às 18h pra chegar quarta (30/09)." */
export function frasePrazo(p: ProximoPedido, agora: Agora): string {
  const ate = `${nomeDoDia(p.prazoData, agora)}${p.prazoHora ? ` às ${hora(p.prazoHora)}` : ""}`;
  return `Peça até ${ate} pra chegar ${nomeDoDia(p.entrega, agora)}.`;
}

export function diasDeEntregaTexto(dias: number[]): string {
  return [...dias].sort((a, b) => a - b).map((d) => DIAS_SEMANA_CURTO[d]).join(", ");
}
