"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { criarClienteAdmin, serviceRoleConfigurada } from "@/lib/supabase/admin";
import { getClienteAtual } from "@/lib/dados/cliente";
import { hashCodigo, normalizarCodigo } from "@/lib/dados/equipe";
import { carregarDadosCozinha, enviarContagemCega, registrarLoteProteina } from "@/lib/dados/cozinha";
import { marcarItemConcluido, desmarcarItemConcluido } from "@/lib/dados/checklists";
import { registrarTemperatura } from "@/lib/dados/temperatura";
import { criarRequisicao, removerRequisicao } from "@/lib/dados/requisicoes";
import { validarRequisicao, type NovaRequisicao } from "@/lib/dominio/requisicao";
import { atualizarStatusProducao, contarProducoesPorReceita } from "@/lib/dados/producoes";
import { consumoDeInsumosDaProducao } from "@/lib/calculo/consumoProducao";
import { gerarLote } from "@/lib/calculo/lote";
import { DOMINIO_EQUIPE } from "@/lib/auth/equipe";
import type { StatusProducao } from "@/lib/dominio/producao";
import type { NovoLoteProteina } from "@/lib/dominio/cozinha";

// EQUIPE (2026-09-25): ações do modo cozinha. Rodam com a sessão do aparelho
// (papel cozinha), então a RLS já limita o que dá pra ler e gravar. Duas
// exceções usam a service role, e por isso conferem tudo antes:
//   - parear o aparelho (cria o login da cozinha a partir do código);
//   - baixar o estoque da produção (a cozinha não mexe em saldo direto).

export type Resultado = { ok: true; aviso?: string } | { ok: false; erro: string };

function erro(e: unknown): { ok: false; erro: string } {
  return { ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido." };
}

async function exigirMembro() {
  const cliente = await getClienteAtual();
  if (!cliente) throw new Error("Este aparelho foi desconectado. Peça um código novo ao gestor.");
  return cliente;
}

function exigirResponsavel(responsavel: string): string {
  const nome = responsavel.trim();
  if (!nome) throw new Error("Escolha quem está fazendo antes de registrar.");
  return nome;
}

/** Liga este aparelho ao modo cozinha com o código gerado na tela Equipe. */
export async function acaoParearAparelho(_estado: { erro?: string }, formData: FormData): Promise<{ erro?: string }> {
  const codigo = normalizarCodigo(String(formData.get("codigo") ?? ""));
  if (codigo.length !== 8) return { erro: "O código tem 8 letras e números, como K7M4-9QPX." };
  if (!serviceRoleConfigurada()) return { erro: "O servidor ainda não está configurado para conectar aparelhos. Avise o gestor." };

  const admin = criarClienteAdmin();
  const agora = new Date().toISOString();
  // Marca como usado no mesmo UPDATE que confere validade: dois aparelhos com o
  // mesmo código não passam os dois.
  const { data: pareamento } = await admin
    .from("pareamentos_cozinha")
    .update({ usado_em: agora })
    .eq("codigo_hash", hashCodigo(codigo))
    .is("usado_em", null)
    .gt("expira_em", agora)
    .select("cliente_id")
    .maybeSingle();
  if (!pareamento) return { erro: "Código inválido, já usado ou vencido. Peça um novo ao gestor." };

  const email = `cozinha-${randomUUID()}@${DOMINIO_EQUIPE}`;
  // Senha aleatória que ninguém vê: o aparelho fica logado pela sessão.
  const senha = randomBytes(32).toString("base64url");
  const { data: criado, error: erroAuth } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { aparelho_cozinha: true },
  });
  if (erroAuth || !criado.user) return { erro: "Não foi possível conectar o aparelho. Tente de novo." };

  const { count } = await admin
    .from("membros")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", pareamento.cliente_id)
    .eq("papel", "cozinha");
  const { error: erroMembro } = await admin.from("membros").insert({
    cliente_id: pareamento.cliente_id,
    user_id: criado.user.id,
    papel: "cozinha",
    nome: `Aparelho da cozinha ${(count ?? 0) + 1}`,
  });
  if (erroMembro) {
    await admin.auth.admin.deleteUser(criado.user.id);
    return { erro: "Não foi possível conectar o aparelho. Tente de novo." };
  }

  const supabase = await createClient();
  const { error: erroLogin } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (erroLogin) return { erro: "O aparelho foi cadastrado, mas não entrou. Peça um código novo ao gestor." };

  redirect("/cozinha");
}

