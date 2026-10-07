import { estoquePodeAprovarCompras } from "@/lib/dados/permissoesCompras";
import { exigirAcesso } from "@/lib/auth/acesso";
import { listarInsumos } from "@/lib/dados/insumos";
import { listarFornecedores } from "@/lib/dados/fornecedores";
import { listarRequisicoes } from "@/lib/dados/requisicoes";
import { AppShell } from "@/components/ficha/AppShell";
import { AtualizacaoAutomatica } from "@/components/ficha/AtualizacaoAutomatica";
import { ComprasClient } from "./ComprasClient";
export default async function ComprasPage() {
  const cliente = await exigirAcesso("/estoque/compras");
  const [insumos, fornecedores, requisicoes, estoquePermitido] = await Promise.all([listarInsumos(), listarFornecedores(), listarRequisicoes(), estoquePodeAprovarCompras(cliente.id)]);
  return <AppShell nomeRestaurante={cliente.nomeRestaurante} papel={cliente.papel} tituloPagina="Compras"><AtualizacaoAutomatica /><ComprasClient estoquePermitido={estoquePermitido} papel={cliente.papel} insumos={insumos} fornecedores={fornecedores} requisicoes={requisicoes} nomeRestaurante={cliente.nomeRestaurante} /></AppShell>;
}
