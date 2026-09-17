import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";
import { ChartEmptyState } from "./ChartEmptyState";
import { CHART_MIN_HEIGHT } from "./theme";

/**
 * Casca comum de todo grafico Recharts do sistema: altura minima de 320px,
 * transicao de entrada suave, e troca pra estado vazio (com instrucao de
 * como preencher) quando nao ha dado nenhum -- em vez de cada tela decidir
 * isso na mao.
 */
export function ChartFrame({
  altura = CHART_MIN_HEIGHT,
  vazio,
  tituloVazio,
  dicaVazio,
  children,
}: {
  altura?: number;
  vazio: boolean;
  tituloVazio: string;
  dicaVazio: string;
  children: ReactElement;
}) {
  return (
    <div className="animate-in fade-in-0 duration-700 ease-out">
      {vazio ? (
        <ChartEmptyState titulo={tituloVazio} dica={dicaVazio} altura={altura} />
      ) : (
        <ResponsiveContainer width="100%" height={altura}>
          {children}
        </ResponsiveContainer>
      )}
    </div>
  );
}
