import { NOME_RESTAURANTE, checklists, locais, registrosTemperatura } from "../fixtures";
import { fichasCozinhaDemo, funcionariosDemo, itensContagemDemo, producoesCozinhaDemo } from "../equipeDemo";
import { CozinhaDemo } from "./CozinhaDemo";

export default function Page() {
  return (
    <CozinhaDemo
      nomeRestaurante={NOME_RESTAURANTE}
      funcionarios={funcionariosDemo}
      checklists={checklists}
      locais={locais}
      temperaturas={[...registrosTemperatura].reverse()}
      fichas={fichasCozinhaDemo}
      itensContagem={itensContagemDemo}
      producoes={producoesCozinhaDemo}
    />
  );
}
