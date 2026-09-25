import { exigirAcesso } from "@/lib/auth/acesso";
import { listarInsumos } from "@/lib/dados/insumos";
import { listarContagens, listarEstoque, listarMovimentacoes } from "@/lib/dados/estoque";
import { ehGestao } from "@/lib/auth/papeis";
import { listarFornecedores } from "@/lib/dados/fornecedores";
import { AppShell } from "@/components/ficha/AppShell";
import { AtualizacaoAutomatica } from "@/components/ficha/AtualizacaoAutomatica";
import { EstoqueClient } from "./EstoqueClient";

export default async function EstoquePage() {
  const cliente = await exigirAcesso("/estoque");

  const [insumos, estoque, movimentacoes, fornecedores, contagens] = await Promise.all([
    listarInsumos(),
    listarEstoque(),
    listarMovimentacoes(),
    listarFornecedores(),
    // EQUIPE (2026-09-25): resultado da contagem cega só pra dono e gestor.
    ehGestao(cliente.papel) ? listarContagens() : Promise.resolve([]),
  ]);

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} papel={cliente.papel} tituloPagina="Estoque">
      {/* EQUIPE (2026-09-25): mostra o que a cozinha registrou sem precisar recarregar. */}
      <AtualizacaoAutomatica />
      <EstoqueClient insumos={insumos} estoque={estoque} movimentacoes={movimentacoes} fornecedores={fornecedores} contagens={contagens} />
    </AppShell>
  );
}
