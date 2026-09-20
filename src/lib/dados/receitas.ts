import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "./erros";
import type { UnidadeMedida } from "@/lib/calculo/types";
import type { DestinoVenda, EtapaReceita, EtapaReceitaInput, FormaFisica, LinhaFicha, LinhaFichaInput, Receita, ReceitaInput, TipoReceita } from "@/lib/dominio/receita";

export type { TipoReceita, FormaFisica, DestinoVenda, LinhaFicha, LinhaFichaInput, EtapaReceita, EtapaReceitaInput, Receita, ReceitaInput } from "@/lib/dominio/receita";

const BUCKET_FOTOS_RECEITAS = "receitas-fotos";

interface LinhaReceitaRow {
  id: string;
  nome_prato: string;
  tipo: TipoReceita;
  categoria: string | null;
  preco_venda: number | null;
  vendas_mes: number | null;
  rendimento: number;
  unidade_rendimento: string;
  peso_porcao_g: number | null;
  forma_fisica: FormaFisica;
  destino_venda: DestinoVenda;
  margem_alvo: number | null;
  modo_preparo: string | null;
  foto_url: string | null;
}

interface LinhaFichaRow {
  id: string;
  receita_id: string;
  insumo_id: string | null;
  sub_receita_id: string | null;
  peso_liquido: number;
  unidade: UnidadeMedida;
}

interface EtapaReceitaRow {
  id: string;
  receita_id: string;
  ordem: number;
  titulo: string | null;
  texto: string | null;
  foto_url: string | null;
}

export async function listarReceitas(tipo?: TipoReceita): Promise<Receita[]> {
  const supabase = await createClient();

  let query = supabase
    .from("receitas")
    .select("id, nome_prato, tipo, categoria, preco_venda, vendas_mes, rendimento, unidade_rendimento, peso_porcao_g, forma_fisica, destino_venda, margem_alvo, modo_preparo, foto_url")
    .order("nome_prato");
  if (tipo) query = query.eq("tipo", tipo);

  const { data: receitas, error } = await query;
  if (error) throw new Error(mensagemErro(error));

  const linhas = (receitas ?? []) as LinhaReceitaRow[];
  if (linhas.length === 0) return [];

  const [{ data: fichas, error: erroFicha }, { data: etapas, error: erroEtapas }] = await Promise.all([
    supabase
      .from("receita_insumos")
      .select("id, receita_id, insumo_id, sub_receita_id, peso_liquido, unidade")
      .in("receita_id", linhas.map((r) => r.id)),
    supabase
      .from("receita_etapas")
      .select("id, receita_id, ordem, titulo, texto, foto_url")
      .in("receita_id", linhas.map((r) => r.id))
      .order("ordem"),
  ]);
  if (erroFicha) throw new Error(mensagemErro(erroFicha));
  if (erroEtapas) throw new Error(mensagemErro(erroEtapas));

  const fichaPorReceita = new Map<string, LinhaFicha[]>();
  for (const f of (fichas ?? []) as LinhaFichaRow[]) {
    const lista = fichaPorReceita.get(f.receita_id) ?? [];
    lista.push({
      id: f.id,
      insumoId: f.insumo_id,
      subReceitaId: f.sub_receita_id,
      pesoLiquido: Number(f.peso_liquido),
      unidade: f.unidade,
    });
    fichaPorReceita.set(f.receita_id, lista);
  }

  const etapasPorReceita = new Map<string, EtapaReceita[]>();
  for (const e of (etapas ?? []) as EtapaReceitaRow[]) {
    const lista = etapasPorReceita.get(e.receita_id) ?? [];
    lista.push({
      id: e.id,
      ordem: e.ordem,
      titulo: e.titulo,
      texto: e.texto,
      fotoUrl: e.foto_url,
    });
    etapasPorReceita.set(e.receita_id, lista);
  }

  return linhas.map((r) => ({
    id: r.id,
    nomePrato: r.nome_prato,
    tipo: r.tipo,
    categoria: r.categoria,
    precoVenda: r.preco_venda == null ? null : Number(r.preco_venda),
    vendasMes: r.vendas_mes == null ? null : Number(r.vendas_mes),
    rendimento: Number(r.rendimento),
    unidadeRendimento: r.unidade_rendimento,
    pesoPorcaoG: r.peso_porcao_g == null ? null : Number(r.peso_porcao_g),
    formaFisica: r.forma_fisica,
    destinoVenda: r.destino_venda,
    margemAlvo: r.margem_alvo == null ? null : Number(r.margem_alvo),
    modoPreparo: r.modo_preparo,
    fotoUrl: r.foto_url,
    ficha: fichaPorReceita.get(r.id) ?? [],
    etapas: etapasPorReceita.get(r.id) ?? [],
  }));
}

