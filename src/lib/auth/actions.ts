"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface EstadoAuth {
  erro?: string;
  sucesso?: string;
}

function traduzirErroAuth(mensagem: string): string {
  const mapa: Record<string, string> = {
    "Invalid login credentials": "E-mail ou senha incorretos.",
    "User already registered": "Já existe uma conta com esse e-mail.",
    "Email not confirmed": "Confirme seu e-mail antes de entrar.",
    "Password should be at least 6 characters": "A senha precisa ter pelo menos 6 caracteres.",
  };
  return mapa[mensagem] ?? mensagem;
}

export async function entrar(_estado: EstadoAuth, formData: FormData): Promise<EstadoAuth> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) return { erro: "Preencha e-mail e senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: traduzirErroAuth(error.message) };

  redirect("/insumos");
}

export async function cadastrar(_estado: EstadoAuth, formData: FormData): Promise<EstadoAuth> {
  const nome = String(formData.get("nome") ?? "").trim();
  const nomeRestaurante = String(formData.get("nome_restaurante") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!nome || !nomeRestaurante || !telefone || !email || !senha) {
    return { erro: "Preencha todos os campos." };
  }

  const supabase = await createClient();

  // nome/nome_restaurante/telefone vão em user_metadata: se a confirmação de
  // e-mail estiver ligada no projeto, ainda não há sessão pra criar a linha
  // em `clientes` agora (RLS exige auth.uid()) -- getClienteAtual() termina
  // esse cadastro sozinho no primeiro login, lendo esses mesmos metadados.
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome, nome_restaurante: nomeRestaurante, telefone } },
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
    return { erro: `Conta criada, mas houve um erro ao registrar o restaurante: ${erroCliente.message}` };
  }

  redirect("/insumos");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
