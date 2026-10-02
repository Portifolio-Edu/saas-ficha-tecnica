export interface LocalArmazenamento {
  id: string;
  nome: string;
  temperaturaMinC: number | null;
  temperaturaMaxC: number | null;
}

export interface LocalArmazenamentoInput {
  nome: string;
  temperaturaMinC: number | null;
  temperaturaMaxC: number | null;
}

export interface RegistroTemperatura {
  id: string;
  localArmazenamentoId: string;
  nomeLocal: string;
  temperaturaC: number;
  responsavel: string;
  registradoEm: string;
  insumoId: string | null;
  nomeInsumo: string | null;
}

export interface RegistroTemperaturaInput {
  localArmazenamentoId: string;
  temperaturaC: number;
  responsavel: string;
  insumoId: string | null;
}

/** AVISOS (2026-10-02): mesma regra das telas (Segurança e cozinha), num lugar só pro servidor. */
export function foraDaFaixa(l: Pick<LocalArmazenamento, "temperaturaMinC" | "temperaturaMaxC">, t: number): boolean {
  return (l.temperaturaMinC != null && t < l.temperaturaMinC) || (l.temperaturaMaxC != null && t > l.temperaturaMaxC);
}

/** "0 a 5 °C", "até 5 °C", "acima de 60 °C"; null sem faixa. */
export function textoFaixa(l: Pick<LocalArmazenamento, "temperaturaMinC" | "temperaturaMaxC">): string | null {
  const { temperaturaMinC: min, temperaturaMaxC: max } = l;
  if (min != null && max != null) return `${min} a ${max} °C`;
  if (max != null) return `até ${max} °C`;
  if (min != null) return `acima de ${min} °C`;
  return null;
}
