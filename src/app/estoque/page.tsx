import { redirect } from "next/navigation";
import { getClienteAtual } from "@/lib/dados/cliente";
import { listarInsumos } from "@/lib/dados/insumos";
import { listarEstoque, listarMovimentacoes } from "@/lib/dados/estoque";
import { listarFornecedores } from "@/lib/dados/fornecedores";
import { AppShell } from "@/components/ficha/AppShell";
import { EstoqueClient } from "./EstoqueClient";

export default async function EstoquePage() {
  const cliente = await getClienteAtual();
  if (!cliente) redirect("/login");

  const [insumos, estoque, movimentacoes, fornecedores] = await Promise.all([
    listarInsumos(),
    listarEstoque(),
    listarMovimentacoes(),
    listarFornecedores(),
  ]);

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} tituloPagina="Estoque">
      <EstoqueClient insumos={insumos} estoque={estoque} movimentacoes={movimentacoes} fornecedores={fornecedores} />
    </AppShell>
  );
}
