// NF-e DE COMPRA (2026-10-03): regras puras da conferência item a item da tela
// de importação (Estoque > Importar NF-e de compra). Sem Supabase e sem DOM:
// roda no servidor (que recalcula tudo antes de gravar, sem confiar no
// navegador) e no navegador (pra mostrar a conta na hora, enquanto a pessoa
// escolhe o insumo).
//
// Fluxo: a nota é lida (lerNotaDeCompra); cada item ganha um insumo sugerido
// (o que a casa já ligou pra esse fornecedor e código, ou o nome parecido); a
// pessoa confere, liga, informa a conversão quando a unidade da nota não casa
// (caixa, pacote, fardo) e confirma. Daí saem: entrada no estoque, preço novo
// do insumo (que muda o custo das fichas e o CMV) e a ligação lembrada pra
// próxima nota do mesmo fornecedor.
import type { Insumo } from "@/lib/dominio/insumo";
import type { ItemComprado, NotaDeCompra } from "./documentoFiscal";
import { converter, sugerirInsumos, unidadeCanonica } from "@/lib/agente/entradaNota";

/** Variação de preço acima disso pede confirmação ("confira a unidade"). */
export const VARIACAO_SUSPEITA = 0.5;
/** Mudança de preço menor que isso não vale um registro no histórico. */
export const VARIACAO_MINIMA = 0.005;

const arred = (n: number, casas = 4) => Math.round(n * 10 ** casas) / 10 ** casas;

export interface Lembranca {
  insumoId: string;
  /** Quanto do insumo (na unidade dele) vem em 1 unidade da nota (ex.: 1 CX = 12 un). Null = conversão automática. */
  fator: number | null;
}

/** Chave da ligação lembrada: o mesmo código do mesmo fornecedor (CNPJ) é sempre o mesmo insumo. */
export function chaveLigacao(cnpj: string, codigo: string): string {
  return `${cnpj.replace(/\D/g, "")}|${codigo.trim().toUpperCase()}`;
}

export interface LinhaConferencia {
  ordem: number;
  codigo: string;
  descricao: string;
  /** Quantidade e unidade como estão na nota. */
  quantidade: number;
  unidade: string;
  valor: number;
  custosExtras: number;
  /** Sugestão inicial. */
  insumoSugeridoId: string | null;
  origemSugestao: "lembrado" | "nome" | null;
  fatorSugerido: number | null;
  /** Outras opções por semelhança de nome (pra pessoa trocar rápido). */
  alternativas: { id: string; nome: string }[];
}

/** Monta as linhas da conferência com a melhor sugestão de insumo pra cada item. */
export function montarConferencia(nota: NotaDeCompra, insumos: Pick<Insumo, "id" | "nome">[], lembrancas: Map<string, Lembranca>): LinhaConferencia[] {
  const existentes = new Set(insumos.map((i) => i.id));
  return nota.itens.map((item, i) => {
    const sugestoes = sugerirInsumos(item.descricao, insumos, 4);
    const lembrada = lembrancas.get(chaveLigacao(nota.cnpjFornecedor, item.codigo));
    let insumoSugeridoId: string | null = null;
    let origemSugestao: LinhaConferencia["origemSugestao"] = null;
    let fatorSugerido: number | null = null;
    if (lembrada && existentes.has(lembrada.insumoId)) {
      insumoSugeridoId = lembrada.insumoId;
      origemSugestao = "lembrado";
      fatorSugerido = lembrada.fator;
    } else if (sugestoes[0] && sugestoes[0].nota >= 0.6) {
      insumoSugeridoId = sugestoes[0].id;
      origemSugestao = "nome";
    }
    return {
      ordem: i + 1,
      codigo: item.codigo,
      descricao: item.descricao,
      quantidade: item.quantidade,
      unidade: item.unidade,
      valor: item.valor,
      custosExtras: item.custosExtras,
      insumoSugeridoId,
      origemSugestao,
      fatorSugerido,
      alternativas: sugestoes.filter((s) => s.id !== insumoSugeridoId).map(({ id, nome }) => ({ id, nome })),
    };
  });
}

export interface DecisaoItem {
  ordem: number;
  /** Insumo escolhido. Null com ignorar = item que não é insumo (limpeza, descartável). */
  insumoId: string | null;
  ignorar: boolean;
  /** Conversão informada pela pessoa (insumo por unidade da nota). Vazio = automática. */
  fator: number | null;
}

export type StatusLinha = "pronto" | "sem_insumo" | "precisa_fator" | "ignorado" | "invalido";

export interface ResultadoLinha {
  ordem: number;
  status: StatusLinha;
  motivo?: string;
  insumoId?: string;
  insumoNome?: string;
  unidadeInsumo?: string;
  /** Quanto entra no estoque, na unidade do insumo. */
  quantidadeInsumo?: number;
  /** R$ por unidade do insumo, pela nota. Null quando a nota não traz valor. */
  precoUnitarioNovo?: number | null;
  precoUnitarioAtual?: number;
  /** (novo - atual) / atual; null quando não dá pra comparar. */
  variacao?: number | null;
  /** Preço mudou demais: provável erro de unidade ou de conversão. */
  suspeito?: boolean;
}

