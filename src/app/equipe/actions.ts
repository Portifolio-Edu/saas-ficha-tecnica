"use server";

import { revalidatePath } from "next/cache";
import { getClienteAtual, type ClienteAtual } from "@/lib/dados/cliente";
import { buscarMembro, criarCodigoCozinha, criarFuncionario, removerFuncionario, type CodigoCozinha, type Membro, type NovoAcessoInput } from "@/lib/dados/equipe";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { ehGestao } from "@/lib/auth/papeis";
import { emailDoUsuario, normalizarUsuario, usuarioValido } from "@/lib/auth/equipe";
import { origemDoSite } from "@/lib/auth/origem";
import { criarLinkConsulta, desligarLinkConsulta } from "@/lib/dados/consulta";

// EQUIPE (2026-09-25): gestão da equipe. Criar login, desativar e trocar senha
// passam pela service role (Supabase Auth admin); por isso cada ação confere
// antes, pela sessão de quem pediu, se é dono/gestor do restaurante e se pode
// mexer naquele membro:
//   - ninguém mexe no dono nem em si mesmo;
//   - só o dono cria, desativa ou troca a senha de gestor.

export type Resultado<T = undefined> = { ok: true; dados?: T } | { ok: false; erro: string };

const SENHA_MINIMA = 8;
// "Desativar" bane o login no Supabase Auth, além de marcar o membro como
// inativo (a RLS já corta os dados na hora; o banimento derruba a sessão).
const BANIMENTO = "876000h";

