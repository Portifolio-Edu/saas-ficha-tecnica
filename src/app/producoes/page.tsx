import { exigirAcesso } from "@/lib/auth/acesso";
import { listarInsumos } from "@/lib/dados/insumos";
import { listarReceitas } from "@/lib/dados/receitas";
import { listarProducoes, garantirTurnosPadrao } from "@/lib/dados/producoes";
import { listarProcessamentos } from "@/lib/dados/processamentos";
import { AppShell } from "@/components/ficha/AppShell";
import { ProducoesClient } from "./ProducoesClient";

export default async function ProducoesPage() {
  const cliente = await exigirAcesso("/producoes");

  const [insumos, receitas, producoes, turnos, processamentos] = await Promise.all([
    listarInsumos(),
    listarReceitas(),
    listarProducoes(),
    garantirTurnosPadrao(cliente.id),
    listarProcessamentos(),
  ]);

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} papel={cliente.papel} tituloPagina="Produções">
      <ProducoesClient insumos={insumos} receitas={receitas} producoes={producoes} turnos={turnos} processamentos={processamentos} />
    </AppShell>
  );
}
