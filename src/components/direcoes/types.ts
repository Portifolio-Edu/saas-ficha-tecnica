import type { Receita } from "@/lib/dominio/receita";
import type { Producao } from "@/lib/dominio/producao";
import type { FechamentoCmv } from "@/lib/dominio/fechamentoCmv";
import type { ResolverContexto } from "@/lib/calculo/cmv";

export interface VisaoGeralData {
  margemAlvoCliente: number;
  cmvMedio: number | null;
  margemMedia: number | null;
  abaixoDoAlvo: number;
  perdaTotalReais: number;
  perdasDoMes: Producao[];
  perdasRecentes: Producao[];
  comPreco: Array<{
    receita: Receita;
    custoPorPorcao: number;
    qtdVendida: number;
    precoVenda: number | null;
    margemAlvoPct: number;
    cmvPct: number | null;
    margemPct: number | null;
    abaixoDoAlvo: boolean;
  }>;
  xMax: number;
  yMin: number;
  yMax: number;
  margemAlvoMedia: number;
  nomeMes: string;
  fechamentoRecente: FechamentoCmv | null;
  contexto: ResolverContexto;
}
