"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { origemDoSite } from "./origem";
import { VERSAO_TERMOS } from "./termos";
import { DOMINIO_EQUIPE, emailDeLogin } from "./equipe";
import { normalizarTelefone, telefoneValido } from "@/lib/telefone";
import { criarClienteAdmin, serviceRoleConfigurada } from "@/lib/supabase/admin";

// PRODUCAO (2026-09-24): senha mínima de 8 caracteres (antes 6), termos
// aceitos no cadastro, links dos e-mails apontando pra /auth/confirmar e
// recuperação de senha. Versão anterior: `git show a57efba:src/lib/auth/actions.ts`.
const SENHA_MINIMA = 8;

export interface EstadoAuth {
  erro?: string;
  sucesso?: string;
}

function traduzirErroAuth(mensagem: string): string {
  const mapa: Record<string, string> = {
    "Invalid login credentials": "Usuário, e-mail ou senha incorretos.",
    "User already registered": "Já existe uma conta com esse e-mail.",
    "Email not confirmed": "Confirme seu e-mail antes de entrar.",
    "Password should be at least 6 characters": "A senha precisa ter pelo menos 8 caracteres.",
    "New password should be different from the old password.": "A nova senha precisa ser diferente da anterior.",
    "Email rate limit exceeded": "Muitos e-mails enviados em pouco tempo. Espere alguns minutos e tente de novo.",
    "email rate limit exceeded": "Muitos e-mails enviados em pouco tempo. Espere alguns minutos e tente de novo.",
  };
  return mapa[mensagem] ?? mensagem;
}

export async function entrar(_estado: EstadoAuth, formData: FormData): Promise<EstadoAuth> {
  // EQUIPE (2026-09-25): o campo aceita e-mail (dono) ou usuário (gestor e
  // estoquista criados na tela Equipe), e cada papel cai na própria tela
  // inicial pela raiz. Antes: só e-mail, sempre pra /insumos.
  const entrada = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!entrada || !senha) return { erro: "Preencha usuário ou e-mail, e a senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: emailDeLogin(entrada), password: senha });
  if (error) return { erro: traduzirErroAuth(error.message) };

  redirect("/");
}

export async function cadastrar(_estado: EstadoAuth, formData: FormData): Promise<EstadoAuth> {
  const nome = String(formData.get("nome") ?? "").trim();
  const nomeRestaurante = String(formData.get("nome_restaurante") ?? "").trim();
  const telefoneDigitado = String(formData.get("telefone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!nome || !nomeRestaurante || !telefoneDigitado || !email || !senha) {
    return { erro: "Preencha todos os campos." };
  }
  // PLANO 9,5 (2026-09-26): telefone num formato só (55 + DDD) e conferido
  // ANTES de criar o login — antes, um telefone já usado criava a conta e
  // quebrava a tela, deixando a pessoa com login e sem restaurante.
  if (!telefoneValido(telefoneDigitado)) return { erro: "Informe o WhatsApp com DDD, como (11) 98765-4321." };
  const telefone = normalizarTelefone(telefoneDigitado);
  if (senha.length < SENHA_MINIMA) return { erro: `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.` };
  if (formData.get("aceite_termos") !== "on") {
    return { erro: "Para criar a conta, aceite os Termos de uso e a Política de privacidade." };
  }

  const supabase = await createClient();

  // PLANO 9,5 (2026-09-28): a conferência roda com a service role (só o
  // servidor pode perguntar se um número é cliente; visitante não). Sem a
  // chave configurada, pula a conferência e o índice único do banco segura
  // (a conta recém-criada é desfeita logo abaixo).
  if (serviceRoleConfigurada()) {
    const { data: disponivel, error: erroTelefone } = await criarClienteAdmin().rpc("telefone_disponivel", { p_telefone: telefone });
    if (erroTelefone) return { erro: "Não foi possível conferir o telefone agora. Tente de novo em instantes." };
    if (disponivel === false) {
      return { erro: "Esse WhatsApp já está cadastrado em outro restaurante. Entre com a conta dele ou use outro número." };
    }
  }

  // nome/nome_restaurante/telefone vão em user_metadata: se a confirmação de
  // e-mail estiver ligada no projeto, ainda não há sessão pra criar a linha
  // em `clientes` agora (RLS exige auth.uid()) -- getClienteAtual() termina
  // esse cadastro sozinho no primeiro login, lendo esses mesmos metadados.
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      // Registro do aceite (LGPD): quando e qual versão dos termos.
      data: { nome, nome_restaurante: nomeRestaurante, telefone, aceite_termos_em: new Date().toISOString(), versao_termos: VERSAO_TERMOS },
      emailRedirectTo: `${await origemDoSite()}/auth/confirmar?next=/visao-geral`,
    },
  });

  if (error) return { erro: traduzirErroAuth(error.message) };
  if (!data.user) return { erro: "Não foi possível criar a conta. Tente novamente." };

  if (!data.session) {
    return { sucesso: "Cadastro criado. Verifique seu e-mail para confirmar a conta e depois faça login." };
  }

  const { error: erroCliente } = await supabase.from("clientes").insert({
    user_id: data.user.id,
    nome,
    nome_restaurante: nomeRestaurante,
    telefone,
  });
  if (erroCliente) {
    // Não deixa login sem restaurante: desfaz a conta recém-criada.
    await supabase.auth.signOut();
    if (serviceRoleConfigurada()) await criarClienteAdmin().auth.admin.deleteUser(data.user.id);
    return {
      erro:
        erroCliente.code === "23505"
          ? "Esse WhatsApp já está cadastrado em outro restaurante. Entre com a conta dele ou use outro número."
          : "Não foi possível registrar o restaurante. Tente de novo em instantes.",
    };
  }

  redirect("/insumos");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Envia o e-mail com o link pra criar uma senha nova. Responde igual exista ou
 * não a conta, pra não revelar quais e-mails são clientes. */
export async function recuperarSenha(_estado: EstadoAuth, formData: FormData): Promise<EstadoAuth> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { erro: "Informe o e-mail da conta." };
  // Gestor e estoquista entram com usuário, sem e-mail de verdade: a senha
  // nova vem do dono ou do gestor, na tela Equipe.
  if (!email.includes("@") || email.toLowerCase().endsWith(`@${DOMINIO_EQUIPE}`)) {
    return { erro: "Quem entra com usuário (gestor ou estoquista) pede a senha nova ao dono ou ao gestor, na tela Equipe." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origemDoSite()}/auth/confirmar?next=/nova-senha`,
  });
  if (error && /rate limit/i.test(error.message)) return { erro: traduzirErroAuth(error.message) };
  return { sucesso: "Se existir uma conta com esse e-mail, enviamos um link pra criar uma senha nova. Confira também a caixa de spam." };
}

/** Grava a senha nova. Só funciona com a sessão aberta pelo link do e-mail. */
export async function definirNovaSenha(_estado: EstadoAuth, formData: FormData): Promise<EstadoAuth> {
  const senha = String(formData.get("senha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");
  if (senha.length < SENHA_MINIMA) return { erro: `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.` };
  if (senha !== confirmacao) return { erro: "As duas senhas não são iguais." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { erro: traduzirErroAuth(error.message) };
  redirect("/visao-geral");
}
