import { exigirAcesso } from "@/lib/auth/acesso";
import { listarInsumos } from "@/lib/dados/insumos";
import { listarReceitas } from "@/lib/dados/receitas";
import { listarProcessamentos } from "@/lib/dados/processamentos";
import { listarValoresNutricionaisInsumos, listarNutricionalOverrides, listarRotulagens } from "@/lib/dados/nutricional";
import { AppShell } from "@/components/ficha/AppShell";
import { NutricionalClient } from "./NutricionalClient";

export default async function NutricionalPage() {
  const cliente = await exigirAcesso("/nutricional");

  const [insumos, todasReceitas, processamentos, valoresInsumos, overrides, rotulagens] = await Promise.all([
    listarInsumos(),
    listarReceitas(),
    listarProcessamentos(),
    listarValoresNutricionaisInsumos(),
    listarNutricionalOverrides(),
    listarRotulagens(),
  ]);
  const pratos = todasReceitas.filter((r) => r.tipo === "prato_final");
  const preparos = todasReceitas.filter((r) => r.tipo === "preparo_base");

  return (
    <AppShell nomeRestaurante={cliente.nomeRestaurante} papel={cliente.papel} tituloPagina="Ficha nutricional">
      <NutricionalClient
        pratos={pratos}
        preparos={preparos}
        insumos={insumos}
        processamentos={processamentos}
        valoresInsumos={valoresInsumos}
        overrides={overrides}
        rotulagens={rotulagens}
      />
    </AppShell>
  );
}
