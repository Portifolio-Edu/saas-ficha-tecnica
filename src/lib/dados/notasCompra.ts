// NF-e DE COMPRA (2026-10-03): leitura e gravação das notas de compra com a
// sessão de quem pede. A gravação é toda pela função registrar_nota_compra
// (tudo ou nada; ninguém grava nas tabelas direto). Regras puras:
// src/lib/integracoes/conferenciaNota.ts. Banco: 20261003110000_notas_compra.sql.
import { createClient } from "@/lib/supabase/server";
import { chaveLigacao, type CompraDoDia, type Lembranca, type RegistroNota } from "@/lib/integracoes/conferenciaNota";
import { mensagemErro } from "./erros";

export interface NotaImportada {
  id: string;
  numero: string | null;
  fornecedor: string;
  /** AAAA-MM-DD */
  emitidaEm: string | null;
  valorTotal: number | null;
  qtdItens: number;
  atualizouPrecos: boolean;
  importadaEm: string;
}

export interface ResultadoRegistro {
  notaId: string;
  entradas: number;
  precosAtualizados: number;
  ignorados: number;
}

// Erros que a própria função escreve pra pessoa ler (nota repetida, insumo de
// outra casa, item sem quantidade): passam como vieram, sem a tradução genérica.
const ERROS_DA_FUNCAO = new Set(["23505", "42501", "22023"]);

/** Ligações já lembradas: código do fornecedor (CNPJ) → insumo e conversão. */
export async function listarLembrancas(): Promise<Map<string, Lembranca>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("ligacoes_item_nota").select("cnpj_fornecedor, codigo, insumo_id, fator");
  if (error) throw new Error(mensagemErro(error));
  const mapa = new Map<string, Lembranca>();
  for (const l of (data ?? []) as { cnpj_fornecedor: string; codigo: string; insumo_id: string; fator: number | null }[]) {
    mapa.set(chaveLigacao(l.cnpj_fornecedor, l.codigo), { insumoId: l.insumo_id, fator: l.fator === null ? null : Number(l.fator) });
  }
  return mapa;
}

/** Quando a nota já entrou (null = ainda não). Só aviso antecipado: quem barra a repetida é o banco. */
export async function notaJaImportadaEm(chave: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notas_compra").select("importada_em").eq("chave", chave).maybeSingle();
  if (error) throw new Error(mensagemErro(error));
  return (data as { importada_em: string } | null)?.importada_em ?? null;
}

export async function listarNotasRecentes(limite = 10): Promise<NotaImportada[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notas_compra")
    .select("id, numero, fornecedor, emitida_em, valor_total, qtd_itens, atualizou_precos, importada_em")
    .order("importada_em", { ascending: false })
    .limit(limite);
  if (error) throw new Error(mensagemErro(error));
  return (
    (data ?? []) as {
      id: string;
      numero: string | null;
      fornecedor: string;
      emitida_em: string | null;
      valor_total: number | null;
      qtd_itens: number;
      atualizou_precos: boolean;
      importada_em: string;
    }[]
  ).map((n) => ({
    id: n.id,
    numero: n.numero,
    fornecedor: n.fornecedor,
    emitidaEm: n.emitida_em,
    valorTotal: n.valor_total === null ? null : Number(n.valor_total),
    qtdItens: n.qtd_itens,
    atualizouPrecos: n.atualizou_precos,
    importadaEm: n.importada_em,
  }));
}

/**
 * Custo das compras por dia de emissão (itens que entraram no estoque), pro
 * Fechamento de CMV somar no período. Nota sem data de emissão conta no dia
 * em que foi importada.
 */
export async function listarComprasPorDia(): Promise<CompraDoDia[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notas_compra").select("emitida_em, importada_em, notas_compra_itens(custo, ignorado)").order("emitida_em", { ascending: false }).limit(2000);
  if (error) throw new Error(mensagemErro(error));
  const porDia = new Map<string, CompraDoDia>();
  for (const n of (data ?? []) as { emitida_em: string | null; importada_em: string; notas_compra_itens: { custo: number; ignorado: boolean }[] | null }[]) {
    const dia = n.emitida_em ?? n.importada_em.slice(0, 10);
    const custo = (n.notas_compra_itens ?? []).filter((i) => !i.ignorado).reduce((s, i) => s + Number(i.custo), 0);
    const atual = porDia.get(dia) ?? { data: dia, custo: 0, notas: 0 };
    atual.custo = Math.round((atual.custo + custo) * 100) / 100;
    atual.notas += 1;
    porDia.set(dia, atual);
  }
  return [...porDia.values()].sort((a, b) => a.data.localeCompare(b.data));
}

/** Registra a nota inteira (estoque, preço, histórico e ligações) numa transação. */
export async function registrarNotaCompra(registro: RegistroNota): Promise<ResultadoRegistro> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("registrar_nota_compra", { p_nota: registro });
  if (error) throw new Error(error.code && ERROS_DA_FUNCAO.has(error.code) ? error.message : mensagemErro(error));
  const r = (data ?? {}) as { nota_id?: string; entradas?: number; precos_atualizados?: number; ignorados?: number };
  return { notaId: r.nota_id ?? "", entradas: Number(r.entradas ?? 0), precosAtualizados: Number(r.precos_atualizados ?? 0), ignorados: Number(r.ignorados ?? 0) };
}
