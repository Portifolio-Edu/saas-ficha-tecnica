// DESEMPENHO (2026-10-02): lugar reservado do gráfico enquanto o Recharts
// (~290 KB) carrega. Os gráficos de CMV, Proteínas e Segurança vêm com
// next/dynamic: a tela fica pronta pro toque antes, e o espaço tem a altura
// final (nada pula quando o gráfico aparece). No servidor o Recharts já não
// desenhava nada (o tamanho só existe no navegador), então o HTML é o mesmo.
// Reverter: importar o gráfico direto no lugar do dynamic().
import { CHART_MIN_HEIGHT } from "./theme";

export function EspacoDoGrafico({ altura = CHART_MIN_HEIGHT }: { altura?: number }) {
  return <div style={{ height: altura }} aria-hidden />;
}
