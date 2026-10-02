// AVISOS NO WHATSAPP (2026-10-02): o que a seção Configurações → Avisos
// mostra pra gestão: o que está ligado, quem recebe e os últimos avisos.
// Tudo pela sessão normal (RLS: config pra todos do restaurante, equipe,
// WhatsApp da equipe e histórico só pra gestão).

import { createClient } from "@/lib/supabase/server";
import { configDaLinha, type ConfigAvisos, type TipoAviso } from "@/lib/automacoes/avisos";
import type { Papel } from "@/lib/auth/papeis";

export interface DestinatarioAviso {
  nome: string;
  papel: Papel;
  /** 55 + DDD; null = ainda não ativou o WhatsApp no agente. */
  whatsapp: string | null;
}

export interface AvisoEnviado {
  id: string;
  tipo: TipoAviso;
  para: string;
  criadoEm: string;
  enviadoEm: string | null;
  status: "pendente" | "enviando" | "enviado" | "falhou";
  erro: string | null;
}

export interface DadosAvisos {
  config: ConfigAvisos;
  destinatarios: DestinatarioAviso[];
  historico: AvisoEnviado[];
}

export async function getAvisos(): Promise<DadosAvisos> {
  const supabase = await createClient();
  const [{ data: cfg }, { data: membros }, { data: zaps }, { data: avisos }] = await Promise.all([
    supabase.from("avisos_config").select("*").maybeSingle(),
    supabase.from("membros").select("user_id, nome, papel, ativo").in("papel", ["dono", "gestor"]).eq("ativo", true).order("criado_em"),
    supabase.from("agente_whatsapp").select("user_id, telefone, verificado_em"),
    supabase.from("avisos").select("id, tipo, user_id, criado_em, enviado_em, status, erro").order("criado_em", { ascending: false }).limit(15),
  ]);
  type Zap = { user_id: string; telefone: string; verificado_em: string | null };
  type Membro = { user_id: string; nome: string; papel: Papel };
  type Linha = { id: string; tipo: TipoAviso; user_id: string; criado_em: string; enviado_em: string | null; status: AvisoEnviado["status"]; erro: string | null };
  const listaMembros = (membros ?? []) as Membro[];
  const zapDe = new Map(((zaps ?? []) as Zap[]).filter((z) => z.verificado_em).map((z) => [z.user_id, z.telefone]));
  const nomeDe = new Map(listaMembros.map((m) => [m.user_id, m.nome]));

  return {
    config: configDaLinha(cfg),
    destinatarios: listaMembros.map((m) => ({ nome: m.nome, papel: m.papel, whatsapp: zapDe.get(m.user_id) ?? null })),
    historico: ((avisos ?? []) as Linha[]).map((a) => ({
      id: a.id,
      tipo: a.tipo,
      para: nomeDe.get(a.user_id) ?? "Alguém da equipe",
      criadoEm: a.criado_em,
      enviadoEm: a.enviado_em,
      status: a.status,
      erro: a.erro,
    })),
  };
}
