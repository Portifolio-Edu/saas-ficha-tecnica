import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "./erros";
import { supabaseConfigurado } from "@/lib/supabase/config";

export interface ClienteAtual {
  id: string;
  nome: string;
  nomeRestaurante: string;
  margemAlvo: number;
}

interface MetadadosCadastro {
  nome?: string;
  nome_restaurante?: string;
  telefone?: string;
}

/**
 * Lê o cliente (tenant) do usuário autenticado. Se o cadastro foi
 * interrompido antes de criar a linha em `clientes` (confirmação de e-mail
 * no meio do fluxo, por exemplo), termina o onboarding aqui usando os dados
 * salvos em user_metadata no signUp -- ver src/lib/auth/actions.ts.
 * Retorna null quando não há usuário logado ou quando os metadados do
 * cadastro nunca chegaram a ser salvos.
 */
export async function getClienteAtual(): Promise<ClienteAtual | null> {
  if (!supabaseConfigurado()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existente } = await supabase
    .from("clientes")
    .select("id, nome, nome_restaurante, margem_alvo")
    .maybeSingle();

  if (existente) {
    return {
      id: existente.id,
      nome: existente.nome,
      nomeRestaurante: existente.nome_restaurante,
      margemAlvo: Number(existente.margem_alvo),
    };
  }

  const meta = (user.user_metadata ?? {}) as MetadadosCadastro;
  if (!meta.nome || !meta.nome_restaurante || !meta.telefone) return null;

  const { data: criado, error } = await supabase
    .from("clientes")
    .insert({
      user_id: user.id,
      nome: meta.nome,
      nome_restaurante: meta.nome_restaurante,
      telefone: meta.telefone,
    })
    .select("id, nome, nome_restaurante, margem_alvo")
    .single();

  // Não retorna null aqui: null significa "sem cadastro pendente" pras
  // páginas que chamam getClienteAtual(), o que causaria um loop silencioso
  // de redirect pro /login em vez de mostrar que o onboarding falhou.
  if (error) throw new Error(mensagemErro(error));
  if (!criado) return null;

  return {
    id: criado.id,
    nome: criado.nome,
    nomeRestaurante: criado.nome_restaurante,
    margemAlvo: Number(criado.margem_alvo),
  };
}
