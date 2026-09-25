import { exigirAcesso } from "@/lib/auth/acesso";
import { listarLocaisArmazenamento, listarRegistrosTemperatura } from "@/lib/dados/temperatura";
import { listarInsumos } from "@/lib/dados/insumos";
import { AppShell } from "@/components/ficha/AppShell";
import { SegurancaClient } from "./SegurancaClient";

export default async function SegurancaPage() {
  const cliente = await exigirAcesso("/seguranca");

  const [locais, registros, insumos] = await Promise.all([listarLocaisArmazenamento(), listarRegistrosTemperatura(), listarInsumos()]);

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} papel={cliente.papel} tituloPagina="Segurança alimentar">
      <SegurancaClient locais={locais} registros={registros} insumos={insumos} />
    </AppShell>
  );
}
