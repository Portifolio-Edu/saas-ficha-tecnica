"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getClienteAtual } from "@/lib/dados/cliente";
import { excluirRestaurante } from "@/lib/dados/conta";
import { createClient } from "@/lib/supabase/server";
import { serviceRoleConfigurada } from "@/lib/supabase/admin";
import { atualizarCanal, atualizarRestaurante, atualizarTurno, criarCanal, criarTurno, excluirCanal, excluirTurno, listarCanais } from "@/lib/dados/configuracoes";
import { garantirTurnosPadrao } from "@/lib/dados/producoes";
import { ehGestao } from "@/lib/auth/papeis";
import { nomeJaExiste, validarCanal, validarRestaurante, validarTurno } from "@/lib/dominio/configuracoes";

// CONFIGURAÇÕES (2026-10-03): dados do restaurante, canais de venda e turnos.
// Só dono e gestor escrevem (a RLS também barra; aqui a mensagem sai clara).
// A parte de excluir o restaurante, mais abaixo, é de antes e não mudou.

export type Resultado = { ok: true } | { ok: false; erro: string };

async function exigirGestao(): Promise<{ id: string } | { erro: string }> {
  const cliente = await getClienteAtual();
  if (!cliente) return { erro: "Sessão expirada. Faça login novamente." };
  if (!ehGestao(cliente.papel)) return { erro: "Só o dono e o gestor mudam as configurações." };
  return { id: cliente.id };
}

function falha(e: unknown): Resultado {
  return { ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido." };
}

function atualizarTelas() {
  // A margem alvo e os canais alimentam várias telas; o turno aparece em Produções e Checklists.
  for (const rota of ["/configuracoes", "/visao-geral", "/receitas", "/producoes", "/checklists", "/relatorios"]) revalidatePath(rota);
}

export async function acaoSalvarRestaurante(entrada: { nomeRestaurante: string; nome: string; cnpj: string; margemAlvoPct: string }): Promise<Resultado> {
  const quem = await exigirGestao();
  if ("erro" in quem) return { ok: false, erro: quem.erro };
  const v = validarRestaurante(entrada);
  if (!v.ok) return { ok: false, erro: v.erro };
  try {
    await atualizarRestaurante(quem.id, v.valor);
    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falha(e);
  }
}

export async function acaoSalvarCanal(id: string | null, entrada: { nomeCanal: string; comissaoPct: string; embala: boolean; ativo: boolean }): Promise<Resultado> {
  const quem = await exigirGestao();
  if ("erro" in quem) return { ok: false, erro: quem.erro };
  const v = validarCanal(entrada);
  if (!v.ok) return { ok: false, erro: v.erro };
  try {
    const existentes = (await listarCanais()).map((c) => ({ id: c.id, nome: c.nomeCanal }));
    if (nomeJaExiste(v.valor.nomeCanal, existentes, id ?? undefined)) return { ok: false, erro: `Já existe um canal chamado "${v.valor.nomeCanal}".` };
    if (id) await atualizarCanal(id, v.valor);
    else await criarCanal(quem.id, v.valor);
    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falha(e);
  }
}

export async function acaoExcluirCanal(id: string): Promise<Resultado> {
  const quem = await exigirGestao();
  if ("erro" in quem) return { ok: false, erro: quem.erro };
  try {
    await excluirCanal(id);
    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falha(e);
  }
}

export async function acaoSalvarTurno(id: string | null, entrada: { nome: string; horario: string }): Promise<Resultado> {
  const quem = await exigirGestao();
  if ("erro" in quem) return { ok: false, erro: quem.erro };
  const v = validarTurno(entrada);
  if (!v.ok) return { ok: false, erro: v.erro };
  try {
    const existentes = (await garantirTurnosPadrao(quem.id)).map((t) => ({ id: t.id, nome: t.nome }));
    if (nomeJaExiste(v.valor.nome, existentes, id ?? undefined)) return { ok: false, erro: `Já existe um turno chamado "${v.valor.nome}".` };
    if (id) await atualizarTurno(id, v.valor);
    else await criarTurno(quem.id, v.valor);
    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falha(e);
  }
}

/** O último turno não sai: sem nenhum, Produções recriaria Manhã, Tarde e Noite na próxima visita. */
export async function acaoExcluirTurno(id: string): Promise<Resultado> {
  const quem = await exigirGestao();
  if ("erro" in quem) return { ok: false, erro: quem.erro };
  try {
    const existentes = await garantirTurnosPadrao(quem.id);
    if (existentes.length <= 1) return { ok: false, erro: "O restaurante precisa de pelo menos um turno. Renomeie este em vez de excluir." };
    await excluirTurno(id);
    atualizarTelas();
    return { ok: true };
  } catch (e) {
    return falha(e);
  }
}

// PLANO 9,5, etapa 3 (2026-09-26): LGPD — o dono apaga o restaurante e tudo o
// que está nele. Confirma digitando o nome do restaurante; a exclusão usa a
// service role (apaga logins e fotos), então confere o papel antes.

export async function acaoExcluirRestaurante(_estado: { erro?: string }, formData: FormData): Promise<{ erro?: string }> {
  const cliente = await getClienteAtual();
  if (!cliente) return { erro: "Sessão expirada. Faça login novamente." };
  if (cliente.papel !== "dono") return { erro: "Só o dono pode excluir o restaurante." };
  const digitado = String(formData.get("confirmacao") ?? "").trim();
  if (digitado.toLocaleLowerCase("pt-BR") !== cliente.nomeRestaurante.trim().toLocaleLowerCase("pt-BR")) {
    return { erro: `Digite o nome do restaurante exatamente como aparece: ${cliente.nomeRestaurante}` };
  }
  if (!serviceRoleConfigurada()) return { erro: "O servidor ainda não está configurado para excluir contas. Fale com o suporte." };

  try {
    await excluirRestaurante(cliente.id, cliente.userId);
  } catch (e) {
    return { erro: `Não foi possível excluir tudo: ${e instanceof Error ? e.message : "erro desconhecido"}. Tente de novo; o que já saiu não volta.` };
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?aviso=conta-excluida");
}
