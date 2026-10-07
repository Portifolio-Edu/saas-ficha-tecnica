// CONFIGURAÇÕES (2026-10-01): o que a tela Configurações mostra — dados da
// empresa, plano, marca e a conta de quem está logado. Só leitura; as
// gravações ficam em src/app/configuracoes/actions.ts.

import { createClient } from "@/lib/supabase/server";
import type { ClienteAtual } from "./cliente";
import { urlDoLogo } from "./cliente";
import type { DadosEmpresa } from "@/lib/empresa/empresa";
import { DOMINIO_EQUIPE } from "@/lib/auth/equipe";
import type { DadosAvisos } from "./avisos";

export interface Configuracoes {
  estoquePodeAprovarCompras?: boolean;
  permissaoComprasAlteradaEm?: string | null;
  permissaoComprasAlteradaNome?: string | null;
  empresa: DadosEmpresa;
  /** WhatsApp do cadastro (do dono), 55 + DDD. */
  telefoneDono: string;
  plano: string;
  statusAssinatura: string;
  margemAlvo: number;
  corDestaque: string | null;
  logoUrl: string | null;
  conta: {
    nome: string;
    /** E-mail de login; null pra gestor/estoquista, que entram com usuário. */
    email: string | null;
    usuario: string | null;
    /** Troca de e-mail aguardando confirmação. */
    emailPendente: string | null;
  };
  /** AVISOS (2026-10-02): só pra gestão (null pros outros papéis). */
  avisos: DadosAvisos | null;
}

export async function getConfiguracoes(cliente: ClienteAtual, avisos: DadosAvisos | null = null): Promise<Configuracoes> {
  const supabase = await createClient();
  const [{ data: c, error }, { data: auth }] = await Promise.all([
    supabase
      .from("clientes")
      .select(
        "nome_restaurante, razao_social, cnpj, inscricao_estadual, email_contato, telefone_contato, cep, logradouro, numero, complemento, bairro, cidade, uf, telefone, plano, status_assinatura, margem_alvo, cor_destaque, logo_path, estoque_pode_aprovar_compras, permissao_compras_alterada_em, permissao_compras_alterada_nome",
      )
      .eq("id", cliente.id)
      .single(),
    supabase.auth.getUser(),
  ]);
  if (error || !c) throw new Error("Não foi possível ler os dados do restaurante.");

  const email = auth.user?.email ?? null;
  const daEquipe = !!email?.endsWith(`@${DOMINIO_EQUIPE}`);
  return {
    estoquePodeAprovarCompras: c.estoque_pode_aprovar_compras,
    permissaoComprasAlteradaEm: c.permissao_compras_alterada_em,
    permissaoComprasAlteradaNome: c.permissao_compras_alterada_nome,
    empresa: {
      nomeRestaurante: c.nome_restaurante,
      razaoSocial: c.razao_social,
      cnpj: c.cnpj,
      inscricaoEstadual: c.inscricao_estadual,
      emailContato: c.email_contato,
      telefoneContato: c.telefone_contato,
      cep: c.cep,
      logradouro: c.logradouro,
      numero: c.numero,
      complemento: c.complemento,
      bairro: c.bairro,
      cidade: c.cidade,
      uf: c.uf,
    },
    telefoneDono: c.telefone,
    plano: c.plano,
    statusAssinatura: c.status_assinatura,
    margemAlvo: Number(c.margem_alvo),
    corDestaque: c.cor_destaque,
    logoUrl: urlDoLogo(supabase, c.logo_path),
    conta: {
      nome: cliente.nomeMembro,
      email: daEquipe ? null : email,
      usuario: daEquipe && email ? email.split("@")[0] : null,
      emailPendente: auth.user?.new_email ?? null,
    },
    avisos,
  };
}
