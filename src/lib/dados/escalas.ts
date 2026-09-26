// ESCALAS (2026-09-26): leitura e gravação do módulo de escalas no Supabase.
// A RLS limita escalas, prontuário e regras a dono/gestor; a cozinha lê pela
// função escala_publica (sem motivo de ausência). Motor: src/lib/escalas.
import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "./erros";
import { REGRAS_PADRAO } from "@/lib/escalas/motor";
import type { CadastroEscalaInput, OcorrenciaInput } from "@/lib/escalas/validacao";
import type { OcorrenciaRegistro, PessoaEscala } from "@/lib/escalas/cadastro";
import { PERFIL_VAZIO, type NotaInput, type NotaPerfil, type PerfilCompetencia, type PerfilInput, type TipoNota } from "@/lib/escalas/perfil";
import { normalizarTelefone, type Extra, type ExtraInput } from "@/lib/escalas/extras";
import type { DataISO, DiaSemana, FuncionarioEscala, Nivel, Ocorrencia, RegrasEscala, Restricao, Setor, TipoEscala, TipoOcorrencia } from "@/lib/escalas/tipos";

interface LinhaFuncionario {
  id: string;
  nome: string;
  setor: Setor | null;
  cargo: string | null;
  admitido_em: string | null;
  desligado_em: string | null;
}

interface LinhaConfig {
  funcionario_id: string;
  tipo: TipoEscala;
  ancora: string;
  folgas_preferidas: number[] | null;
  intervalo_domingo_semanas: number | null;
  turno_inicio: string | null;
  turno_fim: string | null;
}

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

function paraConfig(c: LinhaConfig) {
  const inicio = hhmm(c.turno_inicio);
  const fim = hhmm(c.turno_fim);
  return {
    tipo: c.tipo,
    ancora: c.ancora,
    folgasPreferidas: (c.folgas_preferidas ?? []) as DiaSemana[],
    ...(c.intervalo_domingo_semanas ? { intervaloDomingoSemanas: c.intervalo_domingo_semanas } : {}),
    ...(inicio && fim ? { turno: { inicio, fim } } : {}),
  };
}

interface LinhaPerfil {
  funcionario_id: string;
  nivel: Nivel | null;
  pracas: string[];
  pontos_fortes: string[];
  limitacoes: string[];
  observacoes: string | null;
  atualizado_em: string;
}

interface LinhaExtra {
  id: string;
  nome: string;
  telefone: string;
  setor: Setor;
  cargos: string[];
  nivel: Nivel | null;
  pracas: string[];
  aceita_whatsapp: boolean;
  consentimento_em: string | null;
  ativo: boolean;
  nota: string | null;
}

const paraExtra = (e: LinhaExtra): Extra => ({
  id: e.id,
  nome: e.nome,
  telefone: e.telefone,
  setor: e.setor,
  cargos: e.cargos ?? [],
  nivel: e.nivel,
  pracas: e.pracas ?? [],
  aceitaWhatsapp: e.aceita_whatsapp,
  consentimentoEm: e.consentimento_em,
  ativo: e.ativo,
  nota: e.nota,
});

export interface DadosEscalasGestao {
  pessoas: PessoaEscala[];
  ocorrencias: OcorrenciaRegistro[];
  regras: RegrasEscala;
  notas: NotaPerfil[];
  extras: Extra[];
}

