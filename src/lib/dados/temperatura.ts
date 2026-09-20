import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "./erros";
import type { LocalArmazenamento, LocalArmazenamentoInput, RegistroTemperatura, RegistroTemperaturaInput } from "@/lib/dominio/temperatura";

export type { LocalArmazenamento, LocalArmazenamentoInput, RegistroTemperatura, RegistroTemperaturaInput } from "@/lib/dominio/temperatura";

interface LinhaLocal {
  id: string;
  nome: string;
  temperatura_min_c: number | null;
  temperatura_max_c: number | null;
}

function paraLocal(l: LinhaLocal): LocalArmazenamento {
  return {
    id: l.id,
    nome: l.nome,
    temperaturaMinC: l.temperatura_min_c == null ? null : Number(l.temperatura_min_c),
    temperaturaMaxC: l.temperatura_max_c == null ? null : Number(l.temperatura_max_c),
  };
}

export async function listarLocaisArmazenamento(): Promise<LocalArmazenamento[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("locais_armazenamento").select("id, nome, temperatura_min_c, temperatura_max_c").order("nome");
  if (error) throw new Error(mensagemErro(error));
  return ((data ?? []) as LinhaLocal[]).map(paraLocal);
}

export async function criarLocalArmazenamento(clienteId: string, input: LocalArmazenamentoInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("locais_armazenamento").insert({
    cliente_id: clienteId,
    nome: input.nome,
    temperatura_min_c: input.temperaturaMinC,
    temperatura_max_c: input.temperaturaMaxC,
  });
  if (error) throw new Error(mensagemErro(error));
}

export async function atualizarLocalArmazenamento(id: string, input: LocalArmazenamentoInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("locais_armazenamento")
    .update({ nome: input.nome, temperatura_min_c: input.temperaturaMinC, temperatura_max_c: input.temperaturaMaxC })
    .eq("id", id);
  if (error) throw new Error(mensagemErro(error));
}

export async function excluirLocalArmazenamento(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("locais_armazenamento").delete().eq("id", id);
  if (error) throw new Error(mensagemErro(error));
}

interface LinhaRegistroJoin {
  id: string;
  local_armazenamento_id: string;
  temperatura_c: number;
  responsavel: string;
  registrado_em: string;
  insumo_id: string | null;
  locais_armazenamento: { nome: string } | null;
  insumos: { nome: string } | null;
}

export async function listarRegistrosTemperatura(limite = 60): Promise<RegistroTemperatura[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("registros_temperatura")
    .select("id, local_armazenamento_id, temperatura_c, responsavel, registrado_em, insumo_id, locais_armazenamento(nome), insumos(nome)")
    .order("registrado_em", { ascending: false })
    .limit(limite);
  if (error) throw new Error(mensagemErro(error));

  return ((data ?? []) as unknown as LinhaRegistroJoin[])
    .filter((r) => r.locais_armazenamento)
    .map((r) => ({
      id: r.id,
      localArmazenamentoId: r.local_armazenamento_id,
      nomeLocal: r.locais_armazenamento!.nome,
      temperaturaC: Number(r.temperatura_c),
      responsavel: r.responsavel,
      registradoEm: r.registrado_em,
      insumoId: r.insumo_id,
      nomeInsumo: r.insumos?.nome ?? null,
    }));
}

export async function registrarTemperatura(input: RegistroTemperaturaInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("registros_temperatura").insert({
    local_armazenamento_id: input.localArmazenamentoId,
    temperatura_c: input.temperaturaC,
    responsavel: input.responsavel,
    insumo_id: input.insumoId,
  });
  if (error) throw new Error(mensagemErro(error));
}
