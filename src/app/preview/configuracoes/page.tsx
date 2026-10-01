import { DemoShell } from "@/components/ficha/DemoShell";
import { ConfiguracoesClient } from "@/components/configuracoes/ConfiguracoesClient";
import type { Configuracoes } from "@/lib/dados/configuracoes";
import { NOME_RESTAURANTE } from "../fixtures";

// CONFIGURAÇÕES (2026-10-01): a demo usa a tela de verdade; o que se muda
// fica no navegador (src/components/configuracoes/demo.ts).
const DADOS: Configuracoes = {
  empresa: {
    nomeRestaurante: NOME_RESTAURANTE,
    razaoSocial: "Bella Notte Alimentação Ltda",
    cnpj: "11222333000181",
    inscricaoEstadual: "ISENTO",
    emailContato: "contato@bellanotte.exemplo",
    telefoneContato: "551132104455",
    cep: "01305000",
    logradouro: "Rua Augusta",
    numero: "1200",
    complemento: null,
    bairro: "Consolação",
    cidade: "São Paulo",
    uf: "SP",
  },
  telefoneDono: "5511987654321",
  plano: "trial",
  statusAssinatura: "trial",
  margemAlvo: 0.65,
  corDestaque: null,
  logoUrl: null,
  conta: { nome: "Giulia Rossi", email: "giulia@bellanotte.exemplo", usuario: null, emailPendente: null },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ secao?: string }> }) {
  const { secao } = await searchParams;
  return (
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Configurações">
      <ConfiguracoesClient dados={DADOS} secaoInicial={secao} demo />
    </DemoShell>
  );
}
