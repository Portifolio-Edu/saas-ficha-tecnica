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
}

export interface RegistroTemperaturaInput {
  localArmazenamentoId: string;
  temperaturaC: number;
  responsavel: string;
}
