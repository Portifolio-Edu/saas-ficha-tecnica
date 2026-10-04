import { RelatoriosDemo } from "../PorPapelDemo";
import {
  NOME_RESTAURANTE,
  insumos,
  todasReceitas,
  processamentos,
  producoes,
  fechamentos,
  locais,
  registrosTemperatura,
  margemAlvoCliente,
} from "../fixtures";

export default function Page() {
  return (
    <RelatoriosDemo
      insumos={insumos}
      receitas={todasReceitas}
      processamentos={processamentos}
      producoes={producoes}
      fechamentos={fechamentos}
      locais={locais}
      registrosTemperatura={registrosTemperatura}
      margemAlvoCliente={margemAlvoCliente}
      nomeRestaurante={NOME_RESTAURANTE}
    />
  );
}
