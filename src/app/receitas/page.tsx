import { redirect } from "next/navigation";
import { getClienteAtual } from "@/lib/dados/cliente";
import { listarInsumos } from "@/lib/dados/insumos";
import { listarReceitas } from "@/lib/dados/receitas";
import { listarProcessamentos } from "@/lib/dados/processamentos";
import { AppShell } from "@/components/ficha/AppShell";
import { ReceitasClient } from "./ReceitasClient";

export default async function ReceitasPage() {
  const cliente = await getClienteAtual();
  if (!cliente) redirect("/login");

  const [insumos, todasReceitas, processamentos] = await Promise.all([listarInsumos(), listarReceitas(), listarProcessamentos()]);
  const receitas = todasReceitas.filter((r) => r.tipo === "prato_final");
  const preparos = todasReceitas.filter((r) => r.tipo === "preparo_base");

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} tituloPagina="Receitas & Fichas">
      <ReceitasClient receitas={receitas} insumos={insumos} preparos={preparos} margemAlvoCliente={cliente.margemAlvo} processamentos={processamentos} nomeRestaurante={cliente.nomeRestaurante} />
    </AppShell>
  );
}
