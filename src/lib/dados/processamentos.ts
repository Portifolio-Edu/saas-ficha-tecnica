import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "./erros";
import type { Processamento, ProcessamentoInput } from "@/lib/dominio/processamento";

export type { Processamento, ProcessamentoInput } from "@/lib/dominio/processamento";

interface LinhaProcessamento {
  id: string;
  insumo_id: string;
  responsavel: string;
  peso_bruto_recebido: number;
  valor_pago_kg: number;
  peso_liquido_resultante: number;
  peso_aparas_reaproveitaveis: number;
  peso_descarte_puro: number;
  fc_observado: number;
  fornecedor: string | null;
  observacao: string | null;
  processado_em: string;
}

function paraProcessamento(p: LinhaProcessamento): Processamento {
  return {
    id: p.id,
    insumoId: p.insumo_id,
    responsavel: p.responsavel,
    pesoBrutoRecebido: Number(p.peso_bruto_recebido),
    valorPagoKg: Number(p.valor_pago_kg),
    pesoLiquidoResultante: Number(p.peso_liquido_resultante),
    pesoAparasReaproveitaveis: Number(p.peso_aparas_reaproveitaveis),
    pesoDescartePuro: Number(p.peso_descarte_puro),
    fcObservado: Number(p.fc_observado),
    fornecedor: p.fornecedor,
    observacao: p.observacao,
    processadoEm: p.processado_em,
  };
}

/** Todos os lotes de todos os insumos do cliente -- a RLS de
 * processamentos_proteina já filtra por tenant via join em insumos. */
export async function listarProcessamentos(): Promise<Processamento[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("processamentos_proteina")
    .select(
      "id, insumo_id, responsavel, peso_bruto_recebido, valor_pago_kg, peso_liquido_resultante, peso_aparas_reaproveitaveis, peso_descarte_puro, fc_observado, fornecedor, observacao, processado_em",
    )
    .order("processado_em");
  if (error) throw new Error(mensagemErro(error));
  return ((data ?? []) as LinhaProcessamento[]).map(paraProcessamento);
}

export async function criarProcessamento(input: ProcessamentoInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("processamentos_proteina").insert({
    insumo_id: input.insumoId,
    responsavel: input.responsavel,
    peso_bruto_recebido: input.pesoBrutoRecebido,
    valor_pago_kg: input.valorPagoKg,
    peso_liquido_resultante: input.pesoLiquidoResultante,
    peso_aparas_reaproveitaveis: input.pesoAparasReaproveitaveis,
    fornecedor: input.fornecedor,
    observacao: input.observacao,
    processado_em: input.processadoEm,
  });
  if (error) throw new Error(mensagemErro(error));
}
