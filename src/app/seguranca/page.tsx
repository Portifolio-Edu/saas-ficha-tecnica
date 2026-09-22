import { redirect } from "next/navigation";
import { getClienteAtual } from "@/lib/dados/cliente";
import { listarLocaisArmazenamento, listarRegistrosTemperatura } from "@/lib/dados/temperatura";
import { listarInsumos } from "@/lib/dados/insumos";
import { AppShell } from "@/components/ficha/AppShell";
import { SegurancaClient } from "./SegurancaClient";

export default async function SegurancaPage() {
  const cliente = await getClienteAtual();
  if (!cliente) redirect("/login");

  const [locais, registros, insumos] = await Promise.all([listarLocaisArmazenamento(), listarRegistrosTemperatura(), listarInsumos()]);

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} tituloPagina="Segurança alimentar">
      <SegurancaClient locais={locais} registros={registros} insumos={insumos} />
    </AppShell>
  );
}
