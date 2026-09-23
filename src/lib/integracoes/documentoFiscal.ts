// INTEGRACOES (2026-09-23) -- leitura do XML das notas de venda (NFC-e modelo 65
// e CF-e SAT). É a alternativa quando o PDV não libera integração: todo PDV é
// obrigado a emitir esse XML, e o restaurante (ou o contador) consegue exportar
// o lote sem depender do PDV. Cada nota traz item por item vendido.
//
// Funções puras, sem DOM (rodam no navegador, no servidor e nos testes). O XML
// fiscal é regular o bastante pra ler por tag; não é um parser XML genérico.
//
// Regras:
//  - NFC-e (mod 65) e CF-e SAT entram como venda.
//  - NF-e mod 55 é ignorada com aviso: quase sempre é nota de COMPRA do
//    fornecedor (importar compra é outro módulo, ver PRODUCT.md, roadmap 1).
//  - Nota com protocolo de cancelamento, ou com evento de cancelamento no mesmo
//    lote, fica de fora. Nota repetida (mesma chave) conta uma vez só.

export interface ItemVendido {
  codigo: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  /** Valor do item já com desconto do item. */
  valor: number;
}

export type DocumentoFiscal =
  | {
      tipo: "venda";
      modelo: "NFC-e" | "CF-e SAT";
      chave: string;
      /** AAAA-MM-DD */
      emitidoEm: string;
      cancelada: boolean;
      itens: ItemVendido[];
    }
  | { tipo: "cancelamento"; chave: string }
  | { tipo: "ignorado"; motivo: string };

