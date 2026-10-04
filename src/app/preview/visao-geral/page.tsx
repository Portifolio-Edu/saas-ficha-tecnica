import { VisaoGeralDemo } from "../PorPapelDemo";
import { insumos, todasReceitas, processamentos, producoes, fechamentos, margemAlvoCliente } from "../fixtures";

export default function Page() {
  return (
    <VisaoGeralDemo
      margemAlvoCliente={margemAlvoCliente}
      insumos={insumos}
      receitas={todasReceitas}
      processamentos={processamentos}
      producoes={producoes}
      fechamentos={fechamentos}
    />
  );
}
