// LIGAÇÃO PRODUTO DO PDV -> FICHA (2026-10-03): leitura e gravação da tabela
// produtos_pdv com a sessão de quem pede (a RLS deixa só dono e gestor).
// Domínio: src/lib/dominio/produtoPdv.ts. Banco: 20261003100000_produtos_pdv.sql.
import { createClient } from "@/lib/supabase/server";
import { CANAL_IMPORTACAO, destinoParaLinha, estaPendente, resumirPendencias, type ItemParaSalvar, type ProdutoPdv, type ResumoPendencias } from "@/lib/dominio/produtoPdv";
import { mensagemErro } from "./erros";

interface Linha {
  id: string;
  canal: string;
  chave: string;
  codigo: string | null;
  descricao: string;
  receita_id: string | null;
  sem_ficha: boolean;
  ultima_quantidade: number | null;
  ultimo_valor: number | null;
  ultima_venda_em: string | null;
}

const COLUNAS = "id, canal, chave, codigo, descricao, receita_id, sem_ficha, ultima_quantidade, ultimo_valor, ultima_venda_em";

function paraProduto(l: Linha): ProdutoPdv {
  return {
    id: l.id,
    canal: l.canal,
    chave: l.chave,
    codigo: l.codigo,
    descricao: l.descricao,
    receitaId: l.receita_id,
    semFicha: l.sem_ficha,
    ultimaQuantidade: l.ultima_quantidade === null ? null : Number(l.ultima_quantidade),
    ultimoValor: l.ultimo_valor === null ? null : Number(l.ultimo_valor),
    ultimaVendaEm: l.ultima_venda_em,
  };
}

/** Todos os produtos já vistos. Pendentes primeiro, o que mais pesa em R$ no topo. */
export async function listarProdutosPdv(): Promise<ProdutoPdv[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("produtos_pdv").select(COLUNAS).order("descricao");
  if (error) throw new Error(mensagemErro(error));
  const produtos = ((data ?? []) as Linha[]).map(paraProduto);
  return produtos.sort((a, b) => Number(estaPendente(b)) - Number(estaPendente(a)) || (b.ultimoValor ?? 0) - (a.ultimoValor ?? 0));
}

/** Pendências de quem é da gestão; quem não é (a RLS devolve vazio) vê zero. */
export async function resumoPendenciasPdv(): Promise<ResumoPendencias> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("produtos_pdv").select(COLUNAS).is("receita_id", null).eq("sem_ficha", false);
  if (error) throw new Error(mensagemErro(error));
  return resumirPendencias(((data ?? []) as Linha[]).map(paraProduto));
}

/** Grava as decisões de uma importação (tudo ou nada). Devolve quantos produtos ficaram pendentes. */
export async function salvarProdutosPdv(itens: ItemParaSalvar[], canal: string = CANAL_IMPORTACAO): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("salvar_produtos_pdv", {
    p_canal: canal,
    p_itens: itens.map((i) => ({
      chave: i.chave,
      codigo: i.codigo,
      descricao: i.descricao,
      receita_id: i.receitaId,
      sem_ficha: i.semFicha,
      quantidade: i.quantidade,
      valor: i.valor,
      data: i.data,
    })),
  });
  if (error) throw new Error(mensagemErro(error));
  return Number(data ?? 0);
}

/** Decide um produto já visto: id da ficha, "sem-ficha" ou null (volta a pendente). */
export async function resolverProdutoPdv(id: string, destino: string | null): Promise<void> {
  const { receitaId, semFicha } = destinoParaLinha(destino);
  const supabase = await createClient();
  const { data, error } = await supabase.from("produtos_pdv").update({ receita_id: receitaId, sem_ficha: semFicha }).eq("id", id).select("id");
  if (error) throw new Error(mensagemErro(error));
  if (!data?.length) throw new Error("Produto não encontrado (ou você não tem acesso a ele).");
}
