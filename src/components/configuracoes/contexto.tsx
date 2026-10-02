"use client";

// CONFIGURAÇÕES (2026-10-01): o que cada seção da tela usa — dados, papel e
// as ações. No app as ações são as do servidor (src/app/configuracoes/actions.ts)
// e os dados novos chegam pela própria página (revalidatePath). Na demo
// (/preview/configuracoes) as ações gravam no navegador (demo.ts) e
// `recarregar` relê de lá.

import { createContext, useContext } from "react";
import type { Configuracoes } from "@/lib/dados/configuracoes";
import type { Papel } from "@/lib/auth/papeis";
import type { EstadoForm } from "@/app/configuracoes/actions";

export type ResultadoCep = { logradouro: string; bairro: string; cidade: string; uf: string } | { erro: string };
type AcaoForm = (estado: EstadoForm, form: FormData) => Promise<EstadoForm>;

export interface AcoesConfiguracoes {
  salvarEmpresa: AcaoForm;
  buscarCep: (cep: string) => Promise<ResultadoCep>;
  enviarLogo: AcaoForm;
  removerLogo: () => Promise<EstadoForm>;
  salvarCor: (id: string) => Promise<EstadoForm>;
  salvarMeta: AcaoForm;
  salvarMeuNome: AcaoForm;
  salvarWhatsappDono: AcaoForm;
  trocarEmail: AcaoForm;
  trocarSenha: AcaoForm;
  sairDeTodos: () => Promise<void>;
  salvarAvisos: AcaoForm;
}

export interface ContextoConfiguracoes {
  dados: Configuracoes;
  papel: Papel;
  acoes: AcoesConfiguracoes;
  demo: boolean;
  recarregar: () => void;
}

export const Contexto = createContext<ContextoConfiguracoes | null>(null);

export function useConfiguracoes(): ContextoConfiguracoes {
  const c = useContext(Contexto);
  if (!c) throw new Error("useConfiguracoes fora de ConfiguracoesClient");
  return c;
}
