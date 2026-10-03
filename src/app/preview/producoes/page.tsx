import { ProducoesClient } from "@/app/producoes/ProducoesClient";
import { PlanoProducaoDemo } from "./PlanoProducaoDemo";
import { insumos, todasReceitas, producoes, turnos, processamentos } from "../fixtures";

export default function Page() {
  return (
    <>
      <PlanoProducaoDemo />
      <ProducoesClient isDemo={true} insumos={insumos} receitas={todasReceitas} producoes={producoes} turnos={turnos} processamentos={processamentos} />
    </>
  );
}