function erro(e: unknown): { ok: false; erro: string } {
  return { ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido." };
}

async function exigirGestao(): Promise<ClienteAtual | { ok: false; erro: string }> {
  const cliente = await getClienteAtual();
  if (!cliente) return { ok: false, erro: "Sessão expirada. Faça login novamente." };
  if (!ehGestao(cliente.papel)) return { ok: false, erro: "Só o dono e o gestor mexem na equipe." };
  return cliente;
}

function podeMexer(cliente: ClienteAtual, alvo: Membro): string | null {
  if (alvo.papel === "dono") return "O acesso do dono não pode ser alterado aqui.";
  if (alvo.userId === cliente.userId) return "Você não pode alterar o próprio acesso.";
  if (alvo.papel === "gestor" && cliente.papel !== "dono") return "Só o dono mexe no acesso de gestor.";
  return null;
}

export async function acaoCriarAcesso(input: NovoAcessoInput): Promise<Resultado> {
  const cliente = await exigirGestao();
  if ("ok" in cliente) return cliente;

  const nome = input.nome.trim();
  const usuario = normalizarUsuario(input.usuario);
  if (!nome) return { ok: false, erro: "Informe o nome da pessoa." };
  if (!usuarioValido(usuario)) {
    return { ok: false, erro: "Usuário com 3 a 32 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado." };
  }
  if (input.senha.length < SENHA_MINIMA) return { ok: false, erro: `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.` };
  if (input.papel !== "estoquista" && input.papel !== "gestor") return { ok: false, erro: "Papel inválido." };
  if (input.papel === "gestor" && cliente.papel !== "dono") return { ok: false, erro: "Só o dono cria acesso de gestor." };

  try {
    const admin = criarClienteAdmin();
    const { data: criado, error: erroAuth } = await admin.auth.admin.createUser({
      email: emailDoUsuario(usuario),
      password: input.senha,
      email_confirm: true,
      user_metadata: { nome, usuario },
    });
    if (erroAuth || !criado.user) {
      const jaExiste = /already|registered|exists/i.test(erroAuth?.message ?? "");
      return { ok: false, erro: jaExiste ? "Esse usuário já existe. Escolha outro." : erroAuth?.message ?? "Não foi possível criar o acesso." };
    }

    const { error: erroMembro } = await admin
      .from("membros")
      .insert({ cliente_id: cliente.id, user_id: criado.user.id, papel: input.papel, nome, usuario });
    if (erroMembro) {
      // Sem a linha de membro o login não serve pra nada: desfaz.
      await admin.auth.admin.deleteUser(criado.user.id);
      return { ok: false, erro: erroMembro.code === "23505" ? "Esse usuário já existe. Escolha outro." : erroMembro.message };
    }
  } catch (e) {
    return erro(e);
  }

  revalidatePath("/equipe");
  return { ok: true };
}

export async function acaoDefinirAtivo(membroId: string, ativo: boolean): Promise<Resultado> {
  const cliente = await exigirGestao();
  if ("ok" in cliente) return cliente;
  const alvo = await buscarMembro(membroId);
  if (!alvo) return { ok: false, erro: "Membro não encontrado." };
  const bloqueio = podeMexer(cliente, alvo);
  if (bloqueio) return { ok: false, erro: bloqueio };

  try {
    const admin = criarClienteAdmin();
    const { error: erroAuth } = await admin.auth.admin.updateUserById(alvo.userId, { ban_duration: ativo ? "none" : BANIMENTO });
    if (erroAuth) return { ok: false, erro: erroAuth.message };
    const { error } = await admin.from("membros").update({ ativo }).eq("id", alvo.id).eq("cliente_id", cliente.id);
    if (error) return { ok: false, erro: error.message };
  } catch (e) {
    return erro(e);
  }

  revalidatePath("/equipe");
  return { ok: true };
}

export async function acaoTrocarSenha(membroId: string, novaSenha: string): Promise<Resultado> {
  const cliente = await exigirGestao();
  if ("ok" in cliente) return cliente;
  if (novaSenha.length < SENHA_MINIMA) return { ok: false, erro: `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.` };
  const alvo = await buscarMembro(membroId);
  if (!alvo) return { ok: false, erro: "Membro não encontrado." };
  if (alvo.papel === "cozinha") return { ok: false, erro: "O aparelho da cozinha não usa senha." };
  const bloqueio = podeMexer(cliente, alvo);
  if (bloqueio) return { ok: false, erro: bloqueio };

  try {
    const admin = criarClienteAdmin();
    const { error } = await admin.auth.admin.updateUserById(alvo.userId, { password: novaSenha });
    if (error) return { ok: false, erro: error.message };
  } catch (e) {
    return erro(e);
  }
  return { ok: true };
}

/** Desconecta o aparelho da cozinha: apaga o login dele (o membro vai junto). */
export async function acaoRemoverAparelho(membroId: string): Promise<Resultado> {
  const cliente = await exigirGestao();
  if ("ok" in cliente) return cliente;
  const alvo = await buscarMembro(membroId);
  if (!alvo || alvo.papel !== "cozinha") return { ok: false, erro: "Aparelho não encontrado." };

  try {
    const admin = criarClienteAdmin();
    const { error } = await admin.auth.admin.deleteUser(alvo.userId);
    if (error) return { ok: false, erro: error.message };
  } catch (e) {
    return erro(e);
  }

  revalidatePath("/equipe");
  return { ok: true };
}

export async function acaoGerarCodigoCozinha(): Promise<Resultado<CodigoCozinha>> {
  const cliente = await exigirGestao();
  if ("ok" in cliente) return cliente;
  try {
    return { ok: true, dados: await criarCodigoCozinha(cliente.id) };
  } catch (e) {
    return erro(e);
  }
}

export async function acaoAdicionarFuncionario(nome: string): Promise<Resultado> {
  const cliente = await exigirGestao();
  if ("ok" in cliente) return cliente;
  if (!nome.trim()) return { ok: false, erro: "Informe o nome." };
  try {
    await criarFuncionario(cliente.id, nome.trim());
  } catch (e) {
    return erro(e);
  }
  revalidatePath("/equipe");
  return { ok: true };
}

export async function acaoRemoverFuncionario(id: string): Promise<Resultado> {
  const cliente = await exigirGestao();
  if ("ok" in cliente) return cliente;
  try {
    await removerFuncionario(id);
  } catch (e) {
    return erro(e);
  }
  revalidatePath("/equipe");
  return { ok: true };
}

// CELULAR (2026-09-26): link só de consulta de cada pessoa da cozinha. Roda
// com a sessão de quem pede (a RLS só deixa dono e gestor, e só pra gente da
// própria casa). O link aparece uma vez; gerar de novo desliga o anterior.
export async function acaoGerarLinkConsulta(funcionarioId: string): Promise<Resultado<{ link: string; criadoEm: string }>> {
  const cliente = await exigirGestao();
  if ("ok" in cliente) return cliente;
  try {
    const { codigo, criadoEm } = await criarLinkConsulta(cliente.id, funcionarioId);
    revalidatePath("/equipe");
    return { ok: true, dados: { link: `${await origemDoSite()}/consulta/${codigo}`, criadoEm } };
  } catch (e) {
    return erro(e);
  }
}

export async function acaoDesligarLinkConsulta(funcionarioId: string): Promise<Resultado> {
  const cliente = await exigirGestao();
  if ("ok" in cliente) return cliente;
  try {
    await desligarLinkConsulta(funcionarioId);
  } catch (e) {
    return erro(e);
  }
  revalidatePath("/equipe");
  return { ok: true };
}
