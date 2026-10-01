"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getClienteAtual, type ClienteAtual } from "@/lib/dados/cliente";
import { excluirRestaurante } from "@/lib/dados/conta";
import { createClient } from "@/lib/supabase/server";
import { serviceRoleConfigurada } from "@/lib/supabase/admin";
import { ehGestao } from "@/lib/auth/papeis";
import { origemDoSite } from "@/lib/auth/origem";
import { traduzirErroAuth } from "@/lib/auth/erros";
import { lerEmpresa } from "@/lib/empresa/empresa";
import { CORES_DESTAQUE } from "@/lib/empresa/cores";
import { normalizarTelefone, telefoneValido } from "@/lib/telefone";

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

// ---------------------------------------------------------------------------
// CONFIGURAÇÕES (2026-10-01): dados da empresa, marca, conta de quem está
// logado e sessão. Cada ação confere o papel aqui (pra dar uma mensagem clara)
// e o banco confere de novo (RLS em clientes, policies do balde "marcas",
// atualizar_meu_perfil). Reverter: apagar daqui até o fim do arquivo.

export interface EstadoForm {
  erro?: string;
  erros?: Record<string, string>;
  /** Muda a cada gravação certa, pra tela mostrar o aviso uma vez só. */
  ok?: number;
  sucesso?: string;
}

const SESSAO_EXPIRADA = "Sessão expirada. Entre de novo.";
const SENHA_MINIMA = 8;

async function exigirGestao(): Promise<ClienteAtual | string> {
  const cliente = await getClienteAtual();
  if (!cliente) return SESSAO_EXPIRADA;
  if (!ehGestao(cliente.papel)) return "Só o dono e o gestor mudam os dados do restaurante.";
  return cliente;
}

