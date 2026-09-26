import { exigirAcesso } from "@/lib/auth/acesso";
import { listarInsumos } from "@/lib/dados/insumos";
import { listarProcessamentos } from "@/lib/dados/processamentos";
import { AppShell } from "@/components/ficha/AppShell";
import { ProteinasClient } from "./ProteinasClient";

export default async function ProteinasPage() {
  const cliente = await exigirAcesso("/proteinas");

  const [insumos, processamentos] = await Promise.all([listarInsumos(), listarProcessamentos()]);
  const proteinas = insumos.filter((i) => i.categoria === "proteina");

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} papel={cliente.papel} tituloPagina="Manipulação de proteínas">
      <ProteinasClient proteinas={proteinas} processamentos={processamentos} />
    </AppShell>
  );
}
