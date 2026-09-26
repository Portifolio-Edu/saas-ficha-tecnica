import { DemoShell } from "@/components/ficha/DemoShell";
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
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Relatórios">
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
    </DemoShell>
  );
}
