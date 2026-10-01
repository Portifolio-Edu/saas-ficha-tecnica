// AGENTE IA (2026-09-26): monta a entrada de estoque a partir dos itens de uma
// nota (lida do XML ou da foto pelo agente). Liga cada item ao insumo
// cadastrado (pelo id que o agente mandou, ou pelo nome parecido), converte a
// quantidade pra unidade do insumo e calcula o preço unitário novo. O que não
// casa ou não converte (caixa, pacote…) volta pro agente perguntar.
// Funções puras (testadas em __tests__/entradaNota.test.ts).
import { semelhanca } from "@/lib/integracoes/conciliacao";
import type { Insumo } from "@/lib/dominio/insumo";
import type { UnidadeMedida } from "@/lib/calculo/types";

export interface ItemNota {
  descricao: string;
  quantidade: number;
  unidade: string;
  /** Valor total do item na nota (opcional). */
  valorTotal?: number | null;
  /** Se o agente já sabe qual é o insumo. */
  insumoId?: string | null;
}

export interface ItemEntrada {
  descricao: string;
  insumoId: string;
  insumoNome: string;
  /** Na unidade do insumo. */
  quantidade: number;
  unidade: UnidadeMedida;
  precoUnitarioAtual: number;
  /** R$ por unidade do insumo, pela nota (null = nota sem valor). */
  precoUnitarioNovo: number | null;
}

export interface ItemPendente {
  descricao: string;
  quantidade: number;
  unidade: string;
  motivo: string;
  sugestoes: { id: string; nome: string }[];
}

export function unidadeCanonica(u: string): UnidadeMedida | null {
  const x = u.trim().toLowerCase().replace(/\.$/, "");
  if (["kg", "kgs", "quilo", "quilos"].includes(x)) return "kg";
  if (["g", "gr", "grs", "grama", "gramas"].includes(x)) return "g";
  if (["l", "lt", "lts", "litro", "litros"].includes(x)) return "l";
  if (["ml", "mls"].includes(x)) return "ml";
  if (["un", "und", "unid", "unidade", "unidades", "pc", "pç", "pca", "peca", "peça"].includes(x)) return "un";
  return null;
}

const BASE: Partial<Record<UnidadeMedida, { familia: "massa" | "volume"; fator: number }>> = {
  kg: { familia: "massa", fator: 1000 },
  g: { familia: "massa", fator: 1 },
  l: { familia: "volume", fator: 1000 },
  ml: { familia: "volume", fator: 1 },
};

/** Converte quantidade entre unidades; un↔massa usa o peso por unidade do insumo (na unidade dele). */
export function converter(q: number, de: UnidadeMedida, para: UnidadeMedida, pesoPorUnidade: number | null): number | null {
  if (de === para) return q;
  const a = BASE[de];
  const b = BASE[para];
  if (a && b) return a.familia === b.familia ? (q * a.fator) / b.fator : null;
  if (de === "un" && b && pesoPorUnidade) return q * pesoPorUnidade; // peso por unidade já na unidade do insumo
  if (para === "un" && a && pesoPorUnidade) return q / pesoPorUnidade;
  return null;
}

export function sugerirInsumos(descricao: string, insumos: Pick<Insumo, "id" | "nome">[], limite = 3): { id: string; nome: string; nota: number }[] {
  return insumos
    .map((i) => ({ id: i.id, nome: i.nome, nota: semelhanca(descricao, i.nome) }))
    .filter((s) => s.nota > 0)
    .sort((a, b) => b.nota - a.nota)
    .slice(0, limite);
}

const arred = (n: number, casas = 4) => Math.round(n * 10 ** casas) / 10 ** casas;

export function montarEntrada(itens: ItemNota[], insumos: Insumo[]): { entrada: ItemEntrada[]; pendentes: ItemPendente[] } {
  const porId = new Map(insumos.map((i) => [i.id, i]));
  const entrada: ItemEntrada[] = [];
  const pendentes: ItemPendente[] = [];
  for (const item of itens) {
    const sugestoes = sugerirInsumos(item.descricao, insumos);
    const insumo = (item.insumoId && porId.get(item.insumoId)) || (sugestoes[0] && sugestoes[0].nota >= 0.6 ? porId.get(sugestoes[0].id) : undefined);
    const pendente = (motivo: string) =>
      pendentes.push({ descricao: item.descricao, quantidade: item.quantidade, unidade: item.unidade, motivo, sugestoes: sugestoes.map(({ id, nome }) => ({ id, nome })) });
    if (!insumo) {
      pendente("Não achei esse item no cadastro de insumos.");
      continue;
    }
    if (!(item.quantidade > 0)) {
      pendente("Quantidade inválida.");
      continue;
    }
    const de = unidadeCanonica(item.unidade);
    const quantidade = de ? converter(item.quantidade, de, insumo.unidadeMedida, insumo.pesoPorUnidade) : null;
    if (quantidade === null) {
      pendente(`Não sei converter "${item.unidade}" pra ${insumo.unidadeMedida} (${insumo.nome}). Pergunte quanto vem em cada ${item.unidade}.`);
      continue;
    }
    const valor = item.valorTotal ?? null;
    entrada.push({
      descricao: item.descricao,
      insumoId: insumo.id,
      insumoNome: insumo.nome,
      quantidade: arred(quantidade),
      unidade: insumo.unidadeMedida,
      precoUnitarioAtual: arred(insumo.precoUnitario),
      precoUnitarioNovo: valor !== null && valor > 0 ? arred(valor / quantidade) : null,
    });
  }
  return { entrada, pendentes };
}
