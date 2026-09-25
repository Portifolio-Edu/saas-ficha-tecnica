import { exigirAcesso } from "@/lib/auth/acesso";
import { carregarEscalasGestao } from "@/lib/dados/escalas";
import { hojeLocalISO } from "@/lib/calculo/dia";
import { AppShell } from "@/components/ficha/AppShell";
import { AtualizacaoAutomatica } from "@/components/ficha/AtualizacaoAutomatica";
import { EscalasView } from "@/components/escalas/EscalasView";
import { acaoCriarOcorrencia, acaoRemoverOcorrencia, acaoSalvarPessoaEscala, acaoSalvarRegrasEscala } from "./actions";

// ESCALAS (2026-09-26): só dono e gestor chegam aqui (exigirAcesso + RLS).
// A cozinha vê a mesma escala, só leitura, na aba Escala do tablet.
// Reverter: git revert do commit "escalas: fase 2".
export const dynamic = "force-dynamic";

export default async function EscalasPage() {
  const cliente = await exigirAcesso("/escalas");
  const { pessoas, ocorrencias, regras } = await carregarEscalasGestao();

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} papel={cliente.papel} tituloPagina="Escalas">
      <AtualizacaoAutomatica />
      <EscalasView
        pessoas={pessoas}
        ocorrencias={ocorrencias}
        regras={regras}
        hoje={hojeLocalISO()}
        acoes={{
          salvarPessoa: acaoSalvarPessoaEscala,
          salvarRegras: acaoSalvarRegrasEscala,
          criarOcorrencia: acaoCriarOcorrencia,
          removerOcorrencia: acaoRemoverOcorrencia,
        }}
      />
    </AppShell>
  );
}
