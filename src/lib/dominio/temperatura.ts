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
