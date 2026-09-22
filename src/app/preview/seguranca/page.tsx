import { DemoShell } from "@/components/ficha/DemoShell";
import { SegurancaClient } from "@/app/seguranca/SegurancaClient";
import { NOME_RESTAURANTE, locais, registrosTemperatura, insumos } from "../fixtures";

export default function Page() {
  return (
    <DemoShell nomeRestaurante={NOME_RESTAURANTE} tituloPagina="Segurança alimentar">
      <SegurancaClient locais={locais} registros={registrosTemperatura} insumos={insumos} />
    </DemoShell>
  );
}