function paraLinhaReceita(input: ReceitaInput) {
  return {
    nome_prato: input.nomePrato,
    tipo: input.tipo,
    categoria: input.categoria,
    preco_venda: input.tipo === "preparo_base" ? null : input.precoVenda,
    vendas_mes: input.tipo === "preparo_base" ? null : input.vendasMes,
    rendimento: input.rendimento,
    unidade_rendimento: input.unidadeRendimento,
    peso_porcao_g: input.pesoPorcaoG,
    forma_fisica: input.formaFisica,
    destino_venda: input.destinoVenda,
    margem_alvo: input.margemAlvo,
    modo_preparo: input.modoPreparo,
    foto_url: input.fotoUrl,
  };
}

async function substituirFicha(receitaId: string, ficha: LinhaFichaInput[]): Promise<void> {
  const supabase = await createClient();

  const { error: erroDelete } = await supabase.from("receita_insumos").delete().eq("receita_id", receitaId);
  if (erroDelete) throw new Error(mensagemErro(erroDelete));

  if (ficha.length === 0) return;

  const { error: erroInsert } = await supabase.from("receita_insumos").insert(
    ficha.map((linha) => ({
      receita_id: receitaId,
      insumo_id: linha.insumoId,
      sub_receita_id: linha.subReceitaId,
      peso_liquido: linha.pesoLiquido,
      unidade: linha.unidade,
    })),
  );
  if (erroInsert) throw new Error(mensagemErro(erroInsert));
}

async function substituirEtapas(receitaId: string, etapas: EtapaReceitaInput[]): Promise<void> {
  const supabase = await createClient();

  const { error: erroDelete } = await supabase.from("receita_etapas").delete().eq("receita_id", receitaId);
  if (erroDelete) throw new Error(mensagemErro(erroDelete));

  if (etapas.length === 0) return;

  const { error: erroInsert } = await supabase.from("receita_etapas").insert(
    etapas.map((etapa) => ({
      receita_id: receitaId,
      ordem: etapa.ordem,
      titulo: etapa.titulo,
      texto: etapa.texto,
      foto_url: etapa.fotoUrl,
    })),
  );
  if (erroInsert) throw new Error(mensagemErro(erroInsert));
}

export async function criarReceita(clienteId: string, input: ReceitaInput): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("receitas")
    .insert({ cliente_id: clienteId, ...paraLinhaReceita(input) })
    .select("id")
    .single();
  if (error) throw new Error(mensagemErro(error));

  const receitaId = (data as { id: string }).id;
  await substituirFicha(receitaId, input.ficha);
  await substituirEtapas(receitaId, input.etapas);
}

export async function atualizarReceita(id: string, input: ReceitaInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("receitas").update(paraLinhaReceita(input)).eq("id", id);
  if (error) throw new Error(mensagemErro(error));

  await substituirFicha(id, input.ficha);
  await substituirEtapas(id, input.etapas);
}

export async function excluirReceita(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("receitas").delete().eq("id", id);
  if (error) throw new Error(mensagemErro(error));
}

/** Sobe uma foto (prato ou etapa) pro bucket público receitas-fotos, sempre
 * dentro da pasta do cliente (RLS de storage exige que o 1º segmento do
 * caminho seja o cliente_id de quem envia). Retorna a URL pública -- o
 * bucket é público pra leitura, então não precisa de signed URL. */
export async function uploadFotoReceita(clienteId: string, arquivo: File): Promise<string> {
  const supabase = await createClient();
  const extensao = arquivo.name.split(".").pop() || "jpg";
  const caminho = `${clienteId}/${crypto.randomUUID()}.${extensao}`;
  const { error } = await supabase.storage.from(BUCKET_FOTOS_RECEITAS).upload(caminho, arquivo, { contentType: arquivo.type || undefined, upsert: false });
  if (error) throw new Error(mensagemErro(error));
  const { data } = supabase.storage.from(BUCKET_FOTOS_RECEITAS).getPublicUrl(caminho);
  return data.publicUrl;
}
