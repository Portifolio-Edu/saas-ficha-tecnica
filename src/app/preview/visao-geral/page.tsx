import { DemoShell } from "@/components/ficha/DemoShell";
import { VisaoGeralDemo } from "../PorPapelDemo";
import { NOME_RESTAURANTE, insumos, todasReceitas, processamentos, producoes, fechamentos, margemAlvoCliente } from "../fixtures";

export default function Page() {
  return (
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Visão geral">
      <VisaoGeralDemo
        margemAlvoCliente={margemAlvoCliente}
        insumos={insumos}
        receitas={todasReceitas}
        processamentos={processamentos}
        producoes={producoes}
        fechamentos={fechamentos}
      />
    </DemoShell>
  );
}
