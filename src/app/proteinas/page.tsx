import { redirect } from "next/navigation";
import { getClienteAtual } from "@/lib/dados/cliente";
import { listarInsumos } from "@/lib/dados/insumos";
import { listarProcessamentos } from "@/lib/dados/processamentos";
import { AppShell } from "@/components/ficha/AppShell";
import { ProteinasClient } from "./ProteinasClient";

export default async function ProteinasPage() {
  const cliente = await getClienteAtual();
  if (!cliente) redirect("/login");

  const [insumos, processamentos] = await Promise.all([listarInsumos(), listarProcessamentos()]);
  const proteinas = insumos.filter((i) => i.categoria === "proteina");

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} tituloPagina="Manipulação de proteínas">
      <ProteinasClient proteinas={proteinas} processamentos={processamentos} />
    </AppShell>
  );
}
