import { normalizarBusca } from "@/lib/busca";
import type { Producao } from "@/lib/dominio/producao";

export interface FiltrosProducao {
  busca: string;
  turnoId: string;
  responsavel: string;
}

export const SEM_TURNO = "sem-turno";

export function filtrarLotes(producoes: Producao[], filtros: FiltrosProducao): Producao[] {
  const busca = normalizarBusca(filtros.busca);
  return producoes.filter((p) =>
    (!busca || normalizarBusca(`${p.nomeReceita} ${p.lote} ${p.responsavel}`).includes(busca)) &&
    (!filtros.turnoId || (filtros.turnoId === SEM_TURNO ? !p.turnoId : p.turnoId === filtros.turnoId)) &&
    (!filtros.responsavel || p.responsavel === filtros.responsavel),
  );
}
