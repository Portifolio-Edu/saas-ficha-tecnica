// CONFIGURAÇÕES (2026-10-01): as ações de verdade, do servidor.
import {
  acaoBuscarCep,
  acaoEnviarLogo,
  acaoRemoverLogo,
  acaoSairDeTodos,
  acaoSalvarAvisos,
  acaoSalvarCor,
  acaoSalvarEmpresa,
  acaoSalvarMeta,
  acaoSalvarMeuNome,
  acaoSalvarWhatsappDono,
  acaoTrocarEmail,
  acaoTrocarSenha,
} from "@/app/configuracoes/actions";
import type { AcoesConfiguracoes } from "./contexto";

export const acoesApp: AcoesConfiguracoes = {
  salvarEmpresa: acaoSalvarEmpresa,
  buscarCep: acaoBuscarCep,
  enviarLogo: acaoEnviarLogo,
  removerLogo: acaoRemoverLogo,
  salvarCor: acaoSalvarCor,
  salvarMeta: acaoSalvarMeta,
  salvarMeuNome: acaoSalvarMeuNome,
  salvarWhatsappDono: acaoSalvarWhatsappDono,
  trocarEmail: acaoTrocarEmail,
  trocarSenha: acaoTrocarSenha,
  sairDeTodos: acaoSairDeTodos,
  salvarAvisos: acaoSalvarAvisos,
};
