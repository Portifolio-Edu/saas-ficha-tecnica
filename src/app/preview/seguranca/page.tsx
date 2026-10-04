import { SegurancaDemo } from "../PorPapelDemo";
import { locais, registrosTemperatura, insumos } from "../fixtures";

export default function Page() {
  return (
    <SegurancaDemo locais={locais} registros={registrosTemperatura} insumos={insumos} />
  );
}
