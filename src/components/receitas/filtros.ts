import { normalizarBusca } from "@/lib/busca";
import type { Receita } from "@/lib/dominio/receita";

interface ReceitaComMargem {
  receita: Pick<Receita, "nomePrato" | "categoria" | "margemAlvo">;
  margemPct: number;
}

export function filtrarReceitas<T extends ReceitaComMargem>(lista: T[], filtros: {
  busca: string; categoria: string; abaixoDoAlvo: boolean; margemAlvoCliente: number;
}): T[] {
  const busca = normalizarBusca(filtros.busca);
  return lista.filter(({ receita, margemPct }) =>
    (!busca || normalizarBusca(`${receita.nomePrato} ${receita.categoria ?? ""}`).includes(busca)) &&
    (!filtros.categoria || (receita.categoria || "Sem categoria") === filtros.categoria) &&
    (!filtros.abaixoDoAlvo || margemPct / 100 < (receita.margemAlvo ?? filtros.margemAlvoCliente)),
  );
}
