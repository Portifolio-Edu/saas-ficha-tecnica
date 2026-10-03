import { ConfiguracoesDemo } from "@/components/configuracoes/ConfiguracoesDemo";
import { canaisDemo, restauranteDemo, turnos } from "../fixtures";

export default function Page() {
  return (
    <ConfiguracoesDemo restaurante={restauranteDemo} canais={canaisDemo} turnos={turnos} />
  );
}