/** Custo do item na nota: produtos, mais frete, seguro, IPI e ST quando `incluirExtras`. */
export function custoDoItem(item: Pick<ItemComprado, "valor" | "custosExtras">, incluirExtras: boolean): number {
  return arred(item.valor + (incluirExtras ? item.custosExtras : 0), 2);
}

/** Resolve uma linha: insumo, quantidade convertida, preço novo e variação. */
export function calcularLinha(
  item: Pick<ItemComprado, "quantidade" | "unidade" | "valor" | "custosExtras">,
  ordem: number,
  decisao: DecisaoItem | undefined,
  insumo: Insumo | undefined,
  incluirExtras: boolean,
): ResultadoLinha {
  if (decisao?.ignorar) return { ordem, status: "ignorado" };
  if (!decisao || !decisao.insumoId) return { ordem, status: "sem_insumo", motivo: "Escolha o insumo (ou marque que não é insumo)." };
  if (!insumo) return { ordem, status: "invalido", motivo: "Insumo não encontrado no cadastro." };
  if (!(item.quantidade > 0)) return { ordem, status: "invalido", motivo: "Quantidade inválida na nota." };

  let quantidadeInsumo: number | null;
  if (decisao.fator !== null) {
    if (!(decisao.fator > 0) || !Number.isFinite(decisao.fator)) return { ordem, status: "precisa_fator", motivo: "A conversão precisa ser um número maior que zero." };
    quantidadeInsumo = item.quantidade * decisao.fator;
  } else {
    const de = unidadeCanonica(item.unidade);
    quantidadeInsumo = de ? converter(item.quantidade, de, insumo.unidadeMedida, insumo.pesoPorUnidade) : null;
  }
  if (quantidadeInsumo === null || !(quantidadeInsumo > 0)) {
    return {
      ordem,
      status: "precisa_fator",
      motivo: `Não sei converter "${item.unidade || "?"}" pra ${insumo.unidadeMedida}. Informe quanto de ${insumo.nome} (em ${insumo.unidadeMedida}) vem em cada ${item.unidade || "unidade"} da nota.`,
    };
  }

  const custo = custoDoItem(item, incluirExtras);
  const precoUnitarioNovo = custo > 0 ? arred(custo / quantidadeInsumo) : null;
  const precoUnitarioAtual = arred(insumo.precoUnitario);
  const variacao = precoUnitarioNovo !== null && precoUnitarioAtual > 0 ? arred((precoUnitarioNovo - precoUnitarioAtual) / precoUnitarioAtual) : null;
  return {
    ordem,
    status: "pronto",
    insumoId: insumo.id,
    insumoNome: insumo.nome,
    unidadeInsumo: insumo.unidadeMedida,
    quantidadeInsumo: arred(quantidadeInsumo),
    precoUnitarioNovo,
    precoUnitarioAtual,
    variacao,
    suspeito: variacao !== null && Math.abs(variacao) > VARIACAO_SUSPEITA,
  };
}

/** Resolve a nota inteira com as decisões da pessoa. */
export function calcularConferencia(nota: NotaDeCompra, decisoes: DecisaoItem[], insumos: Insumo[], incluirExtras: boolean): ResultadoLinha[] {
  const porId = new Map(insumos.map((i) => [i.id, i]));
  const decisaoPorOrdem = new Map(decisoes.map((d) => [d.ordem, d]));
  return nota.itens.map((item, i) => {
    const decisao = decisaoPorOrdem.get(i + 1);
    return calcularLinha(item, i + 1, decisao, decisao?.insumoId ? porId.get(decisao.insumoId) : undefined, incluirExtras);
  });
}

/** Pode confirmar? Nenhuma linha pendente de decisão ou de conversão, e pelo menos um item entrando. */
export function podeConfirmar(resultado: ResultadoLinha[]): { ok: boolean; motivo?: string } {
  if (resultado.some((r) => r.status === "sem_insumo")) return { ok: false, motivo: "Falta escolher o insumo de algum item (ou marcar que não é insumo)." };
  if (resultado.some((r) => r.status === "precisa_fator")) return { ok: false, motivo: "Falta informar a conversão de algum item." };
  if (resultado.some((r) => r.status === "invalido")) return { ok: false, motivo: "Tem item com problema. Corrija ou ignore." };
  if (!resultado.some((r) => r.status === "pronto")) return { ok: false, motivo: "Nenhum item vai entrar no estoque." };
  return { ok: true };
}

/** Novo preço da embalagem pro insumo ter o preço unitário da nota (a coluna preco_unitario é calculada pelo banco). */
export function precoEmbalagemParaUnitario(precoUnitarioNovo: number, tamanhoEmbalagem: number): number {
  return arred(precoUnitarioNovo * tamanhoEmbalagem, 4);
}

/** O preço mudou o bastante pra valer um registro (e pra mexer no custo das fichas)? */
export function precoMudou(atual: number, novo: number | null | undefined): boolean {
  if (novo === null || novo === undefined || !(novo > 0)) return false;
  return Math.abs(novo - atual) / Math.max(atual, 0.0001) > VARIACAO_MINIMA;
}

