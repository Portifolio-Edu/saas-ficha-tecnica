import { DemoShell } from "@/components/ficha/DemoShell";
import { VisaoGeralClient } from "@/app/visao-geral/VisaoGeralClient";
import { NOME_RESTAURANTE, insumos, todasReceitas, processamentos, producoes, fechamentos, margemAlvoCliente } from "../fixtures";

export default function Page() {
  return (
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Visão geral">
      <VisaoGeralClient
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
