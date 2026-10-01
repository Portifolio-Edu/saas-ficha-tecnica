import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "./erros";
import { supabaseConfigurado } from "@/lib/supabase/config";
import type { Papel } from "@/lib/auth/papeis";
import { normalizarTelefone } from "@/lib/telefone";

// EQUIPE (2026-09-25): além do restaurante, devolve o papel de quem está logado
// (dono, gestor, estoquista ou cozinha) e o nome dele na equipe. Antes o login
// era sempre o dono. Versão anterior: `git show 42faa4f:src/lib/dados/cliente.ts`.
export interface ClienteAtual {
  id: string;
  nome: string;
  nomeRestaurante: string;
  margemAlvo: number;
  papel: Papel;
  nomeMembro: string;
  /** auth.users.id de quem está logado. */
  userId: string;
  /** CONFIGURAÇÕES (2026-10-01): marca do restaurante no menu (logo) e no acento (cor). */
  logoUrl: string | null;
  corDestaque: string | null;
}

// CONFIGURAÇÕES (2026-10-01): colunas que o shell precisa em toda tela.
const COLUNAS = "id, nome, nome_restaurante, margem_alvo, logo_path, cor_destaque";

/** Endereço público do logo (balde "marcas" é público; ver a migration 20261001100000). */
export function urlDoLogo(supabase: Awaited<ReturnType<typeof createClient>>, caminho: string | null): string | null {
  return caminho ? supabase.storage.from("marcas").getPublicUrl(caminho).data.publicUrl : null;
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
// CONFIGURAÇÕES (2026-10-01): cache() por requisição — a página (exigirAcesso)
// e o AppShell (logo e cor) leem o mesmo cliente sem ir duas vezes ao banco.
export const getClienteAtual = cache(lerClienteAtual);

async function lerClienteAtual(): Promise<ClienteAtual | null> {
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
    .select(COLUNAS)
    .maybeSingle();

  if (existente) {
    // A RLS de membros deixa cada um ler a própria linha. Sem linha (não
    // deveria acontecer: o trigger cria o dono) trata como dono, que é o
    // único caso em que o restaurante aparece sem membro (clientes.user_id).
    const { data: membro } = await supabase
      .from("membros")
      .select("papel, nome")
      .eq("user_id", user.id)
      .maybeSingle();
    return {
      id: existente.id,
      nome: existente.nome,
      nomeRestaurante: existente.nome_restaurante,
      margemAlvo: Number(existente.margem_alvo),
      papel: (membro?.papel as Papel | undefined) ?? "dono",
      nomeMembro: membro?.nome ?? existente.nome,
      userId: user.id,
      logoUrl: urlDoLogo(supabase, existente.logo_path),
      corDestaque: existente.cor_destaque,
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
      telefone: normalizarTelefone(meta.telefone),
    })
    .select(COLUNAS)
    .single();

  // Não retorna null aqui: null significa "sem cadastro pendente" pras
  // páginas que chamam getClienteAtual(), o que causaria um loop silencioso
  // de redirect pro /login em vez de mostrar que o onboarding falhou.
  if (error) {
    // PLANO 9,5 (2026-09-26): o telefone é conferido no cadastro; se mesmo
    // assim outro restaurante pegou o número entre o cadastro e a confirmação
    // do e-mail, a mensagem diz o que fazer (a tela de erro mostra).
    throw new Error(
      error.code === "23505"
        ? "Esse WhatsApp foi cadastrado em outro restaurante enquanto você confirmava o e-mail. Fale com o suporte pra concluir o cadastro."
        : mensagemErro(error),
    );
  }
  if (!criado) return null;

  return {
    id: criado.id,
    nome: criado.nome,
    nomeRestaurante: criado.nome_restaurante,
    margemAlvo: Number(criado.margem_alvo),
    papel: "dono",
    nomeMembro: criado.nome,
    userId: user.id,
    logoUrl: null,
    corDestaque: null,
  };
}
