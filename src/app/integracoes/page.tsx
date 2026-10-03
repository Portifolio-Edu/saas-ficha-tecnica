import { exigirAcesso } from "@/lib/auth/acesso";
import { listarReceitas } from "@/lib/dados/receitas";
import { listarProdutosPdv } from "@/lib/dados/produtosPdv";
import { estaPendente, mapeamentoDosProdutos } from "@/lib/dominio/produtoPdv";
import { AppShell } from "@/components/ficha/AppShell";
import { IntegracoesClient } from "./IntegracoesClient";

// INTEGRACOES (2026-09-23): no app, sem simulação. Conexões diretas aparecem
// "Em breve"; a importação por XML fiscal/planilha funciona.
// 2026-10-03: a ligação produto do PDV -> ficha vem do banco (produtos_pdv) e
// os produtos sem ficha aparecem como pendência no topo.
export default async function IntegracoesPage() {
  const cliente = await exigirAcesso("/integracoes");
  const [receitas, produtosPdv] = await Promise.all([listarReceitas(), listarProdutosPdv()]);
  const fichas = receitas.filter((r) => r.tipo === "prato_final").map((r) => ({ id: r.id, nome: r.nomePrato }));

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} papel={cliente.papel} tituloPagina="Integrações">
      <IntegracoesClient fichas={fichas} mapeamentoInicial={mapeamentoDosProdutos(produtosPdv)} pendentes={produtosPdv.filter(estaPendente)} />
    </AppShell>
  );
}
