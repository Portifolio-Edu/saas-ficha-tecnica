// INTEGRACOES (2026-09-23) -- leitura da planilha de vendas exportada pelo PDV
// (CSV). Segunda alternativa quando o PDV não libera integração. Cada PDV exporta
// com colunas e separador diferentes, então a tela sugere as colunas pelo nome do
// cabeçalho e o usuário confirma.

import { chaveProduto, type ProdutoVendido, type ResumoVendas } from "./documentoFiscal";

export interface Planilha {
  cabecalho: string[];
  linhas: string[][];
}

export interface ColunasPlanilha {
  produto: number;
  quantidade: number;
  /** -1 quando a planilha não tem valor. */
  valor: number;
  codigo: number;
  data: number;
}

/** Separa um CSV com ; , ou tab (o que aparecer mais no cabeçalho), respeitando aspas. */
export function lerCsv(texto: string): Planilha {
  const limpo = texto.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const primeira = limpo.split("\n").find((l) => l.trim()) ?? "";
  const candidatos = [";", ",", "\t"];
  const separador = candidatos.reduce((melhor, c) => (primeira.split(c).length > primeira.split(melhor).length ? c : melhor), ";");

  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let aspas = false;
  for (let i = 0; i < limpo.length; i++) {
    const ch = limpo[i];
    if (aspas) {
      if (ch === '"' && limpo[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (ch === '"') aspas = false;
      else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === separador) {
      linha.push(campo.trim());
      campo = "";
    } else if (ch === "\n") {
      linha.push(campo.trim());
      if (linha.some((c) => c !== "")) linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += ch;
  }
  linha.push(campo.trim());
  if (linha.some((c) => c !== "")) linhas.push(linha);

  const [cabecalho = [], ...resto] = linhas;
  return { cabecalho, linhas: resto };
}

/** "1.234,56" → 1234.56 · "1,5" → 1.5 · "1.5" → 1.5 · "R$ 12,00" → 12 · "1.234" → 1234. */
export function numeroBR(texto: string): number {
  const t = (texto ?? "").replace(/[^\d,.-]/g, "");
  if (!t) return 0;
  let normal: string;
  if (t.includes(",") && t.includes(".")) {
    normal = t.lastIndexOf(",") > t.lastIndexOf(".") ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  } else if (t.includes(",")) {
    normal = t.replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) {
    normal = t.replace(/\./g, "");
  } else {
    normal = t;
  }
  const n = Number(normal);
  return Number.isFinite(n) ? n : 0;
}

/** "22/09/2026", "2026-09-22", "22/09/2026 13:40" → "2026-09-22"; senão null. */
export function dataBRParaISO(texto: string): string | null {
  const t = (texto ?? "").trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const ano = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${ano}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Sugere as colunas pelo nome do cabeçalho. -1 = não encontrada. */
export function sugerirColunas(cabecalho: string[]): ColunasPlanilha {
  const h = cabecalho.map(semAcento);
  const achar = (padroes: RegExp[], evitar: number[] = []) => {
    for (const p of padroes) {
      const i = h.findIndex((c, idx) => p.test(c) && !evitar.includes(idx));
      if (i >= 0) return i;
    }
    return -1;
  };
  const codigo = achar([/^cod/, /codigo/, /\bsku\b/, /\bid\b/]);
  const produto = achar([/produto/, /descri/, /^item/, /nome/, /prato/], [codigo]);
  const quantidade = achar([/^qt/, /quant/, /qtde/, /qtd/]);
  const valor = achar([/valor total/, /total/, /valor/, /vl\.?/, /preco total/], [quantidade]);
  const data = achar([/data/, /^dia/, /emiss/]);
  return { produto, quantidade, valor, codigo, data };
}

export function consolidarPlanilha(planilha: Planilha, colunas: ColunasPlanilha): ResumoVendas {
  const produtos = new Map<string, ProdutoVendido>();
  let inicio: string | null = null;
  let fim: string | null = null;
  let linhasValidas = 0;
  const ignorados: { arquivo: string; motivo: string }[] = [];

  planilha.linhas.forEach((l, i) => {
    const descricao = (l[colunas.produto] ?? "").trim();
    const quantidade = numeroBR(l[colunas.quantidade] ?? "");
    if (!descricao || quantidade <= 0) {
      // Linha de total, subtotal ou vazia: fica de fora sem barulho.
      if (descricao && !/^total|subtotal/i.test(descricao)) ignorados.push({ arquivo: `linha ${i + 2}`, motivo: "Sem quantidade." });
      return;
    }
    if (/^(total|subtotal)\b/i.test(descricao)) return;
    linhasValidas++;
    const codigo = colunas.codigo >= 0 ? (l[colunas.codigo] ?? "").trim() : "";
    const valor = colunas.valor >= 0 ? numeroBR(l[colunas.valor] ?? "") : 0;
    if (colunas.data >= 0) {
      const d = dataBRParaISO(l[colunas.data] ?? "");
      if (d) {
        if (!inicio || d < inicio) inicio = d;
        if (!fim || d > fim) fim = d;
      }
    }
    const chave = chaveProduto(codigo, descricao);
    const atual = produtos.get(chave) ?? { chave, codigo, descricao, unidade: "", quantidade: 0, valor: 0 };
    atual.quantidade += quantidade;
    atual.valor += valor;
    produtos.set(chave, atual);
  });

  const lista = [...produtos.values()].map((p) => ({ ...p, valor: Math.round(p.valor * 100) / 100 })).sort((a, b) => b.valor - a.valor || b.quantidade - a.quantidade);
  return {
    origem: "planilha",
    documentos: linhasValidas,
    cancelados: 0,
    repetidos: 0,
    ignorados,
    inicio,
    fim,
    faturamento: Math.round(lista.reduce((s, p) => s + p.valor, 0) * 100) / 100,
    produtos: lista,
  };
}
