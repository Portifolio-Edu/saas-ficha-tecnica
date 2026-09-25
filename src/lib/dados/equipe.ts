import { createHash, randomInt } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "./erros";
import type { CodigoCozinha, Funcionario, Membro } from "@/lib/dominio/equipe";
import type { Papel } from "@/lib/auth/papeis";

export type { CodigoCozinha, Funcionario, Membro, NovoAcessoInput } from "@/lib/dominio/equipe";

// EQUIPE (2026-09-25): leitura da equipe pela sessão normal (a RLS mostra a
// equipe inteira só pra gestão). Criar e desativar login fica em
// src/app/equipe/actions.ts, com a service role.

interface LinhaMembro {
  id: string;
  user_id: string;
  papel: Papel;
  nome: string;
  usuario: string | null;
  ativo: boolean;
  criado_em: string;
}

export async function listarMembros(): Promise<Membro[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("membros")
    .select("id, user_id, papel, nome, usuario, ativo, criado_em")
    .order("criado_em");
  if (error) throw new Error(mensagemErro(error));
  return ((data ?? []) as LinhaMembro[]).map((m) => ({
    id: m.id,
    userId: m.user_id,
    papel: m.papel,
    nome: m.nome,
    usuario: m.usuario,
    ativo: m.ativo,
    criadoEm: m.criado_em,
  }));
}

export async function buscarMembro(id: string): Promise<Membro | null> {
  const membros = await listarMembros();
  return membros.find((m) => m.id === id) ?? null;
}

export async function listarFuncionarios(): Promise<Funcionario[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("funcionarios").select("id, nome").eq("ativo", true).order("nome");
  if (error) throw new Error(mensagemErro(error));
  return (data ?? []) as Funcionario[];
}

export async function criarFuncionario(clienteId: string, nome: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("funcionarios").insert({ cliente_id: clienteId, nome });
  if (error) throw new Error(mensagemErro(error));
}

export async function removerFuncionario(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("funcionarios").update({ ativo: false }).eq("id", id);
  if (error) throw new Error(mensagemErro(error));
}

// Sem letras e números que se confundem (0/O, 1/I/L). 31^8 ≈ 850 bilhões de
// combinações, e o código vale 15 minutos e uma vez só: não dá pra chutar.
const ALFABETO_CODIGO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const VALIDADE_CODIGO_MIN = 15;

export function normalizarCodigo(codigo: string): string {
  return codigo.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashCodigo(codigo: string): string {
  return createHash("sha256").update(normalizarCodigo(codigo)).digest("hex");
}

export async function criarCodigoCozinha(clienteId: string): Promise<CodigoCozinha> {
  const bruto = Array.from({ length: 8 }, () => ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)]).join("");
  const expiraEm = new Date(Date.now() + VALIDADE_CODIGO_MIN * 60_000).toISOString();
  const supabase = await createClient();
  const { error } = await supabase
    .from("pareamentos_cozinha")
    .insert({ cliente_id: clienteId, codigo_hash: hashCodigo(bruto), expira_em: expiraEm });
  if (error) throw new Error(mensagemErro(error));
  return { codigo: `${bruto.slice(0, 4)}-${bruto.slice(4)}`, expiraEm };
}
