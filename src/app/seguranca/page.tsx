import { exigirAcesso } from "@/lib/auth/acesso";
import { listarLocaisArmazenamento, listarRegistrosTemperatura } from "@/lib/dados/temperatura";
import { listarInsumos } from "@/lib/dados/insumos";
import { AppShell } from "@/components/ficha/AppShell";
import { AtualizacaoAutomatica } from "@/components/ficha/AtualizacaoAutomatica";
import { SegurancaClient } from "./SegurancaClient";

export default async function SegurancaPage() {
  const cliente = await exigirAcesso("/seguranca");

  const [locais, registros, insumos] = await Promise.all([listarLocaisArmazenamento(), listarRegistrosTemperatura(), listarInsumos()]);

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} papel={cliente.papel} tituloPagina="Segurança alimentar">
      {/* EQUIPE (2026-09-25): mostra o que a cozinha registrou sem precisar recarregar. */}
      <AtualizacaoAutomatica />
      <SegurancaClient locais={locais} registros={registros} insumos={insumos} />
    </AppShell>
  );
}
