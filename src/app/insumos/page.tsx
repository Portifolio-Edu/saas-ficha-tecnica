import { exigirAcesso } from "@/lib/auth/acesso";
import { listarInsumos } from "@/lib/dados/insumos";
import { listarReceitas } from "@/lib/dados/receitas";
import { listarProcessamentos } from "@/lib/dados/processamentos";
import { listarLocaisArmazenamento } from "@/lib/dados/temperatura";
import { AppShell } from "@/components/ficha/AppShell";
import { InsumosClient } from "./InsumosClient";

export default async function InsumosPage() {
  const cliente = await exigirAcesso("/insumos");

  const [insumos, todasReceitas, processamentos, locais] = await Promise.all([
    listarInsumos(),
    listarReceitas(),
    listarProcessamentos(),
    listarLocaisArmazenamento(),
  ]);
  const preparos = todasReceitas.filter((r) => r.tipo === "preparo_base");

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} papel={cliente.papel} tituloPagina="Insumos">
      <InsumosClient insumos={insumos} preparos={preparos} todasReceitas={todasReceitas} processamentos={processamentos} locais={locais} mostrarPreparos={cliente.papel !== "estoquista"} />
    </AppShell>
  );
}
