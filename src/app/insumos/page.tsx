import { redirect } from "next/navigation";
import { getClienteAtual } from "@/lib/dados/cliente";
import { listarInsumos } from "@/lib/dados/insumos";
import { listarReceitas } from "@/lib/dados/receitas";
import { AppShell } from "@/components/ficha/AppShell";
import { InsumosClient } from "./InsumosClient";

export default async function InsumosPage() {
  const cliente = await getClienteAtual();
  if (!cliente) redirect("/login");

  const [insumos, todasReceitas] = await Promise.all([listarInsumos(), listarReceitas()]);
  const preparos = todasReceitas.filter((r) => r.tipo === "preparo_base");

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} tituloPagina="Insumos">
      <InsumosClient insumos={insumos} preparos={preparos} todasReceitas={todasReceitas} />
    </AppShell>
  );
}
