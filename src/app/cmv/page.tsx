import { exigirAcesso } from "@/lib/auth/acesso";
import { listarInsumos } from "@/lib/dados/insumos";
import { listarReceitas } from "@/lib/dados/receitas";
import { listarProcessamentos } from "@/lib/dados/processamentos";
import { listarFechamentos, listarFechamentosEstoque } from "@/lib/dados/fechamentosCmv";
import { CmvEstoqueView } from "@/components/cmv/CmvEstoqueView";
import { AppShell } from "@/components/ficha/AppShell";
import { CmvClient } from "./CmvClient";

export default async function CmvPage() {
  const cliente = await exigirAcesso("/cmv");

  // EQUIPE (2026-09-25): o estoquista vê só o lado do estoque, sem faturamento.
  if (cliente.papel === "estoquista") {
    const fechamentos = await listarFechamentosEstoque();
    return (
      <AppShell nomeRestaurante={cliente.nomeRestaurante} papel={cliente.papel} tituloPagina="Fechamento de CMV">
        <CmvEstoqueView fechamentos={fechamentos} />
      </AppShell>
    );
  }

  const [insumos, todasReceitas, processamentos, fechamentos] = await Promise.all([
    listarInsumos(),
    listarReceitas(),
    listarProcessamentos(),
    listarFechamentos(),
  ]);
  const pratos = todasReceitas.filter((r) => r.tipo === "prato_final");
  const preparos = todasReceitas.filter((r) => r.tipo === "preparo_base");

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} papel={cliente.papel} tituloPagina="Fechamento de CMV">
      <CmvClient pratos={pratos} preparos={preparos} insumos={insumos} processamentos={processamentos} fechamentos={fechamentos} />
    </AppShell>
  );
}
