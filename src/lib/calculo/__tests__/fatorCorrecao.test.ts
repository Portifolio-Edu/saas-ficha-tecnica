import { describe, expect, it } from 'vitest';
import { fatorCorrecaoEfetivo } from '../fatorCorrecao.js';
import type { Insumo, ProcessamentoProteina } from '../types.js';

const salmao: Insumo = { id: 'salmao', unidadeMedida: 'kg', precoUnitario: 68, fatorCorrecao: 1.18 };

describe('fatorCorrecaoEfetivo', () => {
  it('usa o FC cadastrado quando nao ha lote processado', () => {
    expect(fatorCorrecaoEfetivo(salmao, [])).toBe(1.18);
  });

  it('usa a media do FC observado quando ha lotes, mesmo sendo pior que o cadastrado', () => {
    const lotes: ProcessamentoProteina[] = [
      { insumoId: 'salmao', pesoBrutoRecebido: 4.0, pesoLiquidoResultante: 3.35, processadoEm: '2026-06-05' },
      { insumoId: 'salmao', pesoBrutoRecebido: 4.2, pesoLiquidoResultante: 3.5, processadoEm: '2026-07-03' },
      { insumoId: 'salmao', pesoBrutoRecebido: 3.8, pesoLiquidoResultante: 3.05, processadoEm: '2026-08-12' },
      { insumoId: 'salmao', pesoBrutoRecebido: 5.0, pesoLiquidoResultante: 4.05, processadoEm: '2026-09-08' },
    ];

    const fc = fatorCorrecaoEfetivo(salmao, lotes);

    // Rendimento real pior que o assumido: FC observado > FC cadastrado (1.18).
    expect(fc).toBeGreaterThan(salmao.fatorCorrecao);
    expect(fc).toBeCloseTo(1.222, 2);
  });

  it('ignora lotes de outros insumos', () => {
    const lotes: ProcessamentoProteina[] = [
      { insumoId: 'frango', pesoBrutoRecebido: 10, pesoLiquidoResultante: 9.1, processadoEm: '2026-07-10' },
    ];
    expect(fatorCorrecaoEfetivo(salmao, lotes)).toBe(1.18);
  });
});
