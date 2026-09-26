import { NOME_RESTAURANTE, locais } from "../fixtures";
import { fichasCozinhaDemo, funcionariosDemo, itensContagemDemo } from "../equipeDemo";
import { CozinhaDemo } from "./CozinhaDemo";

// Produções, checklists e temperaturas vêm do "banco" da demo dentro do
// CozinhaDemo (compartilhado com o painel do gestor).
export default function Page() {
  return (
    <CozinhaDemo
      nomeRestaurante={NOME_RESTAURANTE}
      funcionarios={funcionariosDemo}
      locais={locais}
      fichas={fichasCozinhaDemo}
      itensContagem={itensContagemDemo}
    />
  );
}