export async function carregarEscalasGestao(): Promise<DadosEscalasGestao> {
  const supabase = await createClient();
  const desde = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);
  const [funcs, configs, regras, ocs, perfis, notas, extras] = await Promise.all([
    supabase.from("funcionarios").select("id, nome, setor, cargo, admitido_em, desligado_em").eq("ativo", true).order("nome"),
    supabase.from("escalas_config").select("funcionario_id, tipo, ancora, folgas_preferidas, intervalo_domingo_semanas, turno_inicio, turno_fim"),
    supabase.from("escalas_regras").select("intervalo_domingo_semanas, cobertura_minima").maybeSingle(),
    supabase.from("prontuario_ocorrencias").select("id, funcionario_id, tipo, inicio, fim, restricoes, nota, criado_em").gte("fim", desde).order("inicio", { ascending: false }),
    supabase.from("perfil_funcionario").select("funcionario_id, nivel, pracas, pontos_fortes, limitacoes, observacoes, atualizado_em"),
    supabase.from("perfil_notas").select("id, funcionario_id, data, tipo, texto, autor, criado_em").order("data", { ascending: false }).order("criado_em", { ascending: false }).limit(2000),
    supabase.from("banco_extras").select("id, nome, telefone, setor, cargos, nivel, pracas, aceita_whatsapp, consentimento_em, ativo, nota").order("nome"),
  ]);
  for (const r of [funcs, configs, regras, ocs, perfis, notas, extras]) if (r.error) throw new Error(mensagemErro(r.error));

  const perfilPorId = new Map(
    ((perfis.data ?? []) as LinhaPerfil[]).map((p): [string, PerfilCompetencia] => [
      p.funcionario_id,
      { nivel: p.nivel, pracas: p.pracas ?? [], pontosFortes: p.pontos_fortes ?? [], limitacoes: p.limitacoes ?? [], observacoes: p.observacoes, atualizadoEm: p.atualizado_em },
    ]),
  );

  const configPorId = new Map(((configs.data ?? []) as LinhaConfig[]).map((c) => [c.funcionario_id, paraConfig(c)]));
  const pessoas: PessoaEscala[] = ((funcs.data ?? []) as LinhaFuncionario[]).map((f) => ({
    id: f.id,
    nome: f.nome,
    setor: f.setor,
    cargo: f.cargo,
    admissao: f.admitido_em,
    desligamento: f.desligado_em,
    escala: configPorId.get(f.id) ?? null,
    perfil: perfilPorId.get(f.id) ?? PERFIL_VAZIO,
  }));
  const r = regras.data as { intervalo_domingo_semanas: number; cobertura_minima: Record<string, number> } | null;
  return {
    pessoas,
    regras: r ? { intervaloDomingoSemanas: r.intervalo_domingo_semanas, coberturaMinima: r.cobertura_minima ?? {} } : REGRAS_PADRAO,
    ocorrencias: ((ocs.data ?? []) as { id: string; funcionario_id: string; tipo: TipoOcorrencia; inicio: string; fim: string; restricoes: Restricao[]; nota: string | null; criado_em: string }[]).map((o) => ({
      id: o.id,
      funcionarioId: o.funcionario_id,
      tipo: o.tipo,
      inicio: o.inicio,
      fim: o.fim,
      restricoes: o.restricoes ?? [],
      ...(o.nota ? { nota: o.nota } : {}),
      criadoEm: o.criado_em,
    })),
    notas: ((notas.data ?? []) as { id: string; funcionario_id: string; data: string; tipo: TipoNota; texto: string; autor: string | null; criado_em: string }[]).map((n) => ({
      id: n.id,
      funcionarioId: n.funcionario_id,
      data: n.data,
      tipo: n.tipo,
      texto: n.texto,
      autor: n.autor,
      criadoEm: n.criado_em,
    })),
    extras: ((extras.data ?? []) as LinhaExtra[]).map(paraExtra),
  };
}

/** Escala pro tablet da cozinha: só o necessário pro cálculo, sem motivo. */
export async function carregarEscalaPublica(inicio: DataISO, fim: DataISO): Promise<{ funcionarios: FuncionarioEscala[]; ocorrencias: Ocorrencia[]; regras: RegrasEscala }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("escala_publica", { p_inicio: inicio, p_fim: fim });
  if (error) throw new Error(mensagemErro(error));
  return paraEntradaEscala(data as EscalaPublicaRpc);
}

export interface EscalaPublicaRpc {
  intervalo_domingo_semanas: number;
  funcionarios: (LinhaConfig & { id: string; nome: string; setor: Setor; cargo: string; admitido_em: string; desligado_em: string | null })[];
  ausencias: { funcionario_id: string; tipo: "ausencia" | "ausencia_prolongada" | "ferias" | "restricao"; inicio: string; fim: string }[];
}

/** CELULAR (2026-09-26): também usado pelo link de consulta (mesmo recorte). */
export function paraEntradaEscala(d: EscalaPublicaRpc): { funcionarios: FuncionarioEscala[]; ocorrencias: Ocorrencia[]; regras: RegrasEscala } {
  return {
    regras: { intervaloDomingoSemanas: d.intervalo_domingo_semanas, coberturaMinima: {} },
    funcionarios: d.funcionarios.map((f) => ({
      id: f.id,
      nome: f.nome,
      setor: f.setor,
      cargo: f.cargo,
      admissao: f.admitido_em,
      desligamento: f.desligado_em,
      escala: paraConfig({ ...f, funcionario_id: f.id }),
    })),
    ocorrencias: d.ausencias.map((a, i) => ({
      id: `pub-${i}`,
      funcionarioId: a.funcionario_id,
      tipo: a.tipo,
      inicio: a.inicio,
      fim: a.fim,
      ...(a.tipo === "restricao" ? { restricoes: ["sem_escala_longa" as const] } : {}),
    })),
  };
}

