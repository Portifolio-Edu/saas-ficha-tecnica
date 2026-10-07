// Oferta aprovada por Edu em 07/10/2026. Valores sempre em centavos.
export const OFERTA_SAAS = { diasGratis: 7, mensalCentavos: 29700, fundadorCentavos: 19700, limiteFundadores: 10 } as const;
export interface OfertaSaas {
  valor_centavos: number;
  vagas_disponiveis: number;
  teste_termina_em: string | null;
  primeiro_vencimento: string;
  fundador_confirmado: boolean;
}
