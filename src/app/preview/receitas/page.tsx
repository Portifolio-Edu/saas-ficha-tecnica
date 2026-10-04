import { ReceitasClient } from "@/app/receitas/ReceitasClient";
import { NOME_RESTAURANTE, receitas, insumos, preparos, margemAlvoCliente, processamentos } from "../fixtures";

export default function Page() {
  return (
    <ReceitasClient
      receitas={receitas}
      insumos={insumos}
      preparos={preparos}
      margemAlvoCliente={margemAlvoCliente}
      processamentos={processamentos}
      nomeRestaurante={NOME_RESTAURANTE}
    />
  );
}
