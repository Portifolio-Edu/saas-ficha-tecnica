"use server";

// AGENTE IA (2026-09-26): a própria pessoa liga o WhatsApp dela ao agente
// (na janela do agente, aba WhatsApp). Roda com a sessão dela (RLS).
import { createClient } from "@/lib/supabase/server";
import { getClienteAtual } from "@/lib/dados/cliente";
import { normalizarTelefone, telefoneValido } from "@/lib/telefone";
import { configAgente } from "./config";
import { PAPEIS_DO_AGENTE } from "./pessoa";
import { VALIDADE_CODIGO_MIN, gerarCodigo, hashCodigo } from "./whatsapp";

export interface EstadoWhatsapp {
  telefone: string | null;
  verificado: boolean;
  numeroAgente: string;
}

type Resultado<T> = { ok: true; dados: T } | { ok: false; erro: string };

async function pessoa() {
  const c = await getClienteAtual();
  if (!c || !PAPEIS_DO_AGENTE.includes(c.papel)) throw new Error("O agente é pra dono, gestor e estoquista.");
  return c;
}

export async function acaoEstadoWhatsapp(): Promise<Resultado<EstadoWhatsapp>> {
  try {
    const c = await pessoa();
    const supabase = await createClient();
    const { data } = await supabase.from("agente_whatsapp").select("telefone, verificado_em").eq("user_id", c.userId).maybeSingle();
    return { ok: true, dados: { telefone: data?.telefone ?? null, verificado: !!data?.verificado_em, numeroAgente: configAgente().numeroWhatsapp } };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido." };
  }
}

export async function acaoVincularWhatsapp(telefone: string): Promise<Resultado<{ codigo: string; telefone: string; numeroAgente: string }>> {
  try {
    const c = await pessoa();
    if (!telefoneValido(telefone)) return { ok: false, erro: "Informe o WhatsApp com DDD, como (11) 98765-4321." };
    const numero = normalizarTelefone(telefone);
    const codigo = gerarCodigo();
    const supabase = await createClient();
    const campos = { telefone: numero, codigo_hash: hashCodigo(codigo), codigo_expira_em: new Date(Date.now() + VALIDADE_CODIGO_MIN * 60_000).toISOString() };
    // Insert ou update separados: as colunas de dono da linha não são atualizáveis (grants).
    const { data: existente } = await supabase.from("agente_whatsapp").select("id").eq("user_id", c.userId).maybeSingle();
    const { error } = existente
      ? await supabase.from("agente_whatsapp").update(campos).eq("id", existente.id)
      : await supabase.from("agente_whatsapp").insert({ cliente_id: c.id, user_id: c.userId, ...campos });
    if (error) return { ok: false, erro: "Não consegui gerar o código agora." };
    return { ok: true, dados: { codigo, telefone: numero, numeroAgente: configAgente().numeroWhatsapp } };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido." };
  }
}

export async function acaoDesvincularWhatsapp(): Promise<Resultado<null>> {
  try {
    const c = await pessoa();
    const supabase = await createClient();
    const { error } = await supabase.from("agente_whatsapp").delete().eq("user_id", c.userId);
    if (error) return { ok: false, erro: "Não consegui desvincular agora." };
    return { ok: true, dados: null };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido." };
  }
}
