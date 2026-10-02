// DESEMPENHO (2026-10-02): saiu de SegurancaClient.tsx pra ser usada também
// pelo gráfico, que agora carrega sob demanda (GraficoTemperatura.tsx).
import type { LocalArmazenamento } from "@/lib/dominio/temperatura";

export function foraDaFaixaDoLocal(local: LocalArmazenamento | null | undefined, temperaturaC: number): boolean {
  return !!local && ((local.temperaturaMinC != null && temperaturaC < local.temperaturaMinC) || (local.temperaturaMaxC != null && temperaturaC > local.temperaturaMaxC));
}
