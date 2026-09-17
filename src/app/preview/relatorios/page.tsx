import { DemoShell } from "@/components/ficha/DemoShell";
import { RelatoriosClient } from "@/app/relatorios/RelatoriosClient";
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
      <RelatoriosClient
        insumos={insumos}
        receitas={todasReceitas}
        processamentos={processamentos}
        producoes={producoes}
        fechamentos={fechamentos}
        locais={locais}
        registrosTemperatura={registrosTemperatura}
        margemAlvoCliente={margemAlvoCliente}
      />
    </DemoShell>
  );
}