export async function acaoMarcarItem(itemId: string, responsavel: string): Promise<Resultado> {
  try {
    await exigirMembro();
    await marcarItemConcluido(itemId, null, null, exigirResponsavel(responsavel));
    revalidatePath("/cozinha");
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

export async function acaoDesmarcarItem(itemId: string): Promise<Resultado> {
  try {
    await exigirMembro();
    await desmarcarItemConcluido(itemId);
    revalidatePath("/cozinha");
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

export async function acaoRegistrarTemperatura(localId: string, temperatura: number, responsavel: string): Promise<Resultado> {
  try {
    await exigirMembro();
    if (!Number.isFinite(temperatura)) throw new Error("Informe a temperatura.");
    await registrarTemperatura({ localArmazenamentoId: localId, temperaturaC: temperatura, responsavel: exigirResponsavel(responsavel), insumoId: null });
    revalidatePath("/cozinha");
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

/**
 * Registra a produção e baixa o estoque pela ficha. A baixa roda na função
 * baixar_estoque_producao (só service role, uma vez por produção), com o
 * consumo calculado aqui pelo mesmo motor da tela Produções.
 */
export async function acaoRegistrarProducao(receitaId: string, quantidade: number, responsavel: string): Promise<Resultado> {
  try {
    const cliente = await exigirMembro();
    const quem = exigirResponsavel(responsavel);
    if (!(quantidade > 0)) throw new Error("Informe a quantidade produzida.");

    const dados = await carregarDadosCozinha();
    const receita = dados.receitasCalc.find((r) => r.id === receitaId);
    if (!receita) throw new Error("Receita não encontrada.");

    const supabase = await createClient();
    let sequencia = (await contarProducoesPorReceita(receitaId)) + 1;
    let producaoId: string | null = null;
    let lote = "";
    for (let tentativa = 0; tentativa < 5 && !producaoId; tentativa++, sequencia++) {
      lote = gerarLote(receita.nomePrato, sequencia);
      const { data, error } = await supabase
        .from("producoes")
        .insert({ cliente_id: cliente.id, lote, receita_id: receitaId, quantidade, responsavel: quem, status: "em_producao" })
        .select("id")
        .single();
      if (!error) producaoId = data.id;
      else if (error.code !== "23505") throw new Error(error.message);
    }
    if (!producaoId) throw new Error("Não foi possível gerar o lote. Tente de novo.");

    const receitaPorId = new Map(dados.receitasCalc.map((r) => [r.id, r]));
    const insumoPorId = new Map(dados.insumosCalc.map((i) => [i.id, i]));
    const itens = consumoDeInsumosDaProducao(receita, quantidade, receitaPorId, insumoPorId, dados.processamentosCalc)
      .filter((c) => insumoPorId.get(c.insumoId)?.estoque)
      .map((c) => ({ insumoId: c.insumoId, quantidade: c.quantidade }));

    revalidatePath("/cozinha");
    if (itens.length === 0) return { ok: true };
    if (!serviceRoleConfigurada()) {
      return { ok: true, aviso: `Lote ${lote} registrado. A baixa no estoque não rodou: avise o gestor.` };
    }
    const { error: erroBaixa } = await criarClienteAdmin().rpc("baixar_estoque_producao", { p_producao_id: producaoId, p_itens: itens });
    if (erroBaixa) return { ok: true, aviso: `Lote ${lote} registrado, mas a baixa no estoque falhou: ${erroBaixa.message}` };
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

export async function acaoAtualizarProducao(id: string, status: StatusProducao, motivoPerda: string | null): Promise<Resultado> {
  try {
    await exigirMembro();
    if (status === "perda" && !motivoPerda?.trim()) throw new Error("Diga o motivo da perda.");
    await atualizarStatusProducao(id, status, status === "perda" ? motivoPerda!.trim() : null);
    revalidatePath("/cozinha");
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

export async function acaoEnviarContagem(responsavel: string, itens: { insumoId: string; quantidade: number }[]): Promise<Resultado> {
  try {
    await exigirMembro();
    const validos = itens.filter((i) => Number.isFinite(i.quantidade) && i.quantidade >= 0);
    if (validos.length === 0) throw new Error("Conte pelo menos um item.");
    await enviarContagemCega(exigirResponsavel(responsavel), validos);
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

/** PROTEÍNAS (2026-09-25): lote de proteína limpa pelo tablet. O valor pago
 * por kg sai do cadastro do insumo, no banco; a cozinha só manda pesos. */
export async function acaoRegistrarLoteProteina(lote: NovoLoteProteina, responsavel: string): Promise<Resultado> {
  try {
    await exigirMembro();
    const quem = exigirResponsavel(responsavel);
    if (!(lote.pesoBruto > 0)) throw new Error("Informe o peso bruto (como a peça chegou).");
    if (!(lote.pesoLimpo > 0)) throw new Error("Informe o peso limpo (pronto pra usar).");
    if (lote.pesoLimpo + (lote.aparas || 0) > lote.pesoBruto) throw new Error("O peso limpo mais as aparas passam do peso bruto. Confira a balança.");
    await registrarLoteProteina(lote, quem);
    revalidatePath("/cozinha");
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

// PEDIDOS DA COZINHA (2026-09-26): a cozinha pede o que falta; quem compra resolve no Estoque.
export async function acaoCriarRequisicao(r: NovaRequisicao, responsavel: string): Promise<Resultado> {
  try {
    const cliente = await exigirMembro();
    const problema = validarRequisicao(r);
    if (problema) throw new Error(problema);
    await criarRequisicao(cliente.id, r, exigirResponsavel(responsavel));
    revalidatePath("/cozinha");
    revalidatePath("/estoque");
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}

export async function acaoRemoverRequisicao(id: string): Promise<Resultado> {
  try {
    await exigirMembro();
    await removerRequisicao(id);
    revalidatePath("/cozinha");
    revalidatePath("/estoque");
    return { ok: true };
  } catch (e) {
    return erro(e);
  }
}
