import { redirect } from "next/navigation";
import { getClienteAtual } from "@/lib/dados/cliente";
import { listarLocaisArmazenamento, listarRegistrosTemperatura } from "@/lib/dados/temperatura";
import { AppShell } from "@/components/ficha/AppShell";
import { SegurancaClient } from "./SegurancaClient";

export default async function SegurancaPage() {
  const cliente = await getClienteAtual();
  if (!cliente) redirect("/login");

  const [locais, registros] = await Promise.all([listarLocaisArmazenamento(), listarRegistrosTemperatura()]);

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} tituloPagina="Segurança Alimentar">
      <SegurancaClient locais={locais} registros={registros} />
    </AppShell>
  );
}
