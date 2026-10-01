import { DemoShell } from "@/components/ficha/DemoShell";
import { SegurancaDemo } from "../PorPapelDemo";
import { NOME_RESTAURANTE, locais, registrosTemperatura, insumos } from "../fixtures";

export default function Page() {
  return (
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Segurança alimentar">
      <SegurancaDemo locais={locais} registros={registrosTemperatura} insumos={insumos} />
    </DemoShell>
  );
}
