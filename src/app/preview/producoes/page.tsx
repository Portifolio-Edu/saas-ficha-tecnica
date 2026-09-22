import { DemoShell } from "@/components/ficha/DemoShell";
import { ProducoesClient } from "@/app/producoes/ProducoesClient";
import { NOME_RESTAURANTE, insumos, todasReceitas, producoes, turnos, processamentos } from "../fixtures";

export default function Page() {
  return (
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Produções">
      <ProducoesClient isDemo={true} insumos={insumos} receitas={todasReceitas} producoes={producoes} turnos={turnos} processamentos={processamentos} />
    </DemoShell>
  );
}
