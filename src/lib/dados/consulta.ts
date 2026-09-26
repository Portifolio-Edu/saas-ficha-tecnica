// CELULAR (2026-09-26): link só de consulta do pessoal da cozinha.
//  - abrirConsulta: a página pública /consulta/[codigo] chama com a service
//    role a função consulta_por_link, que confere o código no banco e devolve
//    o recorte da cozinha (sem R$, sem saldo, sem contato). Aqui calculamos a
//    escala e mandamos pro navegador SÓ a da pessoa.
//  - listar/criar/desligar: tela Equipe, com a sessão de quem pede (a RLS
//    deixa só dono e gestor). O banco guarda só o hash do código.
// Onde mexer no que o link mostra: consulta_por_link
// (supabase/migrations/20260928140000_link_consulta.sql).
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { criarClienteAdmin, serviceRoleConfigurada } from "@/lib/supabase/admin";
import { hojeLocalISO } from "@/lib/calculo/dia";
import { montarEscalaPublica, periodoCozinha } from "@/lib/escalas/publica";
import { minhaEscala, type ConsultaFuncionario, type LinkConsulta } from "@/lib/dominio/consulta";
import type { Checklist } from "@/lib/dominio/checklist";
import { montarDadosCozinha, type DadosRpc } from "./cozinha";
import { paraEntradaEscala, type EscalaPublicaRpc } from "./escalas";
import { mensagemErro } from "./erros";

interface ConsultaRpc {
  restaurante: string;
  pessoa: { id: string; nome: string; setor: string | null; cargo: string | null };
  cozinha: DadosRpc;
  escala: EscalaPublicaRpc;
  checklists: {
    id: string;
    nome: string;
    momento: Checklist["momento"];
    itens: { id: string; texto: string; ordem: number; area_id: string | null; concluido_hoje: boolean }[];
    areas: { id: string; nome: string; ordem: number }[];
    fotos: { id: string; url: string; legenda: string | null; ordem: number; area_id: string | null }[];
  }[];
}

/** Formato do código: 32 caracteres base64url (192 bits). */
const FORMATO_CODIGO = /^[A-Za-z0-9_-]{32,128}$/;

export function hashDoCodigoLink(codigo: string): string {
  return createHash("sha256").update(codigo, "utf8").digest("hex");
}

/** null = link inexistente, desligado, pessoa inativa, ou servidor sem a chave. */
export async function abrirConsulta(codigo: string): Promise<ConsultaFuncionario | null> {
  if (!FORMATO_CODIGO.test(codigo) || !serviceRoleConfigurada()) return null;
  const hoje = hojeLocalISO();
  const { inicio, fim } = periodoCozinha(hoje);
  const { data, error } = await criarClienteAdmin().rpc("consulta_por_link", { p_codigo: codigo, p_inicio: inicio, p_fim: fim });
  if (error) throw new Error(mensagemErro(error));
  if (!data) return null;
  const d = data as ConsultaRpc;

  // Motor recusou (escala em revisão): a página mostra o aviso e o resto segue.
  const publica = montarEscalaPublica(paraEntradaEscala(d.escala), inicio, fim);

  return {
    restaurante: d.restaurante,
    pessoa: { id: d.pessoa.id, nome: d.pessoa.nome, cargo: d.pessoa.cargo },
    hoje,
    escala: minhaEscala(publica, d.pessoa.id, hoje),
    fichas: montarDadosCozinha(d.cozinha).fichas,
    checklists: d.checklists.map((c) => ({
      id: c.id,
      nome: c.nome,
      momento: c.momento,
      itens: c.itens.map((i) => ({ id: i.id, checklistId: c.id, texto: i.texto, ordem: i.ordem, concluidoHoje: i.concluido_hoje, areaId: i.area_id })),
      areas: c.areas.map((a) => ({ id: a.id, checklistId: c.id, nome: a.nome, ordem: a.ordem })),
      fotos: c.fotos.map((f) => ({ id: f.id, checklistId: c.id, url: f.url, legenda: f.legenda, ordem: f.ordem, areaId: f.area_id })),
    })),
  };
}

export async function listarLinksConsulta(): Promise<LinkConsulta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("links_consulta")
    .select("funcionario_id, criado_em, ultimo_acesso_em")
    .is("revogado_em", null);
  if (error) throw new Error(mensagemErro(error));
  return ((data ?? []) as { funcionario_id: string; criado_em: string; ultimo_acesso_em: string | null }[]).map((l) => ({
    funcionarioId: l.funcionario_id,
    criadoEm: l.criado_em,
    ultimoAcessoEm: l.ultimo_acesso_em,
  }));
}

export async function desligarLinkConsulta(funcionarioId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("links_consulta")
    .update({ revogado_em: new Date().toISOString() })
    .eq("funcionario_id", funcionarioId)
    .is("revogado_em", null);
  if (error) throw new Error(mensagemErro(error));
}

/** Gera o link (desliga o anterior da pessoa, se houver). Devolve o código:
 * ele só existe agora — o banco guarda o hash. */
export async function criarLinkConsulta(clienteId: string, funcionarioId: string): Promise<{ codigo: string; criadoEm: string }> {
  await desligarLinkConsulta(funcionarioId);
  const codigo = randomBytes(24).toString("base64url");
  const supabase = await createClient();
  const { error } = await supabase
    .from("links_consulta")
    .insert({ cliente_id: clienteId, funcionario_id: funcionarioId, token_hash: hashDoCodigoLink(codigo) });
  if (error) throw new Error(mensagemErro(error));
  return { codigo, criadoEm: new Date().toISOString() };
}