/** Nome, razão social, CNPJ, IE, contato e endereço. */
export async function acaoSalvarEmpresa(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const cliente = await exigirGestao();
  if (typeof cliente === "string") return { erro: cliente };
  const { dados, erros } = lerEmpresa(form);
  if (Object.keys(erros).length) return { erros: erros as Record<string, string>, erro: "Confira os campos marcados." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clientes")
    .update({
      nome_restaurante: dados.nomeRestaurante,
      razao_social: dados.razaoSocial,
      cnpj: dados.cnpj,
      inscricao_estadual: dados.inscricaoEstadual,
      email_contato: dados.emailContato,
      telefone_contato: dados.telefoneContato,
      cep: dados.cep,
      logradouro: dados.logradouro,
      numero: dados.numero,
      complemento: dados.complemento,
      bairro: dados.bairro,
      cidade: dados.cidade,
      uf: dados.uf,
    })
    .eq("id", cliente.id);
  if (error) return { erro: "Não foi possível salvar. Confira os campos e tente de novo." };
  // O nome do restaurante aparece no menu de todas as telas.
  revalidatePath("/", "layout");
  return { ok: Date.now(), sucesso: "Dados do restaurante salvos." };
}

/** Consulta o CEP no servidor (ViaCEP), pra preencher rua, bairro, cidade e UF. */
export async function acaoBuscarCep(
  cep: string,
): Promise<{ logradouro: string; bairro: string; cidade: string; uf: string } | { erro: string }> {
  const d = cep.replace(/\D/g, "");
  if (d.length !== 8) return { erro: "CEP com 8 números." };
  if (!(await getClienteAtual())) return { erro: SESSAO_EXPIRADA };
  try {
    const r = await fetch(`https://viacep.com.br/ws/${d}/json/`, { signal: AbortSignal.timeout(4000), cache: "force-cache" });
    if (!r.ok) return { erro: "Não deu pra consultar o CEP agora. Preencha o endereço à mão." };
    const j = (await r.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
    if (j.erro) return { erro: "CEP não encontrado. Confira os números." };
    return { logradouro: j.logradouro ?? "", bairro: j.bairro ?? "", cidade: j.localidade ?? "", uf: j.uf ?? "" };
  } catch {
    return { erro: "Não deu pra consultar o CEP agora. Preencha o endereço à mão." };
  }
}

const TIPOS_LOGO: Record<string, { ext: string; assinatura: (b: Uint8Array) => boolean }> = {
  "image/png": { ext: "png", assinatura: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  "image/jpeg": { ext: "jpg", assinatura: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/webp": {
    ext: "webp",
    assinatura: (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP",
  },
};
const LOGO_MAX = 2 * 1024 * 1024;

/** Troca o logo: confere tipo pelo conteúdo (não só pela extensão), grava e apaga o anterior. */
export async function acaoEnviarLogo(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const cliente = await exigirGestao();
  if (typeof cliente === "string") return { erro: cliente };
  const arquivo = form.get("logo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha uma imagem." };
  if (arquivo.size > LOGO_MAX) return { erro: "Imagem maior que 2 MB. Use uma menor." };
  const tipo = TIPOS_LOGO[arquivo.type];
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  if (!tipo || !tipo.assinatura(bytes)) return { erro: "Use PNG, JPG ou WebP." };

  const supabase = await createClient();
  const { data: atual } = await supabase.from("clientes").select("logo_path").eq("id", cliente.id).single();
  const caminho = `${cliente.id}/logo-${Date.now()}.${tipo.ext}`;
  const { error: erroEnvio } = await supabase.storage
    .from("marcas")
    .upload(caminho, bytes, { contentType: arquivo.type, cacheControl: "31536000", upsert: false });
  if (erroEnvio) return { erro: "Não foi possível enviar a imagem. Tente de novo." };

  const { error } = await supabase.from("clientes").update({ logo_path: caminho }).eq("id", cliente.id);
  if (error) {
    await supabase.storage.from("marcas").remove([caminho]);
    return { erro: "Não foi possível salvar o logo. Tente de novo." };
  }
  if (atual?.logo_path) await supabase.storage.from("marcas").remove([atual.logo_path]);
  revalidatePath("/", "layout");
  return { ok: Date.now(), sucesso: "Logo atualizado." };
}

export async function acaoRemoverLogo(): Promise<EstadoForm> {
  const cliente = await exigirGestao();
  if (typeof cliente === "string") return { erro: cliente };
  const supabase = await createClient();
  const { data: atual } = await supabase.from("clientes").select("logo_path").eq("id", cliente.id).single();
  const { error } = await supabase.from("clientes").update({ logo_path: null }).eq("id", cliente.id);
  if (error) return { erro: "Não foi possível remover o logo. Tente de novo." };
  if (atual?.logo_path) await supabase.storage.from("marcas").remove([atual.logo_path]);
  revalidatePath("/", "layout");
  return { ok: Date.now(), sucesso: "Logo removido." };
}

/** Cor de destaque (só uma das opções de src/lib/empresa/cores.ts). */
export async function acaoSalvarCor(id: string): Promise<EstadoForm> {
  const cliente = await exigirGestao();
  if (typeof cliente === "string") return { erro: cliente };
  const cor = CORES_DESTAQUE.find((c) => c.id === id);
  if (!cor) return { erro: "Escolha uma das cores." };
  const supabase = await createClient();
  const { error } = await supabase.from("clientes").update({ cor_destaque: cor.claro }).eq("id", cliente.id);
  if (error) return { erro: "Não foi possível salvar a cor. Tente de novo." };
  revalidatePath("/", "layout");
  return { ok: Date.now(), sucesso: `Cor de destaque: ${cor.nome.toLowerCase()}.` };
}

/** Meta de margem padrão (vale pros pratos sem meta própria). */
export async function acaoSalvarMeta(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const cliente = await exigirGestao();
  if (typeof cliente === "string") return { erro: cliente };
  const pct = Number(String(form.get("meta") ?? "").replace(",", "."));
  if (!Number.isFinite(pct) || pct < 1 || pct > 95) return { erros: { meta: "Entre 1% e 95%." } };
  const supabase = await createClient();
  const { error } = await supabase
    .from("clientes")
    .update({ margem_alvo: Math.round(pct * 10) / 1000 })
    .eq("id", cliente.id);
  if (error) return { erro: "Não foi possível salvar a meta. Tente de novo." };
  revalidatePath("/", "layout");
  return { ok: Date.now(), sucesso: "Meta de margem salva." };
}

/** Nome de quem está logado (qualquer papel). O do dono vale também no cadastro. */
export async function acaoSalvarMeuNome(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  if (!(await getClienteAtual())) return { erro: SESSAO_EXPIRADA };
  const nome = String(form.get("nome") ?? "").trim().replace(/\s+/g, " ");
  if (nome.length < 2 || nome.length > 80) return { erros: { nome: "Use de 2 a 80 caracteres." } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("atualizar_meu_perfil", { p_nome: nome });
  if (error) return { erro: "Não foi possível salvar o nome. Tente de novo." };
  revalidatePath("/", "layout");
  return { ok: Date.now(), sucesso: "Nome salvo." };
}

/** WhatsApp do cadastro (do dono). Único entre os restaurantes. */
export async function acaoSalvarWhatsappDono(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const cliente = await getClienteAtual();
  if (!cliente) return { erro: SESSAO_EXPIRADA };
  if (cliente.papel !== "dono") return { erro: "Só o dono muda o WhatsApp do cadastro." };
  const bruto = String(form.get("whatsapp") ?? "");
  if (!telefoneValido(bruto)) return { erros: { whatsapp: "Número com DDD, ex.: (11) 98765-4321." } };
  const supabase = await createClient();
  const { error } = await supabase.from("clientes").update({ telefone: normalizarTelefone(bruto) }).eq("id", cliente.id);
  if (error?.code === "23505") return { erros: { whatsapp: "Esse número já está no cadastro de outro restaurante." } };
  if (error) return { erro: "Não foi possível salvar o WhatsApp. Tente de novo." };
  return { ok: Date.now(), sucesso: "WhatsApp salvo." };
}

/** E-mail de login do dono. O Supabase manda o link de confirmação; só troca depois de confirmar. */
export async function acaoTrocarEmail(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const cliente = await getClienteAtual();
  if (!cliente) return { erro: SESSAO_EXPIRADA };
  if (cliente.papel !== "dono") return { erro: "Quem entra com usuário troca o acesso na tela Equipe, com o dono ou o gestor." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 160) return { erros: { email: "E-mail inválido." } };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user?.email?.toLowerCase() === email) return { erros: { email: "Esse já é o seu e-mail." } };
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${await origemDoSite()}/auth/confirmar?next=/configuracoes` },
  );
  if (error) return { erros: { email: traduzirErroAuth(error.message) } };
  return { ok: Date.now(), sucesso: `Enviamos um link para ${email}. O e-mail só muda depois que você abrir o link.` };
}

/** Troca a senha conferindo a atual antes (quem pega o aparelho aberto não troca). */
export async function acaoTrocarSenha(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  if (!(await getClienteAtual())) return { erro: SESSAO_EXPIRADA };
  const atual = String(form.get("senhaAtual") ?? "");
  const nova = String(form.get("senhaNova") ?? "");
  const confirmacao = String(form.get("senhaConfirmacao") ?? "");
  const erros: Record<string, string> = {};
  if (!atual) erros.senhaAtual = "Digite a senha atual.";
  if (nova.length < SENHA_MINIMA) erros.senhaNova = `Pelo menos ${SENHA_MINIMA} caracteres.`;
  else if (nova === atual) erros.senhaNova = "A nova senha precisa ser diferente da atual.";
  if (confirmacao !== nova) erros.senhaConfirmacao = "As duas senhas não são iguais.";
  if (Object.keys(erros).length) return { erros };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return { erro: SESSAO_EXPIRADA };
  const { error: erroAtual } = await supabase.auth.signInWithPassword({ email: data.user.email, password: atual });
  if (erroAtual) return { erros: { senhaAtual: "Senha atual incorreta." } };
  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) return { erros: { senhaNova: traduzirErroAuth(error.message) } };
  return { ok: Date.now(), sucesso: "Senha trocada." };
}

/** Sai daqui e de todos os outros aparelhos (celular perdido, computador emprestado). */
export async function acaoSairDeTodos(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?aviso=saiu-de-todos");
}

/** Sai só deste aparelho. Pelo servidor, pra o cookie sair junto. */
export async function acaoSair(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