function decodificar(texto: string): string {
  return texto
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

/** Conteúdo de todas as ocorrências de <nome>...</nome> (aceita prefixo de namespace). */
function blocos(xml: string, nome: string): string[] {
  const re = new RegExp(`<(?:[\\w.-]+:)?${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.-]+:)?${nome}>`, "g");
  return [...xml.matchAll(re)].map((m) => m[1]);
}

function valor(xml: string, nome: string): string | null {
  const b = blocos(xml, nome)[0];
  return b === undefined ? null : decodificar(b);
}

function atributo(xml: string, tag: string, attr: string): string | null {
  const re = new RegExp(`<(?:[\\w.-]+:)?${tag}\\s[^>]*\\b${attr}="([^"]*)"`);
  return xml.match(re)?.[1] ?? null;
}

function numero(texto: string | null): number {
  if (!texto) return 0;
  const n = Number(texto.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function itens(xml: string): ItemVendido[] {
  return blocos(xml, "det").map((det) => {
    const prod = blocos(det, "prod")[0] ?? det;
    const bruto = numero(valor(prod, "vProd"));
    const desconto = numero(valor(prod, "vDesc"));
    // SAT traz vItem (líquido); NFC-e traz vProd e vDesc.
    const vItem = valor(det, "vItem");
    return {
      codigo: valor(prod, "cProd") ?? "",
      descricao: valor(prod, "xProd") ?? "",
      quantidade: numero(valor(prod, "qCom")),
      unidade: (valor(prod, "uCom") ?? "").toUpperCase(),
      valor: vItem !== null ? numero(vItem) : Math.max(0, bruto - desconto),
    };
  });
}

// cStat da SEFAZ que significam nota cancelada.
const CSTAT_CANCELADA = new Set(["101", "135", "151", "155"]);

export function lerDocumentoFiscal(texto: string): DocumentoFiscal {
  const xml = texto.replace(/^﻿/, "");

  // Evento de cancelamento de NFC-e (procEventoNFe / evento com tpEvento 110111).
  if (/<(?:[\w.-]+:)?(procEventoNFe|evento)[\s>]/.test(xml) && valor(xml, "tpEvento") === "110111") {
    const chave = valor(xml, "chNFe");
    return chave ? { tipo: "cancelamento", chave } : { tipo: "ignorado", motivo: "Evento de cancelamento sem chave da nota." };
  }

  // Cancelamento de CF-e SAT.
  if (/<(?:[\w.-]+:)?CFeCanc[\s>]/.test(xml)) {
    const chave = (atributo(xml, "infCFe", "chCanc") ?? "").replace(/^CFe/, "");
    return chave ? { tipo: "cancelamento", chave } : { tipo: "ignorado", motivo: "Cancelamento de SAT sem chave." };
  }

  // NFC-e / NF-e
  if (/<(?:[\w.-]+:)?infNFe[\s>]/.test(xml)) {
    const modelo = valor(xml, "mod");
    const chave = (atributo(xml, "infNFe", "Id") ?? "").replace(/^NFe/, "");
    if (modelo === "55") {
      return { tipo: "ignorado", motivo: "NF-e modelo 55 (normalmente nota de compra de fornecedor), não é venda do caixa." };
    }
    if (modelo !== "65") return { tipo: "ignorado", motivo: `Modelo de nota ${modelo ?? "desconhecido"} não é NFC-e.` };
    const cStat = blocos(xml, "protNFe").length ? valor(blocos(xml, "protNFe")[0], "cStat") : null;
    const tpNF = valor(xml, "tpNF");
    if (tpNF === "0") return { tipo: "ignorado", motivo: "Nota de entrada, não é venda." };
    return {
      tipo: "venda",
      modelo: "NFC-e",
      chave,
      emitidoEm: (valor(xml, "dhEmi") ?? "").slice(0, 10),
      cancelada: cStat !== null && CSTAT_CANCELADA.has(cStat),
      itens: itens(xml),
    };
  }

  // CF-e SAT (São Paulo)
  if (/<(?:[\w.-]+:)?infCFe[\s>]/.test(xml)) {
    const chave = (atributo(xml, "infCFe", "Id") ?? "").replace(/^CFe/, "");
    const dEmi = valor(xml, "dEmi") ?? "";
    return {
      tipo: "venda",
      modelo: "CF-e SAT",
      chave,
      emitidoEm: dEmi.length === 8 ? `${dEmi.slice(0, 4)}-${dEmi.slice(4, 6)}-${dEmi.slice(6, 8)}` : dEmi.slice(0, 10),
      cancelada: false,
      itens: itens(xml),
    };
  }

  return { tipo: "ignorado", motivo: "Arquivo não é XML de NFC-e nem de SAT." };
}

export interface ProdutoVendido {
  /** Código + descrição normalizados: identifica o produto do PDV entre importações. */
  chave: string;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor: number;
}

export interface ResumoVendas {
  origem: "xml" | "planilha";
  documentos: number;
  cancelados: number;
  repetidos: number;
  ignorados: { arquivo: string; motivo: string }[];
  /** AAAA-MM-DD, ou null quando a origem não tem data (planilha sem coluna de data). */
  inicio: string | null;
  fim: string | null;
  faturamento: number;
  produtos: ProdutoVendido[];
}

export function chaveProduto(codigo: string, descricao: string): string {
  return `${codigo.trim()}|${descricao.trim().toUpperCase().replace(/\s+/g, " ")}`;
}

/** Junta o lote de XMLs: tira cancelados e repetidos e soma por produto. */
export function consolidarDocumentos(arquivos: { nome: string; conteudo: string }[]): ResumoVendas {
  const lidos = arquivos.map((a) => ({ nome: a.nome, doc: lerDocumentoFiscal(a.conteudo) }));
  const canceladasPorEvento = new Set(lidos.flatMap(({ doc }) => (doc.tipo === "cancelamento" ? [doc.chave] : [])));
  const vistas = new Set<string>();
  const produtos = new Map<string, ProdutoVendido>();
  const ignorados: { arquivo: string; motivo: string }[] = [];
  let documentos = 0;
  let cancelados = 0;
  let repetidos = 0;
  let inicio: string | null = null;
  let fim: string | null = null;

  for (const { nome, doc } of lidos) {
    if (doc.tipo === "ignorado") {
      ignorados.push({ arquivo: nome, motivo: doc.motivo });
      continue;
    }
    if (doc.tipo === "cancelamento") continue;
    if (doc.chave && vistas.has(doc.chave)) {
      repetidos++;
      continue;
    }
    if (doc.chave) vistas.add(doc.chave);
    if (doc.cancelada || canceladasPorEvento.has(doc.chave)) {
      cancelados++;
      continue;
    }
    documentos++;
    if (doc.emitidoEm) {
      if (!inicio || doc.emitidoEm < inicio) inicio = doc.emitidoEm;
      if (!fim || doc.emitidoEm > fim) fim = doc.emitidoEm;
    }
    for (const item of doc.itens) {
      const chave = chaveProduto(item.codigo, item.descricao);
      const atual = produtos.get(chave) ?? { chave, codigo: item.codigo, descricao: item.descricao, unidade: item.unidade, quantidade: 0, valor: 0 };
      atual.quantidade += item.quantidade;
      atual.valor += item.valor;
      produtos.set(chave, atual);
    }
  }

  const lista = [...produtos.values()].map((p) => ({ ...p, valor: Math.round(p.valor * 100) / 100 })).sort((a, b) => b.valor - a.valor);
  return {
    origem: "xml",
    documentos,
    cancelados,
    repetidos,
    ignorados,
    inicio,
    fim,
    faturamento: Math.round(lista.reduce((s, p) => s + p.valor, 0) * 100) / 100,
    produtos: lista,
  };
}