/** O que o agente IA mandou pra um item da nota (tudo opcional). */
export interface PedidoItem {
  insumoId: string | null;
  fator: number | null;
  ignorar: boolean;
}

/**
 * AGENTE IA (2026-10-03): transforma o que o agente mandou em decisões da
 * conferência. Vale o que o agente disse; no que ele não disse, a sugestão da
 * conferência (ligação lembrada do fornecedor ou nome parecido). Insumo
 * inexistente vira decisão mesmo assim: calcularLinha marca como inválido e o
 * agente pergunta de novo.
 */
export function decidirItens(linhas: LinhaConferencia[], pedidos: (PedidoItem | undefined)[]): DecisaoItem[] {
  const decisoes: DecisaoItem[] = [];
  linhas.forEach((l, i) => {
    const p = pedidos[i];
    if (p?.ignorar) {
      decisoes.push({ ordem: l.ordem, insumoId: null, ignorar: true, fator: null });
      return;
    }
    const insumoId = p?.insumoId ?? l.insumoSugeridoId;
    if (!insumoId) return;
    const fator = p?.fator ?? (insumoId === l.insumoSugeridoId ? l.fatorSugerido : null);
    decisoes.push({ ordem: l.ordem, insumoId, ignorar: false, fator });
  });
  return decisoes;
}

export interface OpcoesNota {
  /** O preço do insumo passa a ser o da nota (muda o custo das fichas e o CMV teórico). */
  atualizarPrecos: boolean;
  /** Frete, seguro, outras despesas, IPI e ICMS-ST entram no custo do insumo. */
  incluirExtras: boolean;
}

/** O que vai pra registrar_nota_compra (supabase/migrations/20261003110000_notas_compra.sql). */
export interface RegistroNota {
  chave: string;
  numero: string;
  serie: string;
  fornecedor: string;
  cnpj: string;
  emitida_em: string | null;
  valor_total: number | null;
  atualizar_precos: boolean;
  incluiu_extras: boolean;
  itens: {
    ordem: number;
    codigo: string;
    descricao: string;
    quantidade: number;
    unidade: string;
    valor: number;
    custos_extras: number;
    insumo_id: string | null;
    ignorado: boolean;
    quantidade_insumo: number | null;
    preco_unitario_novo: number | null;
    custo: number;
    fator: number | null;
  }[];
}

/**
 * Monta o registro da nota a partir do que o SERVIDOR recalculou
 * (calcularConferencia). Só os itens "pronto" entram no estoque; o resto vai
 * como ignorado. Chamar depois de podeConfirmar.
 */
export function montarRegistro(nota: NotaDeCompra, decisoes: DecisaoItem[], resultado: ResultadoLinha[], opcoes: OpcoesNota): RegistroNota {
  const decisaoPorOrdem = new Map(decisoes.map((d) => [d.ordem, d]));
  const resultadoPorOrdem = new Map(resultado.map((r) => [r.ordem, r]));
  return {
    chave: nota.chave,
    numero: nota.numero,
    serie: nota.serie,
    fornecedor: nota.fornecedor,
    cnpj: nota.cnpjFornecedor,
    emitida_em: /^\d{4}-\d{2}-\d{2}$/.test(nota.emitidaEm) ? nota.emitidaEm : null,
    valor_total: nota.valorTotal > 0 ? nota.valorTotal : null,
    atualizar_precos: opcoes.atualizarPrecos,
    incluiu_extras: opcoes.incluirExtras,
    itens: nota.itens.map((item, i) => {
      const ordem = i + 1;
      const r = resultadoPorOrdem.get(ordem);
      const base = {
        ordem,
        codigo: item.codigo,
        descricao: item.descricao,
        quantidade: item.quantidade,
        unidade: item.unidade,
        valor: item.valor,
        custos_extras: item.custosExtras,
      };
      if (r?.status !== "pronto") {
        return { ...base, insumo_id: null, ignorado: true, quantidade_insumo: null, preco_unitario_novo: null, custo: 0, fator: null };
      }
      return {
        ...base,
        insumo_id: r.insumoId ?? null,
        ignorado: false,
        quantidade_insumo: r.quantidadeInsumo ?? null,
        preco_unitario_novo: r.precoUnitarioNovo ?? null,
        custo: custoDoItem(item, opcoes.incluirExtras),
        fator: decisaoPorOrdem.get(ordem)?.fator ?? null,
      };
    }),
  };
}

/** Compras por dia de emissão da nota (o que o Fechamento de CMV soma no período). */
export interface CompraDoDia {
  /** AAAA-MM-DD */
  data: string;
  custo: number;
  notas: number;
}

/** Soma as compras com nota emitida entre `inicio` e `fim` (inclusive). */
export function comprasNoPeriodo(compras: CompraDoDia[], inicio: string, fim: string): { custo: number; notas: number } {
  let custo = 0;
  let notas = 0;
  for (const c of compras) {
    if (c.data >= inicio && c.data <= fim) {
      custo += c.custo;
      notas += c.notas;
    }
  }
  return { custo: Math.round(custo * 100) / 100, notas };
}
