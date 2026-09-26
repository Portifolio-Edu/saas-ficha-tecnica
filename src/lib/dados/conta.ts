// PLANO 9,5, etapa 3 (2026-09-26): LGPD — o dono baixa todos os dados do
// restaurante e pode apagar tudo (art. 18: acesso, portabilidade e
// eliminação). A exportação roda com a sessão do dono: a RLS garante que só
// sai o que é do restaurante dele. A exclusão usa a service role, depois de
// conferir que quem pediu é o dono.
// Onde mexer: TABELAS (tabela nova com dado do restaurante entra aqui, senão
// fica fora da exportação — o teste e2e confere as principais).

import { createClient } from "@/lib/supabase/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { mensagemErro } from "./erros";

type Tabela = { nome: string; colunas?: string; ordem?: string };

const TABELAS: Tabela[] = [
  // Colunas escolhidas onde há dado técnico que não é do restaurante
  // (id de login, código do tablet em hash).
  { nome: "clientes", colunas: "id, nome, nome_restaurante, telefone, cnpj, plano, status_assinatura, margem_alvo, criado_em" },
  { nome: "membros", colunas: "id, papel, nome, usuario, ativo, criado_em" },
  { nome: "pareamentos_cozinha", colunas: "id, expira_em, usado_em, criado_em" },
  { nome: "locais_armazenamento" },
  { nome: "fornecedores" },
  { nome: "insumos" },
  { nome: "historico_preco_insumo" },
  { nome: "valores_nutricionais_insumo" },
  { nome: "estoque" },
  { nome: "movimentacoes_estoque" },
  { nome: "contagens_estoque" },
  { nome: "contagem_itens" },
  { nome: "processamentos_proteina" },
  { nome: "receitas" },
  { nome: "receita_insumos" },
  { nome: "receita_embalagens" },
  { nome: "receita_etapas" },
  { nome: "fichas_tecnicas" },
  { nome: "nutricional_override" },
  { nome: "rotulagem" },
  { nome: "canais_venda" },
  { nome: "precos_canal" },
  { nome: "turnos" },
  { nome: "producoes" },
  { nome: "checklists" },
  { nome: "checklist_areas" },
  { nome: "checklist_itens" },
  { nome: "checklist_fotos" },
  { nome: "checklist_execucoes" },
  { nome: "registros_temperatura" },
  { nome: "fechamentos_cmv" },
  { nome: "vendas_periodo" },
  { nome: "event_log" },
  { nome: "funcionarios" },
  { nome: "escalas_regras", ordem: "cliente_id" },
  { nome: "escalas_config" },
  { nome: "prontuario_ocorrencias" },
  { nome: "perfil_funcionario", ordem: "funcionario_id" },
  { nome: "perfil_notas" },
  { nome: "banco_extras" },
  { nome: "perfis_extra" },
];

export const TABELAS_EXPORTADAS = TABELAS.map((t) => t.nome);

const PAGINA = 1000;
const BALDES_FOTOS = ["receitas-fotos", "pracas-fotos"];

/** Todas as linhas do restaurante, tabela por tabela (paginado de 1000 em 1000). */
export async function exportarDadosRestaurante(): Promise<Record<string, unknown[]>> {
  const supabase = await createClient();
  const dados: Record<string, unknown[]> = {};
  for (const t of TABELAS) {
    const linhas: unknown[] = [];
    for (let de = 0; ; de += PAGINA) {
      const { data, error } = await supabase
        .from(t.nome)
        .select(t.colunas ?? "*")
        .order(t.ordem ?? "id")
        .range(de, de + PAGINA - 1);
      if (error) throw new Error(`${t.nome}: ${mensagemErro(error)}`);
      linhas.push(...(data ?? []));
      if (!data || data.length < PAGINA) break;
    }
    dados[t.nome] = linhas;
  }
  return dados;
}

async function listarArquivos(balde: string, pasta: string): Promise<string[]> {
  const admin = criarClienteAdmin();
  const caminhos: string[] = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await admin.storage.from(balde).list(pasta, { limit: PAGINA, offset: de });
    if (error) throw new Error(`Fotos (${balde}): ${error.message}`);
    for (const item of data ?? []) {
      const caminho = `${pasta}/${item.name}`;
      // Pasta não tem id no Storage: desce nela.
      if (item.id === null) caminhos.push(...(await listarArquivos(balde, caminho)));
      else caminhos.push(caminho);
    }
    if (!data || data.length < PAGINA) break;
  }
  return caminhos;
}

/**
 * Apaga o restaurante inteiro: fotos, logins da equipe e do dono e todas as
 * linhas (o banco apaga em cascata a partir de `clientes`). Sem volta.
 * Quem chama confere antes que é o dono.
 */
export async function excluirRestaurante(clienteId: string, donoUserId: string): Promise<void> {
  const admin = criarClienteAdmin();

  const { data: membros, error: erroMembros } = await admin.from("membros").select("user_id").eq("cliente_id", clienteId);
  if (erroMembros) throw new Error(mensagemErro(erroMembros));

  for (const balde of BALDES_FOTOS) {
    const arquivos = await listarArquivos(balde, clienteId);
    for (let i = 0; i < arquivos.length; i += 100) {
      const { error } = await admin.storage.from(balde).remove(arquivos.slice(i, i + 100));
      if (error) throw new Error(`Fotos (${balde}): ${error.message}`);
    }
  }

  // Na ordem certa (ligações que não apagam em cascata de propósito):
  // supabase/migrations/20260928110000_excluir_restaurante.sql.
  const { error: erroCliente } = await admin.rpc("excluir_restaurante", { p_cliente_id: clienteId });
  if (erroCliente) throw new Error(mensagemErro(erroCliente));

  // Logins da equipe (gestor, estoquista, tablets) e por último o do dono.
  const logins = new Set((membros ?? []).map((m) => m.user_id as string));
  logins.delete(donoUserId);
  for (const id of [...logins, donoUserId]) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error && !/not.?found/i.test(error.message)) throw new Error(`Login: ${error.message}`);
  }
}
