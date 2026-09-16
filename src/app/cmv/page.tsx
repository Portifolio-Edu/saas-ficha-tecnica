import { redirect } from "next/navigation";
import { getClienteAtual } from "@/lib/dados/cliente";
import { listarInsumos } from "@/lib/dados/insumos";
import { listarReceitas } from "@/lib/dados/receitas";
import { listarProcessamentos } from "@/lib/dados/processamentos";
import { listarFechamentos } from "@/lib/dados/fechamentosCmv";
import { AppShell } from "@/components/ficha/AppShell";
import { CmvClient } from "./CmvClient";

export default async function CmvPage() {
  const cliente = await getClienteAtual();
  if (!cliente) redirect("/login");

  const [insumos, todasReceitas, processamentos, fechamentos] = await Promise.all([
    listarInsumos(),
    listarReceitas(),
    listarProcessamentos(),
    listarFechamentos(),
  ]);
  const pratos = todasReceitas.filter((r) => r.tipo === "prato_final");
  const preparos = todasReceitas.filter((r) => r.tipo === "preparo_base");

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} tituloPagina="Fechamento de CMV">
      <CmvClient pratos={pratos} preparos={preparos} insumos={insumos} processamentos={processamentos} fechamentos={fechamentos} />
    </AppShell>
  );
}