export async function salvarPessoaEscala(id: string | null, c: CadastroEscalaInput): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("salvar_pessoa_escala", {
    p_id: id,
    p_nome: c.nome,
    p_setor: c.setor,
    p_cargo: c.cargo,
    p_admissao: c.admissao,
    p_desligamento: c.desligamento,
    p_tipo: c.tipo,
    p_ancora: c.ancora,
    p_folgas: c.folgasPreferidas,
    p_intervalo: c.intervaloDomingoSemanas,
    p_turno_inicio: c.turnoInicio,
    p_turno_fim: c.turnoFim,
  });
  if (error) throw new Error(mensagemErro(error));
  return data as string;
}

export async function salvarRegrasEscala(clienteId: string, r: RegrasEscala): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("escalas_regras")
    .upsert({ cliente_id: clienteId, intervalo_domingo_semanas: r.intervaloDomingoSemanas, cobertura_minima: r.coberturaMinima, atualizado_em: new Date().toISOString() });
  if (error) throw new Error(mensagemErro(error));
}

export async function criarOcorrencia(clienteId: string, o: OcorrenciaInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("prontuario_ocorrencias").insert({
    cliente_id: clienteId,
    funcionario_id: o.funcionarioId,
    tipo: o.tipo,
    inicio: o.inicio,
    fim: o.fim,
    restricoes: o.restricoes,
    nota: o.nota?.trim() || null,
  });
  if (error) throw new Error(mensagemErro(error));
}

export async function removerOcorrencia(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("prontuario_ocorrencias").delete().eq("id", id);
  if (error) throw new Error(mensagemErro(error));
}

// PERFIL (2026-09-27): prontuário de competências, notas e banco de extras.
// Tudo só de dono/gestor (RLS em perfil_funcionario, perfil_notas e
// banco_extras). O banco carimba quem alterou e quem escreveu cada nota.

export async function salvarPerfil(clienteId: string, funcionarioId: string, p: PerfilInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("perfil_funcionario").upsert({
    funcionario_id: funcionarioId,
    cliente_id: clienteId,
    nivel: p.nivel,
    pracas: p.pracas,
    pontos_fortes: p.pontosFortes,
    limitacoes: p.limitacoes,
    observacoes: p.observacoes,
  });
  if (error) throw new Error(mensagemErro(error));
}

export async function criarNota(clienteId: string, n: NotaInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("perfil_notas").insert({ cliente_id: clienteId, funcionario_id: n.funcionarioId, data: n.data, tipo: n.tipo, texto: n.texto.trim() });
  if (error) throw new Error(mensagemErro(error));
}

export async function removerNota(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("perfil_notas").delete().eq("id", id);
  if (error) throw new Error(mensagemErro(error));
}

export async function salvarExtra(clienteId: string, id: string | null, e: ExtraInput): Promise<void> {
  const supabase = await createClient();
  const linha = {
    nome: e.nome.trim(),
    telefone: normalizarTelefone(e.telefone),
    setor: e.setor,
    cargos: e.cargos,
    nivel: e.nivel,
    pracas: e.pracas,
    aceita_whatsapp: e.aceitaWhatsapp,
    ativo: e.ativo,
    nota: e.nota?.trim() || null,
  };
  if (id) {
    // Consentimento: grava a data na primeira vez que a pessoa aceita; se
    // deixar de aceitar, apaga (LGPD: o registro tem que refletir o atual).
    const { data: atual, error: erroLeitura } = await supabase.from("banco_extras").select("aceita_whatsapp, consentimento_em").eq("id", id).single();
    if (erroLeitura) throw new Error(mensagemErro(erroLeitura));
    const consentimento_em = e.aceitaWhatsapp ? (atual.aceita_whatsapp ? atual.consentimento_em : new Date().toISOString()) : null;
    const { error } = await supabase.from("banco_extras").update({ ...linha, consentimento_em }).eq("id", id);
    if (error) throw new Error(mensagemErro(error));
  } else {
    const { error } = await supabase.from("banco_extras").insert({ ...linha, cliente_id: clienteId, consentimento_em: e.aceitaWhatsapp ? new Date().toISOString() : null });
    if (error) throw new Error(mensagemErro(error));
  }
}

export async function removerExtra(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("banco_extras").delete().eq("id", id);
  if (error) throw new Error(mensagemErro(error));
}
